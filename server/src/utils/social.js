import { prisma } from '../prisma.js';
import { HttpError, publicUserSelect, sanitizePublicUser } from './http.js';

export const canonicalFriendPair = (userId, otherUserId) => {
  const a = Number(userId);
  const b = Number(otherUserId);
  return a < b ? { userAId: a, userBId: b } : { userAId: b, userBId: a };
};

export const ensureFriends = async (userId, otherUserId) => {
  const pair = canonicalFriendPair(userId, otherUserId);
  const friendship = await prisma.friendship.findUnique({
    where: { userAId_userBId: pair }
  });

  if (!friendship) {
    throw new HttpError(400, 'User must be your friend first');
  }

  return friendship;
};

export const getFriendIds = async (userId) => {
  const friendships = await prisma.friendship.findMany({
    where: { OR: [{ userAId: userId }, { userBId: userId }] },
    select: { userAId: true, userBId: true }
  });

  return friendships.map((friendship) => (friendship.userAId === userId ? friendship.userBId : friendship.userAId));
};

export const getFriends = async (userId) => {
  const friendIds = await getFriendIds(userId);

  if (!friendIds.length) return [];

  return prisma.user.findMany({
    where: { id: { in: friendIds } },
    orderBy: [{ name: 'asc' }, { username: 'asc' }],
    select: publicUserSelect
  });
};

export const serializeFriend = (user) => sanitizePublicUser(user);

