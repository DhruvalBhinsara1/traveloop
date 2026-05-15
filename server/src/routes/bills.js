import { Router } from 'express';

import { prisma } from '../prisma.js';
import {
  billLedgerInclude,
  canUseParticipantInNewExpense,
  getActiveTripUserIds,
  serializeSplit,
  syncTripBillParticipants,
  touchTrip
} from '../utils/billLedger.js';
import { asyncHandler, HttpError, toInt } from '../utils/http.js';
import { normalizeAmountCents, resolveExpenseShares, toMoney } from '../utils/splitMath.js';
import { getAccessibleTrip } from './trips.js';

export const billsRouter = Router();
export { serializeSplit, syncTripBillParticipants as ensureTripBillParticipants } from '../utils/billLedger.js';

const splitInclude = billLedgerInclude;

const requireSplitPayload = (fn) => {
  try {
    return fn();
  } catch (error) {
    throw new HttpError(400, error.message);
  }
};

const parseOptionalDate = (value, label) => {
  if (!value) return new Date();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new HttpError(400, `${label} must be a valid date`);
  }
  return date;
};

const compactString = (value, maxLength, label) => {
  const text = String(value ?? '').trim();
  if (text.length > maxLength) {
    throw new HttpError(400, `${label} must be ${maxLength} characters or fewer`);
  }
  return text || null;
};

const loadSplitTrip = async (tripId) => {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: splitInclude
  });

  if (!trip) {
    throw new HttpError(404, 'Trip not found');
  }

  return trip;
};

const getAccessibleSplit = async (tripId, userId) => {
  const accessibleTrip = await getAccessibleTrip(tripId, userId);
  await syncTripBillParticipants(accessibleTrip);
  const trip = await loadSplitTrip(tripId);
  return serializeSplit(trip, getActiveTripUserIds(accessibleTrip));
};

const getParticipant = async (id, userId) => {
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

const getExpense = async (id, userId) => {
  const expense = await prisma.billExpense.findFirst({
    where: {
      id,
      deletedAt: null,
      trip: {
        OR: [
          { userId },
          { members: { some: { userId } } },
          { group: { members: { some: { userId } } } }
        ]
      }
    },
    include: { shares: true, payments: true }
  });

  if (!expense) {
    throw new HttpError(404, 'Expense not found');
  }

  return expense;
};

const getSettlement = async (id, userId) => {
  const settlement = await prisma.billSettlement.findFirst({
    where: {
      id,
      deletedAt: null,
      trip: {
        OR: [
          { userId },
          { members: { some: { userId } } },
          { group: { members: { some: { userId } } } }
        ]
      }
    }
  });

  if (!settlement) {
    throw new HttpError(404, 'Settlement not found');
  }

  return settlement;
};

const getParticipantReferenceCount = async (participantId) => {
  const [legacyPaid, payments, shares, sentSettlements, receivedSettlements] = await Promise.all([
    prisma.billExpense.count({ where: { paidById: participantId } }),
    prisma.billExpensePayment.count({ where: { participantId } }),
    prisma.billExpenseShare.count({ where: { participantId } }),
    prisma.billSettlement.count({ where: { fromParticipantId: participantId } }),
    prisma.billSettlement.count({ where: { toParticipantId: participantId } })
  ]);

  return legacyPaid + payments + shares + sentSettlements + receivedSettlements;
};

const getExpenseParticipants = async (tripId) => {
  const participants = await prisma.billParticipant.findMany({
    where: { tripId },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }]
  });

  const usableParticipantIds = participants
    .filter(canUseParticipantInNewExpense)
    .map((participant) => participant.id);

  return { participants, usableParticipantIds };
};

const assertParticipantIdsBelongToTrip = (participantIds, participants, existingAllowedIds = new Set()) => {
  const allowedIds = new Set(
    participants
      .filter((participant) => canUseParticipantInNewExpense(participant) || existingAllowedIds.has(participant.id))
      .map((participant) => participant.id)
  );
  const invalidId = participantIds.find((id) => !allowedIds.has(id));
  if (invalidId) {
    throw new HttpError(400, 'Split travelers must belong to this trip and be active');
  }
};

const getFallbackAmountCents = (expense) => {
  if (!expense) return undefined;
  if (Number.isInteger(expense.amountCents) && expense.amountCents > 0) return expense.amountCents;
  return Math.round(Number(expense.amount ?? 0) * 100);
};

