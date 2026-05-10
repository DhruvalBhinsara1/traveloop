import bcrypt from 'bcryptjs';
import { Router } from 'express';

import { requireAuth, signToken } from '../middleware/auth.js';
import { prisma } from '../prisma.js';
import { asyncHandler, HttpError, sanitizeUser } from '../utils/http.js';
import { validateAuth } from '../utils/validators.js';

export const authRouter = Router();

authRouter.post('/register', asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  validateAuth({ name, email, password });

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) {
    throw new HttpError(409, 'An account already exists for this email');
  }

  const hash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { name: name.trim(), email: email.toLowerCase().trim(), password: hash }
  });

  res.status(201).json({ token: signToken(user), user: sanitizeUser(user) });
}));

authRouter.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  validateAuth({ email, password }, 'login');

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new HttpError(401, 'Invalid email or password');
  }

  res.json({ token: signToken(user), user: sanitizeUser(user) });
}));

authRouter.get('/me', requireAuth, asyncHandler(async (req, res) => {
  res.json({ user: sanitizeUser(req.user) });
}));
