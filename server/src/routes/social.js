import { Router } from 'express';

import { prisma } from '../prisma.js';
import { asyncHandler, HttpError, publicUserSelect, sanitizePublicUser, toInt } from '../utils/http.js';
import { canonicalFriendPair, ensureFriends, getFriendIds, getFriends, serializeFriend } from '../utils/social.js';
import { normalizeUsername } from '../utils/validators.js';

export const usersRouter = Router();
export const friendsRouter = Router();
export const groupsRouter = Router();

const groupInclude = {
  owner: { select: publicUserSelect },
  members: {
    orderBy: { createdAt: 'asc' },
    include: { user: { select: publicUserSelect } }
  }
};

const serializeGroup = (group) => ({
  id: group.id,
  name: group.name,
  ownerId: group.ownerId,
  owner: group.owner ? sanitizePublicUser(group.owner) : undefined,
  members: group.members.map((member) => ({
    id: member.id,
    groupId: member.groupId,
    userId: member.userId,
    createdAt: member.createdAt,
    user: sanitizePublicUser(member.user)
  })),
  createdAt: group.createdAt,
  updatedAt: group.updatedAt
});

const getOwnedGroup = async (groupId, userId) => {
  const group = await prisma.friendGroup.findFirst({
    where: { id: groupId, ownerId: userId },
    include: groupInclude
  });

  if (!group) {
    throw new HttpError(404, 'Group not found');
  }

  return group;
};

const serializeRequest = (request) => ({
  id: request.id,
  requesterId: request.requesterId,
  recipientId: request.recipientId,
  status: request.status,
  createdAt: request.createdAt,
  respondedAt: request.respondedAt,
  requester: sanitizePublicUser(request.requester),
  recipient: sanitizePublicUser(request.recipient)
});

const normalizeUserIds = (ids, currentUserId) =>
  Array.isArray(ids)
    ? [
        ...new Set(
          ids
            .map(Number)
            .filter((id) => Number.isInteger(id) && id > 0 && id !== currentUserId)
        )
      ]
    : [];

usersRouter.get('/search', asyncHandler(async (req, res) => {
  const query = normalizeUsername(req.query.username);
  if (query.length < 2) {
    res.json([]);
    return;
  }

  const [users, friendIds, sentRequests, receivedRequests] = await Promise.all([
    prisma.user.findMany({
      where: {
        id: { not: req.user.id },
        username: { contains: query }
      },
      orderBy: [{ username: 'asc' }],
      take: 10,
      select: publicUserSelect
    }),
    getFriendIds(req.user.id),
    prisma.friendRequest.findMany({
      where: { requesterId: req.user.id, status: 'pending' },
      select: { recipientId: true }
    }),
    prisma.friendRequest.findMany({
      where: { recipientId: req.user.id, status: 'pending' },
      select: { requesterId: true }
    })
  ]);

  const friendSet = new Set(friendIds);
  const sentSet = new Set(sentRequests.map((request) => request.recipientId));
  const receivedSet = new Set(receivedRequests.map((request) => request.requesterId));

  res.json(users.map((user) => ({
    ...sanitizePublicUser(user),
    relationship: friendSet.has(user.id)
      ? 'friend'
      : sentSet.has(user.id)
        ? 'request_sent'
        : receivedSet.has(user.id)
          ? 'request_received'
          : 'none'
  })));
}));

friendsRouter.get('/', asyncHandler(async (req, res) => {
  const friends = await getFriends(req.user.id);
  res.json(friends.map(serializeFriend));
}));

friendsRouter.get('/requests', asyncHandler(async (req, res) => {
  const [incoming, outgoing] = await Promise.all([
    prisma.friendRequest.findMany({
      where: { recipientId: req.user.id, status: 'pending' },
      orderBy: { createdAt: 'desc' },
      include: { requester: { select: publicUserSelect }, recipient: { select: publicUserSelect } }
    }),
    prisma.friendRequest.findMany({
      where: { requesterId: req.user.id, status: 'pending' },
      orderBy: { createdAt: 'desc' },
      include: { requester: { select: publicUserSelect }, recipient: { select: publicUserSelect } }
    })
  ]);

  res.json({
    incoming: incoming.map(serializeRequest),
    outgoing: outgoing.map(serializeRequest)
  });
}));

friendsRouter.post('/requests', asyncHandler(async (req, res) => {
  const recipientId = req.body.userId ? toInt(req.body.userId, 'userId') : null;
  const username = normalizeUsername(req.body.username);
  const recipient = recipientId
    ? await prisma.user.findUnique({ where: { id: recipientId }, select: publicUserSelect })
    : username
      ? await prisma.user.findUnique({ where: { username }, select: publicUserSelect })
      : null;

  if (!recipient) {
    throw new HttpError(404, 'User not found');
  }

  if (recipient.id === req.user.id) {
    throw new HttpError(400, 'You cannot add yourself');
  }

  const existingFriendship = await prisma.friendship.findUnique({
    where: { userAId_userBId: canonicalFriendPair(req.user.id, recipient.id) }
  });

  if (existingFriendship) {
    throw new HttpError(409, 'You are already friends');
  }

  const reversePending = await prisma.friendRequest.findUnique({
    where: { requesterId_recipientId: { requesterId: recipient.id, recipientId: req.user.id } }
  });

  if (reversePending?.status === 'pending') {
    throw new HttpError(409, 'This user already sent you a request');
  }

  const request = await prisma.friendRequest.upsert({
    where: { requesterId_recipientId: { requesterId: req.user.id, recipientId: recipient.id } },
    create: { requesterId: req.user.id, recipientId: recipient.id },
    update: { status: 'pending', respondedAt: null },
    include: { requester: { select: publicUserSelect }, recipient: { select: publicUserSelect } }
  });

  res.status(201).json(serializeRequest(request));
}));

