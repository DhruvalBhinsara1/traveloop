import { Router } from 'express';

import { prisma } from '../prisma.js';
import { asyncHandler, HttpError, toInt } from '../utils/http.js';
import { getOwnedTrip } from './trips.js';

export const billsRouter = Router();

const splitInclude = {
  billParticipants: { orderBy: { createdAt: 'asc' } },
  billExpenses: {
    orderBy: { createdAt: 'desc' },
    include: { paidBy: true }
  }
};

const toMoney = (cents) => Number((cents / 100).toFixed(2));

const buildSummary = (participants, expenses) => {
  const balances = new Map(participants.map((participant) => [participant.id, 0]));
  let totalCents = 0;

  expenses.forEach((expense) => {
    if (!participants.length || !balances.has(expense.paidById)) return;

    const amountCents = Math.round(Number(expense.amount) * 100);
    totalCents += amountCents;

    const baseShare = Math.floor(amountCents / participants.length);
    const remainder = amountCents % participants.length;

    participants.forEach((participant, index) => {
      balances.set(participant.id, balances.get(participant.id) - baseShare - (index < remainder ? 1 : 0));
    });

    balances.set(expense.paidById, balances.get(expense.paidById) + amountCents);
  });

  const namedBalances = participants.map((participant) => ({
    participantId: participant.id,
    name: participant.name,
    amount: toMoney(balances.get(participant.id) ?? 0)
  }));

  const debtors = namedBalances
    .filter((balance) => balance.amount < 0)
    .map((balance) => ({ ...balance, cents: Math.abs(Math.round(balance.amount * 100)) }))
    .sort((a, b) => b.cents - a.cents);

  const creditors = namedBalances
    .filter((balance) => balance.amount > 0)
    .map((balance) => ({ ...balance, cents: Math.round(balance.amount * 100) }))
    .sort((a, b) => b.cents - a.cents);

  const settlements = [];
  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const cents = Math.min(debtor.cents, creditor.cents);

    if (cents > 0) {
      settlements.push({
        fromParticipantId: debtor.participantId,
        from: debtor.name,
        toParticipantId: creditor.participantId,
        to: creditor.name,
        amount: toMoney(cents)
      });
    }

    debtor.cents -= cents;
    creditor.cents -= cents;

    if (debtor.cents === 0) debtorIndex += 1;
    if (creditor.cents === 0) creditorIndex += 1;
  }

  return {
    total: toMoney(totalCents),
    perPerson: participants.length ? toMoney(Math.round(totalCents / participants.length)) : 0,
    balances: namedBalances,
    settlements
  };
};

const serializeSplit = (trip) => {
  const participants = trip.billParticipants;
  const expenses = trip.billExpenses;

  return {
    participants,
    expenses,
    summary: buildSummary(participants, expenses)
  };
};

const getOwnedParticipant = async (id, userId) => {
  const participant = await prisma.billParticipant.findFirst({
    where: { id, trip: { userId } }
  });

  if (!participant) {
    throw new HttpError(404, 'Traveler not found');
  }

  return participant;
};

const getOwnedExpense = async (id, userId) => {
  const expense = await prisma.billExpense.findFirst({
    where: { id, trip: { userId } }
  });

  if (!expense) {
    throw new HttpError(404, 'Expense not found');
  }

  return expense;
};

const getOwnedSplit = async (tripId, userId) => {
  await getOwnedTrip(tripId, userId);
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: splitInclude
  });

  return serializeSplit(trip);
};

billsRouter.get('/trips/:tripId/splits', asyncHandler(async (req, res) => {
  res.json(await getOwnedSplit(toInt(req.params.tripId, 'tripId'), req.user.id));
}));

billsRouter.post('/trips/:tripId/splits/participants', asyncHandler(async (req, res) => {
  const trip = await getOwnedTrip(toInt(req.params.tripId, 'tripId'), req.user.id);
  const name = String(req.body.name ?? '').trim();

  if (!name) {
    throw new HttpError(400, 'Traveler name is required');
  }

  if (name.length > 40) {
    throw new HttpError(400, 'Traveler name must be 40 characters or fewer');
  }

  await prisma.billParticipant.create({
    data: {
      name,
      tripId: trip.id
    }
  });

  res.status(201).json(await getOwnedSplit(trip.id, req.user.id));
}));

billsRouter.delete('/splits/participants/:id', asyncHandler(async (req, res) => {
  const participant = await getOwnedParticipant(toInt(req.params.id), req.user.id);
  await prisma.billParticipant.delete({ where: { id: participant.id } });
  res.json(await getOwnedSplit(participant.tripId, req.user.id));
}));

billsRouter.post('/trips/:tripId/splits/expenses', asyncHandler(async (req, res) => {
  const trip = await getOwnedTrip(toInt(req.params.tripId, 'tripId'), req.user.id);
  const title = String(req.body.title ?? '').trim();
  const amount = Number(req.body.amount);
  const paidById = toInt(req.body.paidById, 'paidById');

  if (!title) {
    throw new HttpError(400, 'Expense title is required');
  }

  if (title.length > 60) {
    throw new HttpError(400, 'Expense title must be 60 characters or fewer');
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new HttpError(400, 'Expense amount must be greater than 0');
  }

  const participant = await prisma.billParticipant.findFirst({
    where: { id: paidById, tripId: trip.id }
  });

  if (!participant) {
    throw new HttpError(400, 'Paid by traveler must belong to this trip');
  }

  await prisma.billExpense.create({
    data: {
      title,
      amount,
      paidById,
      tripId: trip.id
    }
  });

  res.status(201).json(await getOwnedSplit(trip.id, req.user.id));
}));

billsRouter.delete('/splits/expenses/:id', asyncHandler(async (req, res) => {
  const expense = await getOwnedExpense(toInt(req.params.id), req.user.id);
  await prisma.billExpense.delete({ where: { id: expense.id } });
  res.json(await getOwnedSplit(expense.tripId, req.user.id));
}));