const normalizeExistingShares = (shares = []) =>
  shares.map((share) => ({
    participantId: share.participantId,
    amountCents: share.amountCents,
    percentBps: share.percentBps ?? null,
    shares: share.shares ?? null
  }));

const buildRecalculatedSplitInput = (fallbackExpense, participantIds) => {
  const mode = fallbackExpense.splitMode ?? 'equal';
  const existingShares = fallbackExpense.shares ?? [];

  if (mode === 'exact') {
    throw new HttpError(400, 'Exact split shares are required when changing the expense amount');
  }

  if (mode === 'percent') {
    return {
      mode,
      shares: existingShares.map((share) => ({
        participantId: share.participantId,
        percentBps: share.percentBps
      }))
    };
  }

  if (mode === 'shares') {
    return {
      mode,
      shares: existingShares.map((share) => ({
        participantId: share.participantId,
        shares: share.shares
      }))
    };
  }

  return { mode: 'equal', participantIds };
};

const resolveExpensePayload = async (trip, body, fallbackExpense = null) => {
  const title = String(body.title ?? fallbackExpense?.title ?? '').trim();
  if (!title) {
    throw new HttpError(400, 'Expense title is required');
  }
  if (title.length > 60) {
    throw new HttpError(400, 'Expense title must be 60 characters or fewer');
  }

  const fallbackAmountCents = getFallbackAmountCents(fallbackExpense);
  const amountCents = body.amountCents !== undefined || body.amount !== undefined
    ? requireSplitPayload(() => normalizeAmountCents({ amountCents: body.amountCents, amount: body.amount }, 'Expense amount'))
    : fallbackAmountCents;
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new HttpError(400, 'Expense amount must be greater than 0');
  }

  const paidById = body.paidById !== undefined ? toInt(body.paidById, 'paidById') : fallbackExpense?.paidById;
  if (!paidById) {
    throw new HttpError(400, 'Paid by traveler is required');
  }

  const { participants, usableParticipantIds } = await getExpenseParticipants(trip.id);
  const existingAllowedIds = new Set([
    ...(fallbackExpense?.paidById ? [fallbackExpense.paidById] : []),
    ...(fallbackExpense?.shares ?? []).map((share) => share.participantId)
  ]);
  const paidBy = participants.find(
    (participant) =>
      participant.id === paidById &&
      (canUseParticipantInNewExpense(participant) || (fallbackExpense && participant.id === fallbackExpense.paidById))
  );
  if (!paidBy) {
    throw new HttpError(400, 'Paid by traveler must belong to this trip and be active');
  }

  const fallbackParticipantIds = fallbackExpense?.shares?.length
    ? fallbackExpense.shares.map((share) => share.participantId)
    : usableParticipantIds;
  const amountChanged = Boolean(fallbackExpense) && amountCents !== fallbackAmountCents;
  let resolvedSplit;
  if (fallbackExpense && body.split === undefined && !amountChanged) {
    resolvedSplit = {
      mode: fallbackExpense.splitMode ?? 'equal',
      shares: fallbackExpense.shares?.length
        ? normalizeExistingShares(fallbackExpense.shares)
        : requireSplitPayload(() =>
            resolveExpenseShares({
              amountCents,
              split: { mode: 'equal', participantIds: fallbackParticipantIds },
              defaultParticipantIds: usableParticipantIds
            })
          ).shares
    };
  } else {
    const splitInput = body.split ?? (fallbackExpense
      ? buildRecalculatedSplitInput(fallbackExpense, fallbackParticipantIds)
      : { mode: 'equal', participantIds: usableParticipantIds });
    resolvedSplit = requireSplitPayload(() =>
      resolveExpenseShares({
        amountCents,
        split: splitInput,
        defaultParticipantIds: usableParticipantIds
      })
    );
  }
  assertParticipantIdsBelongToTrip(resolvedSplit.shares.map((share) => share.participantId), participants, existingAllowedIds);

  const category = compactString(body.category ?? fallbackExpense?.category, 32, 'Expense category');
  const note = compactString(body.note ?? fallbackExpense?.note, 500, 'Expense note');
  const paidAt = body.paidAt !== undefined ? parseOptionalDate(body.paidAt, 'Paid at') : fallbackExpense?.paidAt ?? new Date();

  return {
    title,
    amountCents,
    amount: toMoney(amountCents),
    paidById,
    paidAt,
    category,
    note,
    splitMode: resolvedSplit.mode,
    shares: resolvedSplit.shares,
    currency: trip.currency ?? 'USD'
  };
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

  await prisma.$transaction(async (tx) => {
    await tx.billParticipant.create({
      data: {
        name,
        tripId: trip.id,
        status: 'guest'
      }
    });
    await touchTrip(tx, trip.id);
  });

  res.status(201).json(await getAccessibleSplit(trip.id, req.user.id));
}));

