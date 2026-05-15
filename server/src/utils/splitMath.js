export const SPLIT_MODES = new Set(['equal', 'exact', 'percent', 'shares']);

export const toMoney = (cents) => Number((Number(cents || 0) / 100).toFixed(2));

export const amountToCents = (value, label = 'Amount') => {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new Error(`${label} must be a valid number`);
  }

  return Math.round(number * 100);
};

export const normalizeAmountCents = ({ amountCents, amount }, label = 'Amount') => {
  if (amountCents !== undefined && amountCents !== null && amountCents !== '') {
    const cents = Number(amountCents);
    if (!Number.isInteger(cents)) {
      throw new Error(`${label} must be a whole number of cents`);
    }
    return cents;
  }

  return amountToCents(amount, label);
};

const assertPositiveCents = (cents, label = 'Amount') => {
  if (!Number.isInteger(cents) || cents <= 0) {
    throw new Error(`${label} must be greater than 0`);
  }
};

const uniquePositiveIds = (ids, label) => {
  if (!Array.isArray(ids) || !ids.length) {
    throw new Error(`${label} must include at least one traveler`);
  }

  const normalized = [...new Set(ids.map(Number))];
  if (normalized.some((id) => !Number.isInteger(id) || id <= 0)) {
    throw new Error(`${label} contains an invalid traveler`);
  }
  if (normalized.length !== ids.length) {
    throw new Error(`${label} cannot include the same traveler twice`);
  }

  return normalized;
};

export const allocateByWeight = (amountCents, entries) => {
  assertPositiveCents(amountCents);

  if (!Array.isArray(entries) || !entries.length) {
    throw new Error('At least one traveler must be included');
  }

  const weightedEntries = entries.map((entry) => {
    const participantId = Number(entry.participantId);
    const weight = Number(entry.weight);
    if (!Number.isInteger(participantId) || participantId <= 0) {
      throw new Error('Split includes an invalid traveler');
    }
    if (!Number.isInteger(weight) || weight <= 0) {
      throw new Error('Split weights must be positive whole numbers');
    }
    return { participantId, weight };
  });

  const totalWeight = weightedEntries.reduce((total, entry) => total + entry.weight, 0);
  const allocations = weightedEntries.map((entry) => {
    const raw = amountCents * entry.weight;
    return {
      participantId: entry.participantId,
      amountCents: Math.floor(raw / totalWeight),
      remainder: raw % totalWeight
    };
  });

  let leftover = amountCents - allocations.reduce((total, entry) => total + entry.amountCents, 0);
  const remainderOrder = [...allocations].sort((a, b) => b.remainder - a.remainder || a.participantId - b.participantId);

  for (const allocation of remainderOrder) {
    if (leftover <= 0) break;
    allocation.amountCents += 1;
    leftover -= 1;
  }

  return allocations
    .map(({ participantId, amountCents }) => ({ participantId, amountCents }))
    .sort((a, b) => a.participantId - b.participantId);
};

export const resolveExpenseShares = ({
  amountCents,
  split,
  defaultParticipantIds
}) => {
  assertPositiveCents(amountCents, 'Expense amount');

  const mode = String(split?.mode ?? 'equal').toLowerCase();
  if (!SPLIT_MODES.has(mode)) {
    throw new Error('Split mode must be equal, exact, percent, or shares');
  }

  if (mode === 'equal') {
    const participantIds = uniquePositiveIds(split?.participantIds?.length ? split.participantIds : defaultParticipantIds, 'Equal split');
    return {
      mode,
      shares: allocateByWeight(amountCents, participantIds.map((participantId) => ({ participantId, weight: 1 })))
    };
  }

  const shareInputs = Array.isArray(split?.shares) ? split.shares : [];
  if (!shareInputs.length) {
    throw new Error('Split shares are required');
  }

  if (mode === 'exact') {
    const shares = shareInputs.map((share) => {
      const amountCents = normalizeAmountCents({ amountCents: share.amountCents, amount: share.amount }, 'Share amount');
      assertPositiveCents(amountCents, 'Share amount');
      return {
        participantId: Number(share.participantId),
        amountCents
      };
    });
    const total = shares.reduce((sum, share) => sum + share.amountCents, 0);
    if (total !== amountCents) {
      throw new Error('Exact split shares must equal the expense amount');
    }
    uniquePositiveIds(shares.map((share) => share.participantId), 'Exact split');
    return { mode, shares };
  }

  if (mode === 'percent') {
    const percentShares = shareInputs.map((share) => {
      const participantId = Number(share.participantId);
      const percentBps = Number(share.percentBps);
      if (!Number.isInteger(percentBps) || percentBps <= 0) {
        throw new Error('Percent split values must be positive basis points');
      }
      return { participantId, percentBps };
    });
    const totalPercent = percentShares.reduce((sum, share) => sum + share.percentBps, 0);
    if (totalPercent !== 10000) {
      throw new Error('Percent split must total 100%');
    }
    uniquePositiveIds(percentShares.map((share) => share.participantId), 'Percent split');
    const allocations = allocateByWeight(amountCents, percentShares.map((share) => ({ participantId: share.participantId, weight: share.percentBps })));
    return {
      mode,
      shares: allocations.map((allocation) => ({
        ...allocation,
        percentBps: percentShares.find((share) => share.participantId === allocation.participantId)?.percentBps
      }))
    };
  }

  const weightedShares = shareInputs.map((share) => {
    const participantId = Number(share.participantId);
    const shares = Number(share.shares);
    if (!Number.isInteger(shares) || shares <= 0) {
      throw new Error('Share split values must be positive whole numbers');
    }
    return { participantId, shares };
  });
  uniquePositiveIds(weightedShares.map((share) => share.participantId), 'Shares split');
  const allocations = allocateByWeight(amountCents, weightedShares.map((share) => ({ participantId: share.participantId, weight: share.shares })));
  return {
    mode,
    shares: allocations.map((allocation) => ({
      ...allocation,
      shares: weightedShares.find((share) => share.participantId === allocation.participantId)?.shares
    }))
  };
};

