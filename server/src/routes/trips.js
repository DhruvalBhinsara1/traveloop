import { Router } from 'express';
import { v4 as uuid } from 'uuid';

import { prisma } from '../prisma.js';
import { asyncHandler, HttpError, toInt } from '../utils/http.js';
import { validateTrip } from '../utils/validators.js';

export const tripsRouter = Router();

const nestedTripInclude = {
  stops: { orderBy: { order: 'asc' }, include: { activities: true } },
  checklist: true,
  notes: { orderBy: { updatedAt: 'desc' } }
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

tripsRouter.get('/', asyncHandler(async (req, res) => {
  const trips = await prisma.trip.findMany({
    where: { userId: req.user.id },
    orderBy: { startDate: 'asc' },
    include: { stops: true, checklist: true, notes: true }
  });

  res.json(trips);
}));

tripsRouter.post('/', asyncHandler(async (req, res) => {
  const { title, description, startDate, endDate, budget, coverImage } = req.body;
  const { start, end } = validateTrip(req.body);

  const trip = await prisma.trip.create({
    data: {
      title: title.trim(),
      description: description?.trim() || null,
      coverImage: coverImage?.trim() || null,
      budget: budget === undefined || budget === null || budget === '' ? null : Number(budget),
      startDate: start,
      endDate: end,
      userId: req.user.id,
      checklist: {
        create: [
          { label: 'Passport', category: 'documents' },
          { label: 'Travel insurance', category: 'documents' },
          { label: 'Comfortable shoes', category: 'clothing' },
          { label: 'Phone charger', category: 'electronics' }
        ]
      }
    },
    include: nestedTripInclude
  });

  res.status(201).json(trip);
}));

tripsRouter.get('/:id', asyncHandler(async (req, res) => {
  res.json(await getOwnedTrip(toInt(req.params.id), req.user.id));
}));

tripsRouter.put('/:id', asyncHandler(async (req, res) => {
  const id = toInt(req.params.id);
  await getOwnedTrip(id, req.user.id);

  const { title, description, startDate, endDate, budget, coverImage } = req.body;
  const { start, end } = validateTrip(req.body);

  const trip = await prisma.trip.update({
    where: { id },
    data: {
      title: title.trim(),
      description: description?.trim() || null,
      coverImage: coverImage?.trim() || null,
      budget: budget === undefined || budget === null || budget === '' ? null : Number(budget),
      startDate: start,
      endDate: end
    },
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
