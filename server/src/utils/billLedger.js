import { prisma } from '../prisma.js';
import { publicUserSelect } from './http.js';
import { buildSplitSummary, toMoney } from './splitMath.js';

export const billLedgerInclude = {
  billParticipants: {
    orderBy: { createdAt: 'asc' },
    include: { user: { select: publicUserSelect } }
  },
  billExpenses: {
    where: { deletedAt: null },
    orderBy: { createdAt: 'desc' },
    include: {
      paidBy: { include: { user: { select: publicUserSelect } } },
      payments: { orderBy: { createdAt: 'asc' } },
      shares: { orderBy: { createdAt: 'asc' } }
    }
  },
  billSettlements: {
    where: { deletedAt: null },
    orderBy: { settledAt: 'desc' },
    include: {
      fromParticipant: { include: { user: { select: publicUserSelect } } },
      toParticipant: { include: { user: { select: publicUserSelect } } }
    }
  }
};

export const tripBillInclude = {
  billExpenses: billLedgerInclude.billExpenses,
  billSettlements: billLedgerInclude.billSettlements
};

export const isInactiveParticipantStatus = (status) => ['archived', 'former'].includes(status);

export const canUseParticipantInNewExpense = (participant) =>
  !participant.archivedAt && !isInactiveParticipantStatus(participant.status);

const expenseAmountCents = (expense) => {
  if (Number.isInteger(expense.amountCents) && expense.amountCents > 0) return expense.amountCents;
  return Math.round(Number(expense.amount ?? 0) * 100);
};

export const getActiveTripUserIds = (trip) => {
  const activeUserIds = new Set();
  if (trip.userId) activeUserIds.add(trip.userId);
  if (trip.user?.id) activeUserIds.add(trip.user.id);
  trip.members?.forEach((member) => activeUserIds.add(member.userId));
  trip.group?.members?.forEach((member) => activeUserIds.add(member.userId));
  return activeUserIds;
};

export const serializeParticipant = (participant, activeUserIds = new Set()) => {
  const activeUser = Boolean(participant.userId && activeUserIds.has(participant.userId));
  const storedStatus = participant.status ?? (participant.archivedAt ? 'archived' : participant.userId ? 'former' : 'guest');
  const status = activeUser
    ? 'active'
    : participant.userId
      ? storedStatus === 'active' ? 'former' : storedStatus
      : storedStatus === 'archived' ? 'archived' : 'guest';
  const isActiveTripUser = activeUser && !participant.archivedAt;
  const canUseInNewExpense = !participant.archivedAt && (isActiveTripUser || status === 'guest');
  const canArchive = !isActiveTripUser;

  return {
    ...participant,
    status,
    isActiveTripUser,
    canUseInNewExpense,
    canArchive,
    canRemove: canArchive
  };
};

export const serializePayment = (payment) => ({
  ...payment,
  amount: toMoney(payment.amountCents)
});

export const serializeShare = (share) => ({
  ...share,
  amount: toMoney(share.amountCents)
});

export const serializeExpense = (expense, activeUserIds = new Set()) => {
  const amountCents = expenseAmountCents(expense);
  return {
    ...expense,
    amount: toMoney(amountCents),
    amountCents,
    splitMode: expense.splitMode ?? 'equal',
    paidBy: expense.paidBy ? serializeParticipant(expense.paidBy, activeUserIds) : expense.paidBy,
    payments: (expense.payments ?? []).map(serializePayment),
    shares: (expense.shares ?? []).map(serializeShare)
  };
};

export const serializeSettlement = (settlement, activeUserIds = new Set()) => {
  const fromParticipant = settlement.fromParticipant ? serializeParticipant(settlement.fromParticipant, activeUserIds) : settlement.fromParticipant;
  const toParticipant = settlement.toParticipant ? serializeParticipant(settlement.toParticipant, activeUserIds) : settlement.toParticipant;

  return {
    ...settlement,
    amount: toMoney(settlement.amountCents),
    from: fromParticipant?.name ?? 'Traveler',
    to: toParticipant?.name ?? 'Traveler',
    fromParticipant,
    toParticipant
  };
};

export const serializeTripWithBills = (trip, activeUserIds = getActiveTripUserIds(trip)) => ({
  ...trip,
  ...(trip.billParticipants
    ? { billParticipants: trip.billParticipants.map((participant) => serializeParticipant(participant, activeUserIds)) }
    : {}),
  ...(trip.billExpenses
    ? { billExpenses: trip.billExpenses.filter((expense) => !expense.deletedAt).map((expense) => serializeExpense(expense, activeUserIds)) }
    : {}),
  ...(trip.billSettlements
    ? { billSettlements: trip.billSettlements.filter((settlement) => !settlement.deletedAt).map((settlement) => serializeSettlement(settlement, activeUserIds)) }
    : {})
});

export const serializeSplit = (trip, activeUserIds = getActiveTripUserIds(trip)) => {
  const participants = (trip.billParticipants ?? []).map((participant) => serializeParticipant(participant, activeUserIds));
  const expenses = (trip.billExpenses ?? []).filter((expense) => !expense.deletedAt).map((expense) => serializeExpense(expense, activeUserIds));
  const settlements = (trip.billSettlements ?? []).filter((settlement) => !settlement.deletedAt).map((settlement) => serializeSettlement(settlement, activeUserIds));

  return {
    participants,
    expenses,
    settlements,
    summary: buildSplitSummary({
      participants,
      expenses,
      settlements,
      currency: trip.currency ?? 'USD'
    })
  };
};

const syncTripInclude = {
  user: { select: publicUserSelect },
  members: { include: { user: { select: publicUserSelect } } },
  group: { include: { members: { include: { user: { select: publicUserSelect } } } } }
};

const loadTripForSync = async (tripOrId, tx) => {
  if (typeof tripOrId === 'number') {
    return tx.trip.findUnique({ where: { id: tripOrId }, include: syncTripInclude });
  }

  if (tripOrId.user && tripOrId.members && (tripOrId.group === null || tripOrId.group?.members)) {
    return tripOrId;
  }

  return tx.trip.findUnique({ where: { id: tripOrId.id }, include: syncTripInclude });
};

export const syncTripBillParticipants = async (tripOrId, tx = prisma) => {
  const trip = await loadTripForSync(tripOrId, tx);
  if (!trip?.user) return new Set();

  const userEntries = new Map();
  userEntries.set(trip.user.id, trip.user);
  trip.members?.forEach((member) => {
    if (member.user) userEntries.set(member.userId, member.user);
  });
  trip.group?.members?.forEach((member) => {
    if (member.user) userEntries.set(member.userId, member.user);
  });

  const activeUserIds = [...userEntries.keys()];

  await Promise.all(
    [...userEntries.values()].map((user) =>
      tx.billParticipant.upsert({
        where: { tripId_userId: { tripId: trip.id, userId: user.id } },
        create: { tripId: trip.id, userId: user.id, name: user.name, status: 'active' },
        update: { name: user.name, status: 'active', archivedAt: null }
      })
    )
  );

  await tx.billParticipant.updateMany({
    where: {
      tripId: trip.id,
      userId: { not: null },
      NOT: { userId: { in: activeUserIds } }
    },
    data: { status: 'former', archivedAt: null }
  });

  return new Set(activeUserIds);
};

export const touchTrip = (tx, tripId) =>
  tx.trip.update({
    where: { id: tripId },
    data: { updatedAt: new Date() },
    select: { id: true }
  });
