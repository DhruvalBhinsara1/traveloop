import { Router } from 'express';
import multer from 'multer';
import { v4 as uuid } from 'uuid';

import { prisma } from '../prisma.js';
import { isAllowedImageMimeType, uploadTripCover } from '../utils/cloudStorage.js';
import { asyncHandler, HttpError, publicUserSelect, toInt } from '../utils/http.js';
import { ensureFriends } from '../utils/social.js';
import { validateTrip } from '../utils/validators.js';

export const tripsRouter = Router();

const coverUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: Number(process.env.MAX_COVER_UPLOAD_BYTES ?? 6_000_000) },
  fileFilter: (_req, file, callback) => {
    if (!isAllowedImageMimeType(file.mimetype)) {
      callback(new HttpError(400, 'Trip cover must be a JPEG, PNG, or WebP image'));
      return;
    }

    callback(null, true);
  }
});

export const nestedTripInclude = {
  user: { select: publicUserSelect },
  group: {
    include: {
      owner: { select: publicUserSelect },
      members: { include: { user: { select: publicUserSelect } }, orderBy: { createdAt: 'asc' } }
    }
  },
  members: { include: { user: { select: publicUserSelect } }, orderBy: { createdAt: 'asc' } },
  stops: { orderBy: { order: 'asc' }, include: { activities: true } },
  checklist: true,
  notes: { orderBy: { updatedAt: 'desc' } },
  billExpenses: { orderBy: { createdAt: 'desc' }, include: { paidBy: true } }
};

export const getOwnedTrip = async (tripId, userId) => {
  const trip = await prisma.trip.findFirst({
    where: { id: tripId, userId },
    include: nestedTripInclude
  });

  if (!trip) {
    throw new HttpError(404, 'Trip not found');
  }

  return trip;
};

export const getAccessibleTrip = async (tripId, userId) => {
  const trip = await prisma.trip.findFirst({
    where: {
      id: tripId,
      OR: [
        { userId },
        { members: { some: { userId } } },
        { group: { members: { some: { userId } } } }
      ]
    },
    include: nestedTripInclude
  });

  if (!trip) {
    throw new HttpError(404, 'Trip not found');
  }

  return trip;
};

const getOwnedGroup = async (groupId, userId) => {
  if (!groupId) return null;

  const group = await prisma.friendGroup.findFirst({
    where: { id: groupId, ownerId: userId },
    include: { members: { include: { user: { select: publicUserSelect } } } }
  });

  if (!group) {
    throw new HttpError(400, 'Group must be one of your groups');
  }

  return group;
};

const normalizeMemberIds = (memberIds, ownerId) =>
  Array.isArray(memberIds)
    ? [...new Set(memberIds.map(Number).filter((id) => Number.isInteger(id) && id > 0 && id !== ownerId))]
    : [];

const buildBillParticipants = (owner, memberIds = [], group = null) => {
  const participants = new Map();
  participants.set(owner.id, { name: owner.name, userId: owner.id });

  memberIds.forEach((userId) => {
    participants.set(userId, { userId });
  });

  group?.members?.forEach((member) => {
    participants.set(member.userId, { userId: member.userId, name: member.user?.name });
  });

  return [...participants.values()];
};

tripsRouter.get('/', asyncHandler(async (req, res) => {
  const trips = await prisma.trip.findMany({
    where: {
      OR: [
        { userId: req.user.id },
        { members: { some: { userId: req.user.id } } },
        { group: { members: { some: { userId: req.user.id } } } }
      ]
    },
    orderBy: { startDate: 'asc' },
    include: nestedTripInclude
  });

  res.json(trips);
}));

tripsRouter.post('/', asyncHandler(async (req, res) => {
  const { title, description, startDate, endDate, budget, coverImage } = req.body;
  const { start, end, budget: parsedBudget } = validateTrip(req.body);
  const isPublic = req.body.isPublic === true || req.body.isPublic === 'true';
  const memberIds = normalizeMemberIds(req.body.memberIds, req.user.id);
  const groupId = req.body.groupId ? toInt(req.body.groupId, 'groupId') : null;
  const group = await getOwnedGroup(groupId, req.user.id);

  await Promise.all(memberIds.map((userId) => ensureFriends(req.user.id, userId)));

  const memberUsers = memberIds.length
    ? await prisma.user.findMany({ where: { id: { in: memberIds } }, select: publicUserSelect })
    : [];
  const memberNameById = new Map(memberUsers.map((user) => [user.id, user.name]));

  const trip = await prisma.trip.create({
    data: {
      title: title.trim(),
      description: description?.trim() || null,
      coverImage: coverImage?.trim() || null,
      budget: parsedBudget,
      startDate: start,
      endDate: end,
      isPublic,
      shareToken: isPublic ? uuid() : null,
      userId: req.user.id,
      groupId: group?.id ?? null,
      members: {
        create: memberIds.map((userId) => ({ userId }))
      },
      checklist: {
        create: [
          { label: 'Passport', category: 'documents' },
          { label: 'Travel insurance', category: 'documents' },
          { label: 'Comfortable shoes', category: 'clothing' },
          { label: 'Phone charger', category: 'electronics' }
        ]
      },
      billParticipants: {
        create: buildBillParticipants(req.user, memberIds, group).map((participant) => ({
          name: participant.name ?? memberNameById.get(participant.userId) ?? 'Traveler',
          userId: participant.userId
        }))
      }
    },
    include: nestedTripInclude
  });

  res.status(201).json(trip);
}));

