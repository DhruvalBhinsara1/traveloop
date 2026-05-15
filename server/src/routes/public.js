import { Router } from 'express';

import { prisma } from '../prisma.js';
import { asyncHandler, HttpError } from '../utils/http.js';

export const publicRouter = Router();

export const serializePublicTrip = (trip) => ({
  title: trip.title,
  description: trip.description,
  coverImage: trip.coverImage,
  budget: trip.budget,
  startDate: trip.startDate,
  endDate: trip.endDate,
  user: trip.user
    ? {
        name: trip.user.name,
        username: trip.user.username,
        avatarUrl: trip.user.avatarUrl
      }
    : null,
  stops: (trip.stops ?? []).map((stop) => ({
    cityName: stop.cityName,
    country: stop.country,
    arrivalDate: stop.arrivalDate,
    departDate: stop.departDate,
    order: stop.order,
    activities: (stop.activities ?? []).map((activity) => ({
      name: activity.name,
      description: activity.description,
      category: activity.category,
      cost: activity.cost,
      duration: activity.duration,
      date: activity.date
    }))
  }))
});

const publicTripInclude = {
  user: { select: { name: true, username: true, avatarUrl: true } },
  stops: { orderBy: { order: 'asc' }, include: { activities: true } }
};

const handlePublicTrip = asyncHandler(async (req, res) => {
  const trip = await prisma.trip.findFirst({
    where: { shareToken: req.params.shareToken, isPublic: true },
    include: publicTripInclude
  });

  if (!trip) {
    throw new HttpError(404, 'Public trip not found');
  }

  res.json(serializePublicTrip(trip));
});

publicRouter.get('/trips/:shareToken', handlePublicTrip);
publicRouter.get('/:shareToken', handlePublicTrip);
