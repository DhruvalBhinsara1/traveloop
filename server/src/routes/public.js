import { Router } from 'express';

import { prisma } from '../prisma.js';
import { asyncHandler, HttpError } from '../utils/http.js';

export const publicRouter = Router();

publicRouter.get('/:shareToken', asyncHandler(async (req, res) => {
  const trip = await prisma.trip.findFirst({
    where: { shareToken: req.params.shareToken, isPublic: true },
    include: {
      user: { select: { name: true, avatarUrl: true } },
      stops: { orderBy: { order: 'asc' }, include: { activities: true } },
      checklist: true,
      notes: { orderBy: { updatedAt: 'desc' } }
    }
  });

  if (!trip) {
    throw new HttpError(404, 'Public trip not found');
  }

  res.json(trip);
}));
