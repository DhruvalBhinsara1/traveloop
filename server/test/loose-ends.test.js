import assert from 'node:assert/strict';
import { after, describe, test } from 'node:test';

import { serializeSplit } from '../src/routes/bills.js';
import { serializePublicTrip } from '../src/routes/public.js';
import { prisma } from '../src/prisma.js';
import { assertValidImageUpload, detectImageMimeType } from '../src/utils/cloudStorage.js';
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
    assert.equal(split.participants[1].canRemove, false);
    assert.equal(split.participants[2].canRemove, true);
    assert.equal(split.participants[3].canRemove, true);
    assert.equal(split.expenses[0].paidBy.canRemove, true);
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