billsRouter.delete('/splits/participants/:id', asyncHandler(async (req, res) => {
  const participant = await getParticipant(toInt(req.params.id), req.user.id);
  const trip = await getAccessibleTrip(participant.tripId, req.user.id);
  const activeUserIds = getActiveTripUserIds(trip);

  if (participant.userId && activeUserIds.has(participant.userId)) {
    throw new HttpError(400, 'Trip members cannot be removed from split participants');
  }

  const referenceCount = await getParticipantReferenceCount(participant.id);
  if (referenceCount > 0 || participant.userId) {
    await prisma.$transaction(async (tx) => {
      await tx.billParticipant.update({
        where: { id: participant.id },
        data: {
          status: participant.userId ? 'former' : 'archived',
          archivedAt: new Date()
        }
      });
      await touchTrip(tx, participant.tripId);
    });
  } else {
    await prisma.$transaction(async (tx) => {
      await tx.billParticipant.delete({ where: { id: participant.id } });
      await touchTrip(tx, participant.tripId);
    });
  }

  res.json(await getAccessibleSplit(participant.tripId, req.user.id));
}));

billsRouter.post('/trips/:tripId/splits/expenses', asyncHandler(async (req, res) => {
  const trip = await getAccessibleTrip(toInt(req.params.tripId, 'tripId'), req.user.id);
  await syncTripBillParticipants(trip);
  const payload = await resolveExpensePayload(trip, req.body);

  await prisma.$transaction(async (tx) => {
    const expense = await tx.billExpense.create({
      data: {
        title: payload.title,
        amount: payload.amount,
        amountCents: payload.amountCents,
        currency: payload.currency,
        splitMode: payload.splitMode,
        category: payload.category,
        note: payload.note,
        paidAt: payload.paidAt,
        paidById: payload.paidById,
        tripId: trip.id,
        createdByUserId: req.user.id,
        updatedByUserId: req.user.id
      }
    });

    await tx.billExpensePayment.create({
      data: {
        expenseId: expense.id,
        participantId: payload.paidById,
        amountCents: payload.amountCents
      }
    });

    await tx.billExpenseShare.createMany({
      data: payload.shares.map((share) => ({
        expenseId: expense.id,
        participantId: share.participantId,
        amountCents: share.amountCents,
        percentBps: share.percentBps ?? null,
        shares: share.shares ?? null
      }))
    });
    await touchTrip(tx, trip.id);
  });

  res.status(201).json(await getAccessibleSplit(trip.id, req.user.id));
}));

billsRouter.patch('/splits/expenses/:id', asyncHandler(async (req, res) => {
  const expense = await getExpense(toInt(req.params.id), req.user.id);
  const trip = await getAccessibleTrip(expense.tripId, req.user.id);
  const payload = await resolveExpensePayload(trip, req.body, expense);

  await prisma.$transaction(async (tx) => {
    await tx.billExpense.update({
      where: { id: expense.id },
      data: {
        title: payload.title,
        amount: payload.amount,
        amountCents: payload.amountCents,
        currency: payload.currency,
        splitMode: payload.splitMode,
        category: payload.category,
        note: payload.note,
        paidAt: payload.paidAt,
        paidById: payload.paidById,
        updatedByUserId: req.user.id
      }
    });

    await tx.billExpensePayment.deleteMany({ where: { expenseId: expense.id } });
    await tx.billExpenseShare.deleteMany({ where: { expenseId: expense.id } });

    await tx.billExpensePayment.create({
      data: {
        expenseId: expense.id,
        participantId: payload.paidById,
        amountCents: payload.amountCents
      }
    });

    await tx.billExpenseShare.createMany({
      data: payload.shares.map((share) => ({
        expenseId: expense.id,
        participantId: share.participantId,
        amountCents: share.amountCents,
        percentBps: share.percentBps ?? null,
        shares: share.shares ?? null
      }))
    });
    await touchTrip(tx, trip.id);
  });

  res.json(await getAccessibleSplit(trip.id, req.user.id));
}));

