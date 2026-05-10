import jwt from 'jsonwebtoken';

import { prisma } from '../prisma.js';
import { HttpError } from '../utils/http.js';

export const requireAuth = async (req, _res, next) => {
  try {
    const header = req.headers.authorization ?? '';
    const [, token] = header.split(' ');

    if (!token) {
      throw new HttpError(401, 'Missing bearer token');
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });

    if (!user) {
      throw new HttpError(401, 'User no longer exists');
    }

    req.user = user;
    next();
  } catch (error) {
    next(error instanceof HttpError ? error : new HttpError(401, 'Invalid or expired token'));
  }
};

export const signToken = (user) =>
  jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '24h' });
