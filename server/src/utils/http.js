export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const asyncHandler = (handler) => async (req, res, next) => {
  try {
    await handler(req, res, next);
  } catch (error) {
    next(error);
  }
};

export const toInt = (value, name = 'id') => {
  if (value === undefined || value === null || (typeof value === 'string' && !value.trim())) {
    throw new HttpError(400, `Invalid ${name}`);
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    throw new HttpError(400, `Invalid ${name}`);
  }
  return parsed;
};

export const requireFields = (body, fields) => {
  const missing = fields.filter((field) => !String(body[field] ?? '').trim());
  if (missing.length) {
    throw new HttpError(400, `Missing required fields: ${missing.join(', ')}`);
  }
};

export const parseDate = (value, field) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new HttpError(400, `${field} must be a valid date`);
  }
  return date;
};

export const sanitizeUser = (user) => ({
  id: user.id,
  name: user.name,
  username: user.username,
  email: user.email,
  avatarUrl: user.avatarUrl,
  createdAt: user.createdAt
});

export const publicUserSelect = {
  id: true,
  name: true,
  username: true,
  avatarUrl: true,
  createdAt: true
};

export const sanitizePublicUser = (user) => ({
  id: user.id,
  name: user.name,
  username: user.username,
  avatarUrl: user.avatarUrl,
  createdAt: user.createdAt
});