const centsFromExpense = (expense) => {
  if (Number.isInteger(expense.amountCents) && expense.amountCents > 0) return expense.amountCents;
  return amountToCents(expense.amount ?? 0, 'Expense amount');
};

const participantName = (participant) => participant.name ?? participant.user?.name ?? 'Traveler';

const buildLegacyShares = (expense, participants) => {
  const amountCents = centsFromExpense(expense);
  return allocateByWeight(amountCents, participants.map((participant) => ({ participantId: participant.id, weight: 1 })));
};

export const buildSplitSummary = ({
  participants,
  expenses,
  settlements = [],
  currency = 'USD'
}) => {
  const balances = new Map(
    participants.map((participant) => [
      participant.id,
      {
        participantId: participant.id,
        name: participantName(participant),
        paidCents: 0,
        owedCents: 0,
        settlementPaidCents: 0,
        settlementReceivedCents: 0,
        netCents: 0
      }
    ])
  );

  let totalCents = 0;

  expenses
    .filter((expense) => !expense.deletedAt)
    .forEach((expense) => {
      if (!participants.length) return;

      const amountCents = centsFromExpense(expense);
      totalCents += amountCents;

      const payments = expense.payments?.length
        ? expense.payments
        : [{ participantId: expense.paidById, amountCents }];
      const shares = expense.shares?.length ? expense.shares : buildLegacyShares(expense, participants);

      payments.forEach((payment) => {
        const balance = balances.get(payment.participantId);
        if (balance) balance.paidCents += Number(payment.amountCents ?? 0);
      });

      shares.forEach((share) => {
        const balance = balances.get(share.participantId);
        if (balance) balance.owedCents += Number(share.amountCents ?? 0);
      });
    });

  settlements
    .filter((settlement) => !settlement.deletedAt)
    .forEach((settlement) => {
      const amountCents = Number(settlement.amountCents ?? 0);
      const fromBalance = balances.get(settlement.fromParticipantId);
      const toBalance = balances.get(settlement.toParticipantId);
      if (fromBalance) fromBalance.settlementPaidCents += amountCents;
      if (toBalance) toBalance.settlementReceivedCents += amountCents;
    });

  const detailedBalances = [...balances.values()].map((balance) => {
    const netCents = balance.paidCents - balance.owedCents + balance.settlementPaidCents - balance.settlementReceivedCents;
    return {
      ...balance,
      netCents,
      amount: toMoney(netCents)
    };
  });

  const debtors = detailedBalances
    .filter((balance) => balance.netCents < 0)
    .map((balance) => ({ ...balance, remainingCents: Math.abs(balance.netCents) }))
    .sort((a, b) => b.remainingCents - a.remainingCents || a.participantId - b.participantId);

  const creditors = detailedBalances
    .filter((balance) => balance.netCents > 0)
    .map((balance) => ({ ...balance, remainingCents: balance.netCents }))
    .sort((a, b) => b.remainingCents - a.remainingCents || a.participantId - b.participantId);

  const suggestedSettlements = [];
  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const amountCents = Math.min(debtor.remainingCents, creditor.remainingCents);

    if (amountCents > 0) {
      suggestedSettlements.push({
        fromParticipantId: debtor.participantId,
        from: debtor.name,
        toParticipantId: creditor.participantId,
        to: creditor.name,
        amountCents,
        amount: toMoney(amountCents)
      });
    }

    debtor.remainingCents -= amountCents;
    creditor.remainingCents -= amountCents;
    if (debtor.remainingCents === 0) debtorIndex += 1;
    if (creditor.remainingCents === 0) creditorIndex += 1;
  }

  return {
    total: toMoney(totalCents),
    totalCents,
    currency,
    perPerson: participants.length ? toMoney(Math.round(totalCents / participants.length)) : 0,
    balances: detailedBalances,
    suggestedSettlements,
    settlements: suggestedSettlements
  };
};
