import { Router } from 'express';

import { prisma } from '../prisma.js';
import { asyncHandler, HttpError, publicUserSelect, toInt } from '../utils/http.js';
import { parseOptionalNumber } from '../utils/validators.js';
import { getAccessibleTrip } from './trips.js';

export const billsRouter = Router();

const splitInclude = {
  billParticipants: { orderBy: { createdAt: 'asc' }, include: { user: { select: publicUserSelect } } },
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

export const getActiveTripUserIds = (trip) => {
  const activeUserIds = new Set();
  if (trip.userId) activeUserIds.add(trip.userId);
  if (trip.user?.id) activeUserIds.add(trip.user.id);
  trip.members?.forEach((member) => activeUserIds.add(member.userId));
  trip.group?.members?.forEach((member) => activeUserIds.add(member.userId));
  return activeUserIds;
};

const serializeParticipant = (participant, activeUserIds) => ({
  ...participant,
  canRemove: !participant.userId || !activeUserIds.has(participant.userId)
});

export const serializeSplit = (trip, activeUserIds = getActiveTripUserIds(trip)) => {
  const participants = trip.billParticipants.map((participant) => serializeParticipant(participant, activeUserIds));
  const expenses = trip.billExpenses.map((expense) => ({
    ...expense,
    paidBy: expense.paidBy ? serializeParticipant(expense.paidBy, activeUserIds) : expense.paidBy
  }));

  return {
    participants,
    expenses,
    summary: buildSummary(participants, expenses)
  };
};

const ensureTripBillParticipants = async (trip) => {
  const userEntries = new Map();
  userEntries.set(trip.user.id, trip.user);
  trip.members?.forEach((member) => userEntries.set(member.userId, member.user));
  trip.group?.members?.forEach((member) => userEntries.set(member.userId, member.user));

  await Promise.all(
    [...userEntries.values()].map((user) =>
      prisma.billParticipant.upsert({
        where: { tripId_userId: { tripId: trip.id, userId: user.id } },
        create: { tripId: trip.id, userId: user.id, name: user.name },
        update: { name: user.name }
      })
    )
  );
};

const getOwnedParticipant = async (id, userId) => {
  const participant = await prisma.billParticipant.findFirst({
    where: {
      id,
      trip: {
        OR: [
          { userId },
          { members: { some: { userId } } },
          { group: { members: { some: { userId } } } }
        ]
      }
    }
  });

  if (!participant) {
    throw new HttpError(404, 'Traveler not found');
  }

  return participant;
};

const getOwnedExpense = async (id, userId) => {
  const expense = await prisma.billExpense.findFirst({
    where: {
      id,
      trip: {
        OR: [
          { userId },
          { members: { some: { userId } } },
          { group: { members: { some: { userId } } } }
        ]
      }
    }
  });

  if (!expense) {
    throw new HttpError(404, 'Expense not found');
  }

  return expense;
};

const getOwnedSplit = async (tripId, userId) => {
  const accessibleTrip = await getAccessibleTrip(tripId, userId);
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: splitInclude
  });

  return serializeSplit(trip, getActiveTripUserIds(accessibleTrip));
};

const getAccessibleSplit = async (tripId, userId) => {
  const accessibleTrip = await getAccessibleTrip(tripId, userId);
  await ensureTripBillParticipants(accessibleTrip);
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: splitInclude
  });

  return serializeSplit(trip, getActiveTripUserIds(accessibleTrip));
};

billsRouter.get('/trips/:tripId/splits', asyncHandler(async (req, res) => {
  res.json(await getAccessibleSplit(toInt(req.params.tripId, 'tripId'), req.user.id));
}));

billsRouter.post('/trips/:tripId/splits/participants', asyncHandler(async (req, res) => {
  const trip = await getAccessibleTrip(toInt(req.params.tripId, 'tripId'), req.user.id);
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
  const trip = await getAccessibleTrip(participant.tripId, req.user.id);
  const activeUserIds = getActiveTripUserIds(trip);
  if (participant.userId && activeUserIds.has(participant.userId)) {
    throw new HttpError(400, 'Trip members cannot be removed from split participants');
  }
  await prisma.billParticipant.delete({ where: { id: participant.id } });
  res.json(await getOwnedSplit(participant.tripId, req.user.id));
}));

billsRouter.post('/trips/:tripId/splits/expenses', asyncHandler(async (req, res) => {
  const trip = await getAccessibleTrip(toInt(req.params.tripId, 'tripId'), req.user.id);
  const title = String(req.body.title ?? '').trim();
  const amount = parseOptionalNumber(req.body.amount, 'Expense amount');
  const paidById = toInt(req.body.paidById, 'paidById');

  if (!title) {
    throw new HttpError(400, 'Expense title is required');
  }

  if (title.length > 60) {
    throw new HttpError(400, 'Expense title must be 60 characters or fewer');
  }

  if (amount <= 0) {
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
