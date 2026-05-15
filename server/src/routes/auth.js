import bcrypt from 'bcryptjs';
import { Router } from 'express';
import multer from 'multer';

import { requireAuth, signToken } from '../middleware/auth.js';
import { prisma } from '../prisma.js';
import { isAllowedImageMimeType, uploadAvatar } from '../utils/cloudStorage.js';
import { asyncHandler, HttpError, sanitizeUser } from '../utils/http.js';
import { normalizeUsername, validateAuth, validateLoginIdentifier, validateUsername } from '../utils/validators.js';

export const authRouter = Router();

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: Number(process.env.MAX_AVATAR_UPLOAD_BYTES ?? 3_000_000) },
  fileFilter: (_req, file, callback) => {
    if (!isAllowedImageMimeType(file.mimetype)) {
      callback(new HttpError(400, 'Profile photo must be a JPEG, PNG, or WebP image'));
      return;
    }

    callback(null, true);
  }
});

authRouter.post('/register', asyncHandler(async (req, res) => {
  const { name, username, email, password } = req.body;
  validateAuth({ name, username, email, password });
  const normalizedUsername = normalizeUsername(username);

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) {
    throw new HttpError(409, 'An account already exists for this email');
  }

  const existingUsername = await prisma.user.findUnique({ where: { username: normalizedUsername } });
  if (existingUsername) {
    throw new HttpError(409, 'That username is already taken');
  }

  const hash = await bcrypt.hash(password, 12);
  let user;
  try {
    user = await prisma.user.create({
      data: { name: name.trim(), username: normalizedUsername, email: email.toLowerCase().trim(), password: hash }
    });
  } catch (error) {
    if (error.code === 'P2002') {
      throw new HttpError(409, 'Email or username is already taken');
    }
    throw error;
  }

  res.status(201).json({ token: signToken(user), user: sanitizeUser(user) });
}));

authRouter.post('/login', asyncHandler(async (req, res) => {
  const identifier = String(req.body.identifier ?? req.body.email ?? '').trim();
  const { password } = req.body;
  validateAuth({ identifier, password }, 'login');

  const loginIdentifier = validateLoginIdentifier(identifier);
  const user = await prisma.user.findUnique({
    where: { [loginIdentifier.type]: loginIdentifier.value }
  });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new HttpError(401, 'Invalid email, username, or password');
  }

  res.json({ token: signToken(user), user: sanitizeUser(user) });
}));

authRouter.get('/me', requireAuth, asyncHandler(async (req, res) => {
  res.json({ user: sanitizeUser(req.user) });
}));

authRouter.patch('/me', requireAuth, asyncHandler(async (req, res) => {
  const name = String(req.body.name ?? '').trim();
  const username = validateUsername(req.body.username);

  if (!name) {
    throw new HttpError(400, 'Name is required');
  }

  if (name.length > 60) {
    throw new HttpError(400, 'Name must be 60 characters or fewer');
  }

  if (username !== req.user.username) {
    const existingUsername = await prisma.user.findUnique({ where: { username } });
    if (existingUsername && existingUsername.id !== req.user.id) {
      throw new HttpError(409, 'That username is already taken');
    }
  }

  let user;
  try {
    user = await prisma.user.update({
      where: { id: req.user.id },
      data: { name, username }
    });
  } catch (error) {
    if (error.code === 'P2002') {
      throw new HttpError(409, 'That username is already taken');
    }
    throw error;
  }

  res.json({ user: sanitizeUser(user) });
}));

authRouter.patch('/me/avatar', requireAuth, avatarUpload.single('avatar'), asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new HttpError(400, 'Profile photo file is required');
  }

  const uploaded = await uploadAvatar({
    buffer: req.file.buffer,
    mimetype: req.file.mimetype,
    userId: req.user.id
  });

  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { avatarUrl: uploaded.url }
  });

  res.json({ user: sanitizeUser(user) });
}));
