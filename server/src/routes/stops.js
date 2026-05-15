import { Router } from 'express';

import { prisma } from '../prisma.js';
import { asyncHandler, HttpError, toInt } from '../utils/http.js';
import { validateStop } from '../utils/validators.js';
import { getAccessibleTrip } from './trips.js';

export const stopsRouter = Router();

const getOwnedStop = async (stopId, userId) => {
  const stop = await prisma.stop.findFirst({
    where: {
      id: stopId,
      trip: {
        OR: [
          { userId },
          { members: { some: { userId } } },
          { group: { members: { some: { userId } } } }
        ]
      }
    },
    include: { trip: true, activities: true }
  });

  if (!stop) {
    throw new HttpError(404, 'Stop not found');
  }

  return stop;
};

stopsRouter.post('/trips/:tripId/stops', asyncHandler(async (req, res) => {
  const trip = await getAccessibleTrip(toInt(req.params.tripId, 'tripId'), req.user.id);
  const { cityName, country } = req.body;
  const { arrival, depart, order } = validateStop(req.body, trip);
  const nextOrder = order ?? trip.stops.length + 1;

  const stop = await prisma.stop.create({
    data: {
      cityName: cityName.trim(),
      country: country.trim(),
      arrivalDate: arrival,
      departDate: depart,
      order: Number(nextOrder),
      tripId: trip.id
    },
    include: { activities: true }
  });

  res.status(201).json(stop);
}));

stopsRouter.put('/stops/:id', asyncHandler(async (req, res) => {
  const stop = await getOwnedStop(toInt(req.params.id), req.user.id);
  const { cityName, country } = req.body;
  const { arrival, depart, order } = validateStop(req.body, stop.trip);

  const updated = await prisma.stop.update({
    where: { id: stop.id },
    data: {
      cityName: cityName.trim(),
      country: country.trim(),
      arrivalDate: arrival,
      departDate: depart,
      order: order === undefined ? stop.order : order
    },
    include: { activities: true }
  });

  res.json(updated);
}));

stopsRouter.delete('/stops/:id', asyncHandler(async (req, res) => {
  const stop = await getOwnedStop(toInt(req.params.id), req.user.id);
  await prisma.stop.delete({ where: { id: stop.id } });
  res.json({ success: true });
}));

stopsRouter.patch('/trips/:tripId/stops/reorder', asyncHandler(async (req, res) => {
  const trip = await getAccessibleTrip(toInt(req.params.tripId, 'tripId'), req.user.id);
  const orderedIds = Array.isArray(req.body.orderedIds) ? req.body.orderedIds.map(Number) : [];
  const currentIds = trip.stops.map((stop) => stop.id);

  if (orderedIds.length !== currentIds.length || orderedIds.some((id) => !Number.isInteger(id) || !currentIds.includes(id))) {
    throw new HttpError(400, 'orderedIds must contain every stop in this trip');
  }

  await prisma.$transaction(
    orderedIds.map((id, index) => prisma.stop.update({ where: { id }, data: { order: index + 1 } }))
  );

  res.json(await getAccessibleTrip(trip.id, req.user.id));
}));
