import { Router } from 'express';

import { prisma } from '../prisma.js';
import { asyncHandler, HttpError, parseDate, toInt } from '../utils/http.js';
import { validateActivity } from '../utils/validators.js';

export const activitiesRouter = Router();

const getOwnedStop = async (stopId, userId) => {
  const stop = await prisma.stop.findFirst({ where: { id: stopId, trip: { userId } } });
  if (!stop) {
    throw new HttpError(404, 'Stop not found');
  }
  return stop;
};

const getOwnedActivity = async (id, userId) => {
  const activity = await prisma.activity.findFirst({
    where: { id, stop: { trip: { userId } } }
  });
  if (!activity) {
    throw new HttpError(404, 'Activity not found');
  }
  return activity;
};

activitiesRouter.post('/stops/:stopId/activities', asyncHandler(async (req, res) => {
  const stop = await getOwnedStop(toInt(req.params.stopId, 'stopId'), req.user.id);
  const { name, description, category, cost, duration, date } = req.body;
  validateActivity(req.body);

  const activity = await prisma.activity.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      category,
      cost: cost === undefined || cost === null || cost === '' ? 0 : Number(cost),
      duration: duration ? Number(duration) : null,
      date: date ? parseDate(date, 'date') : null,
      stopId: stop.id
    }
  });

  res.status(201).json(activity);
}));

activitiesRouter.put('/activities/:id', asyncHandler(async (req, res) => {
  const existing = await getOwnedActivity(toInt(req.params.id), req.user.id);
  const { name, description, category, cost, duration, date } = req.body;
  validateActivity(req.body);

  const activity = await prisma.activity.update({
    where: { id: existing.id },
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      category,
      cost: cost === undefined || cost === null || cost === '' ? 0 : Number(cost),
      duration: duration ? Number(duration) : null,
      date: date ? parseDate(date, 'date') : null
    }
  });

  res.json(activity);
}));

activitiesRouter.delete('/activities/:id', asyncHandler(async (req, res) => {
  const activity = await getOwnedActivity(toInt(req.params.id), req.user.id);
  await prisma.activity.delete({ where: { id: activity.id } });
  res.json({ success: true });
}));
