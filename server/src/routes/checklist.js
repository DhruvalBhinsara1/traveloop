import { Router } from 'express';

import { prisma } from '../prisma.js';
import { asyncHandler, HttpError, toInt } from '../utils/http.js';
import { validateChecklistItem } from '../utils/validators.js';
import { getOwnedTrip } from './trips.js';

export const checklistRouter = Router();

const getOwnedChecklistItem = async (id, userId) => {
  const item = await prisma.checklistItem.findFirst({ where: { id, trip: { userId } } });
  if (!item) {
    throw new HttpError(404, 'Checklist item not found');
  }
  return item;
};

checklistRouter.get('/trips/:tripId/checklist', asyncHandler(async (req, res) => {
  const trip = await getOwnedTrip(toInt(req.params.tripId, 'tripId'), req.user.id);
  res.json(trip.checklist);
}));

checklistRouter.post('/trips/:tripId/checklist', asyncHandler(async (req, res) => {
  const trip = await getOwnedTrip(toInt(req.params.tripId, 'tripId'), req.user.id);
  validateChecklistItem(req.body);

  const item = await prisma.checklistItem.create({
    data: {
      label: req.body.label.trim(),
      category: req.body.category,
      tripId: trip.id
    }
  });

  res.status(201).json(item);
}));

checklistRouter.patch('/checklist/:id', asyncHandler(async (req, res) => {
  const item = await getOwnedChecklistItem(toInt(req.params.id), req.user.id);
  const updated = await prisma.checklistItem.update({
    where: { id: item.id },
    data: {
      isPacked: req.body.isPacked ?? item.isPacked,
      label: req.body.label?.trim() || item.label,
      category: req.body.category || item.category
    }
  });

  res.json(updated);
}));

checklistRouter.delete('/checklist/:id', asyncHandler(async (req, res) => {
  const item = await getOwnedChecklistItem(toInt(req.params.id), req.user.id);
  await prisma.checklistItem.delete({ where: { id: item.id } });
  res.json({ success: true });
}));
