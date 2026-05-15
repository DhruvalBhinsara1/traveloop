import assert from 'node:assert/strict';
import { after, describe, test } from 'node:test';

import { serializePublicTrip } from '../src/routes/public.js';
import { prisma } from '../src/prisma.js';
import { serializeSplit, serializeTripWithBills, syncTripBillParticipants } from '../src/utils/billLedger.js';
import { assertValidImageUpload, detectImageMimeType } from '../src/utils/cloudStorage.js';
import { allocateByWeight, buildSplitSummary, resolveExpenseShares } from '../src/utils/splitMath.js';
import { validateActivity, validateActivityDuration, validateStop, validateTrip } from '../src/utils/validators.js';

after(async () => {
  await prisma.$disconnect();
});

describe('public trip serialization', () => {
  test('excludes private and internal trip fields', () => {
    const trip = {
      id: 42,
      title: 'Japan Adventure',
      description: 'Temples and trains',
      coverImage: 'https://example.com/cover.jpg',
      budget: 2500,
      startDate: '2026-06-01',
      endDate: '2026-06-10',
      isPublic: true,
      shareToken: 'secret-token',
      userId: 7,
      user: { id: 7, name: 'Riya', username: 'riya', email: 'riya@example.com', avatarUrl: null, createdAt: 'now' },
      members: [{ userId: 8 }],
      group: { id: 1, name: 'Crew' },
      checklist: [{ id: 1, label: 'Passport' }],
      notes: [{ id: 2, content: 'Hotel code 1234' }],
      stops: [
        {
          id: 5,
          cityName: 'Tokyo',
          country: 'Japan',
          arrivalDate: '2026-06-01',
          departDate: '2026-06-05',
          order: 1,
          tripId: 42,
          activities: [
            {
              id: 9,
              name: 'Ramen',
              description: null,
              category: 'food',
              cost: 18,
              duration: 90,
              date: '2026-06-02',
              stopId: 5
            }
          ]
        }
      ]
    };

    const serialized = serializePublicTrip(trip);

    assert.equal(serialized.id, undefined);
    assert.equal(serialized.shareToken, undefined);
    assert.equal(serialized.isPublic, undefined);
    assert.equal(serialized.userId, undefined);
    assert.equal(serialized.members, undefined);
    assert.equal(serialized.group, undefined);
    assert.equal(serialized.checklist, undefined);
    assert.equal(serialized.notes, undefined);
    assert.deepEqual(serialized.user, { name: 'Riya', username: 'riya', avatarUrl: null });
    assert.equal(serialized.stops[0].id, undefined);
    assert.equal(serialized.stops[0].tripId, undefined);
    assert.equal(serialized.stops[0].activities[0].id, undefined);
    assert.equal(serialized.stops[0].activities[0].stopId, undefined);
    assert.equal(serialized.stops[0].activities[0].name, 'Ramen');
  });
});

describe('numeric validators', () => {
  const trip = {
    startDate: new Date('2026-06-01T00:00:00.000Z'),
    endDate: new Date('2026-06-10T00:00:00.000Z')
  };

  test('rejects invalid budgets', () => {
    assert.throws(() => validateTrip({ title: 'Trip', startDate: trip.startDate, endDate: trip.endDate, budget: 'NaN' }), /valid number/);
    assert.throws(() => validateTrip({ title: 'Trip', startDate: trip.startDate, endDate: trip.endDate, budget: Infinity }), /valid number/);
    assert.throws(() => validateTrip({ title: 'Trip', startDate: trip.startDate, endDate: trip.endDate, budget: -1 }), /non-negative/);
  });

  test('rejects invalid activity costs and durations', () => {
    assert.throws(() => validateActivity({ name: 'Dinner', category: 'food', cost: 'abc' }), /valid number/);
    assert.throws(() => validateActivity({ name: 'Dinner', category: 'food', cost: -1 }), /non-negative/);
    assert.throws(() => validateActivityDuration('twenty'), /valid number/);
    assert.throws(() => validateActivityDuration(12.5), /whole number/);
    assert.throws(() => validateActivityDuration(-1), /non-negative/);
  });

  test('rejects malformed stop order', () => {
    const payload = {
      cityName: 'Tokyo',
      country: 'Japan',
      arrivalDate: trip.startDate,
      departDate: trip.endDate
    };

    assert.throws(() => validateStop({ ...payload, order: 'first' }, trip), /valid number/);
    assert.throws(() => validateStop({ ...payload, order: 1.5 }, trip), /whole number/);
    assert.throws(() => validateStop({ ...payload, order: -1 }, trip), /non-negative/);
  });
});