tripsRouter.get('/:id', asyncHandler(async (req, res) => {
  res.json(await getAccessibleTrip(toInt(req.params.id), req.user.id));
}));

tripsRouter.put('/:id', asyncHandler(async (req, res) => {
  const id = toInt(req.params.id);
  const existing = await getOwnedTrip(id, req.user.id);

  const { title, description, startDate, endDate, budget, coverImage } = req.body;
  const { start, end, budget: parsedBudget } = validateTrip(req.body);
  const nextIsPublic =
    req.body.isPublic === undefined
      ? undefined
      : req.body.isPublic === true || req.body.isPublic === 'true';

  const trip = await prisma.trip.update({
    where: { id },
    data: {
      title: title.trim(),
      description: description?.trim() || null,
      coverImage: coverImage?.trim() || null,
      budget: parsedBudget,
      startDate: start,
      endDate: end,
      ...(nextIsPublic === undefined
        ? {}
        : {
            isPublic: nextIsPublic,
            shareToken: nextIsPublic ? existing.shareToken ?? uuid() : null
          })
    },
    include: nestedTripInclude
  });

  res.json(trip);
}));

tripsRouter.patch('/:id/cover', coverUpload.single('cover'), asyncHandler(async (req, res) => {
  const id = toInt(req.params.id);
  await getOwnedTrip(id, req.user.id);

  if (!req.file) {
    throw new HttpError(400, 'Cover image file is required');
  }

  const uploaded = await uploadTripCover({
    buffer: req.file.buffer,
    mimetype: req.file.mimetype,
    tripId: id,
    userId: req.user.id
  });

  const trip = await prisma.trip.update({
    where: { id },
    data: { coverImage: uploaded.url },
    include: nestedTripInclude
  });

  res.json(trip);
}));

tripsRouter.delete('/:id', asyncHandler(async (req, res) => {
  const id = toInt(req.params.id);
  await getOwnedTrip(id, req.user.id);
  await prisma.trip.delete({ where: { id } });
  res.json({ success: true });
}));

tripsRouter.patch('/:id/share', asyncHandler(async (req, res) => {
  const id = toInt(req.params.id);
  const trip = await getOwnedTrip(id, req.user.id);
  const isPublic = req.body.isPublic ?? !trip.isPublic;
  const shareToken = isPublic ? trip.shareToken ?? uuid() : null;

  const updated = await prisma.trip.update({
    where: { id },
    data: { isPublic, shareToken },
    select: { id: true, isPublic: true, shareToken: true }
  });

  res.json(updated);
}));

tripsRouter.post('/:id/members', asyncHandler(async (req, res) => {
  const id = toInt(req.params.id);
  const trip = await getOwnedTrip(id, req.user.id);
  const userId = toInt(req.body.userId, 'userId');

  if (userId === req.user.id) {
    throw new HttpError(400, 'Owner is already on this trip');
  }

  await ensureFriends(req.user.id, userId);
  const user = await prisma.user.findUnique({ where: { id: userId }, select: publicUserSelect });
  if (!user) {
    throw new HttpError(404, 'User not found');
  }

  await prisma.tripMember.upsert({
    where: { tripId_userId: { tripId: trip.id, userId } },
    create: { tripId: trip.id, userId },
    update: {}
  });

  await prisma.billParticipant.upsert({
    where: { tripId_userId: { tripId: trip.id, userId } },
    create: { tripId: trip.id, userId, name: user.name },
    update: { name: user.name }
  });

  res.status(201).json(await getOwnedTrip(trip.id, req.user.id));
}));

tripsRouter.delete('/:id/members/:userId', asyncHandler(async (req, res) => {
  const id = toInt(req.params.id);
  const userId = toInt(req.params.userId, 'userId');
  const trip = await getOwnedTrip(id, req.user.id);

  await prisma.tripMember.deleteMany({ where: { tripId: trip.id, userId } });
  res.json(await getOwnedTrip(trip.id, req.user.id));
}));