billsRouter.delete('/splits/expenses/:id', asyncHandler(async (req, res) => {
  const expense = await getExpense(toInt(req.params.id), req.user.id);
  await prisma.$transaction(async (tx) => {
    await tx.billExpense.update({
      where: { id: expense.id },
      data: {
        deletedAt: new Date(),
        deletedByUserId: req.user.id
      }
    });
    await touchTrip(tx, expense.tripId);
  });
  res.json(await getAccessibleSplit(expense.tripId, req.user.id));
}));

const createSettlement = async (tripId, userId, body) => {
  const trip = await getAccessibleTrip(tripId, userId);
  await syncTripBillParticipants(trip);
  const amountCents = requireSplitPayload(() => normalizeAmountCents({ amountCents: body.amountCents, amount: body.amount }, 'Settlement amount'));
  if (amountCents <= 0) {
    throw new HttpError(400, 'Settlement amount must be greater than 0');
  }

  const fromParticipantId = toInt(body.fromParticipantId, 'fromParticipantId');
  const toParticipantId = toInt(body.toParticipantId, 'toParticipantId');
  if (fromParticipantId === toParticipantId) {
    throw new HttpError(400, 'Settlement travelers must be different');
  }

  const participants = await prisma.billParticipant.findMany({
    where: { tripId: trip.id, id: { in: [fromParticipantId, toParticipantId] } }
  });
  if (participants.length !== 2) {
    throw new HttpError(400, 'Settlement travelers must belong to this trip');
  }

  await prisma.$transaction(async (tx) => {
    await tx.billSettlement.create({
      data: {
        tripId: trip.id,
        fromParticipantId,
        toParticipantId,
        amountCents,
        currency: trip.currency ?? 'USD',
        settledAt: parseOptionalDate(body.settledAt, 'Settled at'),
        note: compactString(body.note, 500, 'Settlement note'),
        recordedByUserId: userId
      }
    });
    await touchTrip(tx, trip.id);
  });

  return getAccessibleSplit(trip.id, userId);
};

const clearSettlementHistory = async (tripId, userId) => {
  const trip = await getAccessibleTrip(tripId, userId);
  await prisma.$transaction(async (tx) => {
    await tx.billSettlement.updateMany({
      where: { tripId: trip.id, deletedAt: null },
      data: { deletedAt: new Date() }
    });
    await touchTrip(tx, trip.id);
  });

  return getAccessibleSplit(trip.id, userId);
};

billsRouter.post('/trips/:tripId/splits/settlements', asyncHandler(async (req, res) => {
  res.status(201).json(await createSettlement(toInt(req.params.tripId, 'tripId'), req.user.id, req.body));
}));

billsRouter.post('/splits/settlements', asyncHandler(async (req, res) => {
  res.status(201).json(await createSettlement(toInt(req.body.tripId, 'tripId'), req.user.id, req.body));
}));

billsRouter.delete('/splits/settlements/:id', asyncHandler(async (req, res) => {
  const settlement = await getSettlement(toInt(req.params.id), req.user.id);
  await prisma.$transaction(async (tx) => {
    await tx.billSettlement.update({
      where: { id: settlement.id },
      data: { deletedAt: new Date() }
    });
    await touchTrip(tx, settlement.tripId);
  });
  res.json(await getAccessibleSplit(settlement.tripId, req.user.id));
}));

billsRouter.delete('/trips/:tripId/splits/settlements/:id', asyncHandler(async (req, res) => {
  const settlement = await getSettlement(toInt(req.params.id), req.user.id);
  const tripId = toInt(req.params.tripId, 'tripId');
  if (settlement.tripId !== tripId) {
    throw new HttpError(404, 'Settlement not found');
  }

  await prisma.$transaction(async (tx) => {
    await tx.billSettlement.update({
      where: { id: settlement.id },
      data: { deletedAt: new Date() }
    });
    await touchTrip(tx, settlement.tripId);
  });
  res.json(await getAccessibleSplit(settlement.tripId, req.user.id));
}));

billsRouter.delete('/trips/:tripId/splits/settlements', asyncHandler(async (req, res) => {
  res.json(await clearSettlementHistory(toInt(req.params.tripId, 'tripId'), req.user.id));
}));
