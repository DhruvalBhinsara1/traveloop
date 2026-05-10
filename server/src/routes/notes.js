import { Router } from 'express';

import { prisma } from '../prisma.js';
import { asyncHandler, HttpError, requireFields, toInt } from '../utils/http.js';
import { getOwnedTrip } from './trips.js';

export const notesRouter = Router();

const getOwnedNote = async (id, userId) => {
  const note = await prisma.note.findFirst({ where: { id, trip: { userId } } });
  if (!note) {
    throw new HttpError(404, 'Note not found');
  }
  return note;
};

notesRouter.get('/trips/:tripId/notes', asyncHandler(async (req, res) => {
  const trip = await getOwnedTrip(toInt(req.params.tripId, 'tripId'), req.user.id);
  res.json(trip.notes);
}));

notesRouter.post('/trips/:tripId/notes', asyncHandler(async (req, res) => {
  const trip = await getOwnedTrip(toInt(req.params.tripId, 'tripId'), req.user.id);
  requireFields(req.body, ['content']);

  const note = await prisma.note.create({
    data: { content: req.body.content, tripId: trip.id }
  });

  res.status(201).json(note);
}));

notesRouter.put('/notes/:id', asyncHandler(async (req, res) => {
  const note = await getOwnedNote(toInt(req.params.id), req.user.id);
  requireFields(req.body, ['content']);

  const updated = await prisma.note.update({
    where: { id: note.id },
    data: { content: req.body.content }
  });

  res.json(updated);
}));

notesRouter.delete('/notes/:id', asyncHandler(async (req, res) => {
  const note = await getOwnedNote(toInt(req.params.id), req.user.id);
  await prisma.note.delete({ where: { id: note.id } });
  res.json({ success: true });
}));