friendsRouter.patch('/requests/:id', asyncHandler(async (req, res) => {
  const id = toInt(req.params.id);
  const action = String(req.body.action ?? '').toLowerCase();

  if (!['accept', 'decline'].includes(action)) {
    throw new HttpError(400, 'Action must be accept or decline');
  }

  const request = await prisma.friendRequest.findFirst({
    where: { id, recipientId: req.user.id, status: 'pending' },
    include: { requester: { select: publicUserSelect }, recipient: { select: publicUserSelect } }
  });

  if (!request) {
    throw new HttpError(404, 'Friend request not found');
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (action === 'accept') {
      await tx.friendship.upsert({
        where: { userAId_userBId: canonicalFriendPair(request.requesterId, request.recipientId) },
        create: canonicalFriendPair(request.requesterId, request.recipientId),
        update: {}
      });
    }

    return tx.friendRequest.update({
      where: { id: request.id },
      data: { status: action === 'accept' ? 'accepted' : 'declined', respondedAt: new Date() },
      include: { requester: { select: publicUserSelect }, recipient: { select: publicUserSelect } }
    });
  });

  res.json(serializeRequest(updated));
}));

friendsRouter.delete('/:userId', asyncHandler(async (req, res) => {
  const otherUserId = toInt(req.params.userId, 'userId');
  await prisma.friendship.deleteMany({ where: canonicalFriendPair(req.user.id, otherUserId) });
  res.json({ success: true });
}));

groupsRouter.get('/', asyncHandler(async (req, res) => {
  const groups = await prisma.friendGroup.findMany({
    where: { ownerId: req.user.id },
    orderBy: { updatedAt: 'desc' },
    include: groupInclude
  });

  res.json(groups.map(serializeGroup));
}));

groupsRouter.post('/', asyncHandler(async (req, res) => {
  const name = String(req.body.name ?? '').trim();
  const memberIds = normalizeUserIds(req.body.memberIds, req.user.id);

  if (!name) {
    throw new HttpError(400, 'Group name is required');
  }

  if (name.length > 50) {
    throw new HttpError(400, 'Group name must be 50 characters or fewer');
  }

  await Promise.all(memberIds.map((id) => ensureFriends(req.user.id, id)));

  const group = await prisma.friendGroup.create({
    data: {
      name,
      ownerId: req.user.id,
      members: {
        create: memberIds.map((userId) => ({ userId }))
      }
    },
    include: groupInclude
  });

  res.status(201).json(serializeGroup(group));
}));

groupsRouter.get('/:id', asyncHandler(async (req, res) => {
  res.json(serializeGroup(await getOwnedGroup(toInt(req.params.id), req.user.id)));
}));

groupsRouter.patch('/:id', asyncHandler(async (req, res) => {
  const group = await getOwnedGroup(toInt(req.params.id), req.user.id);
  const name = String(req.body.name ?? '').trim();

  if (!name) {
    throw new HttpError(400, 'Group name is required');
  }

  if (name.length > 50) {
    throw new HttpError(400, 'Group name must be 50 characters or fewer');
  }

  const updated = await prisma.friendGroup.update({
    where: { id: group.id },
    data: { name },
    include: groupInclude
  });

  res.json(serializeGroup(updated));
}));

groupsRouter.delete('/:id', asyncHandler(async (req, res) => {
  const group = await getOwnedGroup(toInt(req.params.id), req.user.id);
  await prisma.friendGroup.delete({ where: { id: group.id } });
  res.json({ success: true });
}));

groupsRouter.post('/:id/members', asyncHandler(async (req, res) => {
  const group = await getOwnedGroup(toInt(req.params.id), req.user.id);
  const userId = toInt(req.body.userId, 'userId');
  await ensureFriends(req.user.id, userId);

  const updated = await prisma.friendGroup.update({
    where: { id: group.id },
    data: {
      members: {
        connectOrCreate: {
          where: { groupId_userId: { groupId: group.id, userId } },
          create: { userId }
        }
      }
    },
    include: groupInclude
  });

  res.status(201).json(serializeGroup(updated));
}));

groupsRouter.delete('/:id/members/:userId', asyncHandler(async (req, res) => {
  const group = await getOwnedGroup(toInt(req.params.id), req.user.id);
  const userId = toInt(req.params.userId, 'userId');

  await prisma.friendGroupMember.deleteMany({ where: { groupId: group.id, userId } });
  res.json(serializeGroup(await getOwnedGroup(group.id, req.user.id)));
}));
