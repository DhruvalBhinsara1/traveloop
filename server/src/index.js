import 'dotenv/config';

import cors from 'cors';
import express from 'express';
import morgan from 'morgan';

import { requireAuth } from './middleware/auth.js';
import { activitiesRouter } from './routes/activities.js';
import { authRouter } from './routes/auth.js';
import { checklistRouter } from './routes/checklist.js';
import { notesRouter } from './routes/notes.js';
import { publicRouter } from './routes/public.js';
import { stopsRouter } from './routes/stops.js';
import { tripsRouter } from './routes/trips.js';
import { HttpError } from './utils/http.js';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is required');
}

const app = express();
const port = Number(process.env.PORT ?? 3000);

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'traveloop-api' });
});

app.use('/api/auth', authRouter);
app.use('/api/public', publicRouter);
app.use('/api', requireAuth, tripsRouter);
app.use('/api', requireAuth, stopsRouter);
app.use('/api', requireAuth, activitiesRouter);
app.use('/api', requireAuth, checklistRouter);
app.use('/api', requireAuth, notesRouter);

app.use((_req, _res, next) => {
  next(new HttpError(404, 'Route not found'));
});

app.use((error, _req, res, _next) => {
  const status = error.status || 500;
  const message = status === 500 && process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message;
  if (status === 500) {
    console.error(error);
  }
  res.status(status).json({ error: message });
});

app.listen(port, () => {
  console.log(`Traveloop API listening on ${port}`);
});