describe('split serialization', () => {
  test('marks active trip users locked and stale or guest participants removable', () => {
    const lockedOwner = { id: 1, name: 'Owner', tripId: 10, userId: 100, createdAt: 'now' };
    const lockedMember = { id: 2, name: 'Member', tripId: 10, userId: 200, createdAt: 'now' };
    const staleMember = { id: 3, name: 'Former member', tripId: 10, userId: 300, createdAt: 'now' };
    const guest = { id: 4, name: 'Guest', tripId: 10, userId: null, createdAt: 'now' };
    const trip = {
      id: 10,
      userId: 100,
      members: [{ userId: 200 }],
      group: { members: [{ userId: 400 }] },
      billParticipants: [lockedOwner, lockedMember, staleMember, guest],
      billExpenses: [{ id: 8, title: 'Taxi', amount: 40, tripId: 10, paidById: 3, paidBy: staleMember, createdAt: 'now' }]
    };

    const split = serializeSplit(trip);

    assert.equal(split.participants[0].canRemove, false);
    assert.equal(split.participants[0].canUseInNewExpense, true);
    assert.equal(split.participants[1].canRemove, false);
    assert.equal(split.participants[2].canRemove, true);
    assert.equal(split.participants[2].status, 'former');
    assert.equal(split.participants[2].canUseInNewExpense, false);
    assert.equal(split.participants[3].canRemove, true);
    assert.equal(split.participants[3].status, 'guest');
    assert.equal(split.participants[3].canUseInNewExpense, true);
    assert.equal(split.expenses[0].paidBy.canRemove, true);
  });

  test('excludes deleted expenses and settlements from split and trip bill serializers', () => {
    const owner = { id: 1, name: 'Owner', tripId: 20, userId: 100, createdAt: 'now' };
    const member = { id: 2, name: 'Member', tripId: 20, userId: 200, createdAt: 'now' };
    const activeExpense = {
      id: 11,
      title: 'Hotel',
      amount: 90,
      amountCents: 9000,
      tripId: 20,
      paidById: 1,
      paidBy: owner,
      payments: [{ participantId: 1, amountCents: 9000 }],
      shares: [
        { participantId: 1, amountCents: 4500 },
        { participantId: 2, amountCents: 4500 }
      ],
      createdAt: 'now'
    };
    const deletedExpense = { ...activeExpense, id: 12, title: 'Deleted', deletedAt: 'then' };
    const activeSettlement = {
      id: 3,
      tripId: 20,
      fromParticipantId: 2,
      toParticipantId: 1,
      amountCents: 1000,
      fromParticipant: member,
      toParticipant: owner
    };
    const deletedSettlement = { ...activeSettlement, id: 4, deletedAt: 'then' };
    const trip = {
      id: 20,
      userId: 100,
      user: { id: 100 },
      members: [{ userId: 200 }],
      billParticipants: [owner, member],
      billExpenses: [activeExpense, deletedExpense],
      billSettlements: [activeSettlement, deletedSettlement]
    };

    const split = serializeSplit(trip);
    const serializedTrip = serializeTripWithBills(trip);

    assert.deepEqual(split.expenses.map((expense) => expense.id), [11]);
    assert.deepEqual(serializedTrip.billExpenses.map((expense) => expense.id), [11]);
    assert.equal(split.summary.totalCents, 9000);
    assert.equal(serializedTrip.billExpenses[0].amount, 90);
    assert.equal(serializedTrip.billExpenses[0].amountCents, 9000);
    assert.deepEqual(split.settlements.map((settlement) => settlement.id), [3]);
    assert.deepEqual(serializedTrip.billSettlements.map((settlement) => settlement.id), [3]);
  });

  test('syncs active trip and group users without marking overlapping access former', async () => {
    const calls = [];
    const tx = {
      billParticipant: {
        upsert: async (args) => calls.push(['upsert', args]),
        updateMany: async (args) => calls.push(['updateMany', args])
      }
    };
    const trip = {
      id: 30,
      userId: 100,
      user: { id: 100, name: 'Owner' },
      members: [{ userId: 200, user: { id: 200, name: 'Direct' } }],
      group: { members: [{ userId: 200, user: { id: 200, name: 'Direct' } }, { userId: 300, user: { id: 300, name: 'Group' } }] }
    };

    const activeIds = await syncTripBillParticipants(trip, tx);
    const upserts = calls.filter(([kind]) => kind === 'upsert');
    const updateMany = calls.find(([kind]) => kind === 'updateMany')[1];

    assert.deepEqual([...activeIds].sort((a, b) => a - b), [100, 200, 300]);
    assert.equal(upserts.length, 3);
    assert.deepEqual(updateMany.where.NOT.userId.in.sort((a, b) => a - b), [100, 200, 300]);
    assert.deepEqual(updateMany.data, { status: 'former', archivedAt: null });
    assert.equal(upserts[0][1].update.archivedAt, null);
  });
});

describe('split math', () => {
  test('equal split distributes cents deterministically', () => {
    assert.deepEqual(allocateByWeight(100, [
      { participantId: 2, weight: 1 },
      { participantId: 1, weight: 1 },
      { participantId: 3, weight: 1 }
    ]), [
      { participantId: 1, amountCents: 34 },
      { participantId: 2, amountCents: 33 },
      { participantId: 3, amountCents: 33 }
    ]);
  });

  test('exact split must match the expense total', () => {
    assert.throws(() => resolveExpenseShares({
      amountCents: 1000,
      defaultParticipantIds: [1, 2],
      split: {
        mode: 'exact',
        shares: [
          { participantId: 1, amountCents: 400 },
          { participantId: 2, amountCents: 500 }
        ]
      }
    }), /equal the expense amount/);
  });

  test('percent and share splits round to the exact amount', () => {
    assert.deepEqual(resolveExpenseShares({
      amountCents: 100,
      defaultParticipantIds: [1, 2, 3],
      split: {
        mode: 'percent',
        shares: [
          { participantId: 1, percentBps: 3333 },
          { participantId: 2, percentBps: 3333 },
          { participantId: 3, percentBps: 3334 }
        ]
      }
    }).shares, [
      { participantId: 1, amountCents: 33, percentBps: 3333 },
      { participantId: 2, amountCents: 33, percentBps: 3333 },
      { participantId: 3, amountCents: 34, percentBps: 3334 }
    ]);

    assert.deepEqual(resolveExpenseShares({
      amountCents: 100,
      defaultParticipantIds: [1, 2],
      split: {
        mode: 'shares',
        shares: [
          { participantId: 1, shares: 2 },
          { participantId: 2, shares: 1 }
        ]
      }
    }).shares, [
      { participantId: 1, amountCents: 67, shares: 2 },
      { participantId: 2, amountCents: 33, shares: 1 }
    ]);
  });

  test('recorded settlements adjust balances but not spend', () => {
    const summary = buildSplitSummary({
      participants: [
        { id: 1, name: 'A' },
        { id: 2, name: 'B' }
      ],
      expenses: [
        {
          id: 1,
          title: 'Hotel',
          amountCents: 1000,
          paidById: 1,
          payments: [{ participantId: 1, amountCents: 1000 }],
          shares: [
            { participantId: 1, amountCents: 500 },
            { participantId: 2, amountCents: 500 }
          ]
        }
      ],
      settlements: [{ fromParticipantId: 2, toParticipantId: 1, amountCents: 200 }]
    });

    assert.equal(summary.totalCents, 1000);
    assert.equal(summary.balances.find((balance) => balance.participantId === 1).netCents, 300);
    assert.equal(summary.balances.find((balance) => balance.participantId === 2).netCents, -300);
  });

  test('deleted expenses and settlements are ignored in totals and balances', () => {
    const summary = buildSplitSummary({
      participants: [
        { id: 1, name: 'A' },
        { id: 2, name: 'B' }
      ],
      expenses: [
        {
          id: 1,
          title: 'Active',
          amountCents: 1000,
          paidById: 1,
          payments: [{ participantId: 1, amountCents: 1000 }],
          shares: [
            { participantId: 1, amountCents: 500 },
            { participantId: 2, amountCents: 500 }
          ]
        },
        {
          id: 2,
          title: 'Deleted',
          amountCents: 10000,
          paidById: 2,
          deletedAt: 'then',
          payments: [{ participantId: 2, amountCents: 10000 }],
          shares: [{ participantId: 1, amountCents: 10000 }]
        }
      ],
      settlements: [
        { fromParticipantId: 2, toParticipantId: 1, amountCents: 500 },
        { fromParticipantId: 1, toParticipantId: 2, amountCents: 10000, deletedAt: 'then' }
      ]
    });

    assert.equal(summary.totalCents, 1000);
    assert.equal(summary.balances.find((balance) => balance.participantId === 1).netCents, 0);
    assert.equal(summary.balances.find((balance) => balance.participantId === 2).netCents, 0);
    assert.equal(summary.settlements.length, 0);
  });
});

describe('image upload validation', () => {
  test('accepts only matching JPEG, PNG, or WebP content', () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0x00]);
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const webp = Buffer.from('RIFFxxxxWEBP', 'ascii');

    assert.equal(detectImageMimeType(jpeg), 'image/jpeg');
    assert.equal(detectImageMimeType(png), 'image/png');
    assert.equal(detectImageMimeType(webp), 'image/webp');
    assert.doesNotThrow(() => assertValidImageUpload({ buffer: jpeg, mimetype: 'image/jpeg' }, 'Avatar'));
    assert.throws(() => assertValidImageUpload({ buffer: jpeg, mimetype: 'image/png' }, 'Avatar'), /does not match/);
    assert.throws(() => assertValidImageUpload({ buffer: Buffer.from('not image'), mimetype: 'image/jpeg' }, 'Avatar'), /does not match/);
    assert.throws(() => assertValidImageUpload({ buffer: jpeg, mimetype: 'image/gif' }, 'Avatar'), /JPEG, PNG, or WebP/);
  });
});
