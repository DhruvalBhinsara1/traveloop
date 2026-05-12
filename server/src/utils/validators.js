import { HttpError, parseDate, requireFields } from './http.js';

export const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const normalizeUsername = (username) => String(username ?? '').trim().toLowerCase();

export const isValidUsername = (username) => /^[a-z0-9_]{3,24}$/.test(normalizeUsername(username));

export const validateUsername = (username) => {
  const normalized = normalizeUsername(username);

  if (!isValidUsername(normalized)) {
    throw new HttpError(400, 'Username must be 3-24 characters using letters, numbers, or underscores');
  }

  return normalized;
};

export const validateLoginIdentifier = (identifier) => {
  const normalized = String(identifier ?? '').trim().toLowerCase();

  if (!normalized) {
    throw new HttpError(400, 'Email or username is required');
  }

  if (normalized.includes('@')) {
    if (!validateEmail(normalized)) {
      throw new HttpError(400, 'Enter a valid email or username');
    }
    return { type: 'email', value: normalized };
  }

  if (!isValidUsername(normalized)) {
    throw new HttpError(400, 'Enter a valid email or username');
  }

  return { type: 'username', value: normalized };
};

export const validateAuth = ({ name, username, email, identifier, password }, mode = 'register') => {
  if (mode === 'login') {
    requireFields({ identifier, password }, ['identifier', 'password']);
    validateLoginIdentifier(identifier);

    if (String(password).length < 8) {
      throw new HttpError(400, 'Password must be at least 8 characters');
    }
    return;
  }

  requireFields(
    { email, password, name, username },
    ['name', 'username', 'email', 'password']
  );

  if (!validateEmail(email)) {
    throw new HttpError(400, 'Email must be valid');
  }

  validateUsername(username);

  if (String(password).length < 8) {
    throw new HttpError(400, 'Password must be at least 8 characters');
  }
};

export const validateTrip = ({ title, startDate, endDate, budget }) => {
  requireFields({ title, startDate, endDate }, ['title', 'startDate', 'endDate']);

  if (String(title).trim().length > 60) {
    throw new HttpError(400, 'Trip title must be 60 characters or fewer');
  }

  const start = parseDate(startDate, 'startDate');
  const end = parseDate(endDate, 'endDate');

  if (start > end) {
    throw new HttpError(400, 'Trip start date must be before or equal to end date');
  }

  if (budget !== undefined && budget !== null && Number(budget) < 0) {
    throw new HttpError(400, 'Budget must be non-negative');
  }

  return { start, end };
};

export const validateStop = ({ cityName, country, arrivalDate, departDate }, trip) => {
  requireFields({ cityName, country, arrivalDate, departDate }, ['cityName', 'country', 'arrivalDate', 'departDate']);
  const arrival = parseDate(arrivalDate, 'arrivalDate');
  const depart = parseDate(departDate, 'departDate');

  if (arrival > depart) {
    throw new HttpError(400, 'Arrival date must be before or equal to departure date');
  }

  if (arrival < trip.startDate || depart > trip.endDate) {
    throw new HttpError(400, 'Stop dates must fit within the trip date range');
  }

  return { arrival, depart };
};

export const validateActivity = ({ name, category, cost }) => {
  requireFields({ name, category }, ['name', 'category']);

  if (cost !== undefined && cost !== null && Number(cost) < 0) {
    throw new HttpError(400, 'Activity cost must be non-negative');
  }
};

export const validateChecklistItem = ({ label, category }) => {
  requireFields({ label, category }, ['label', 'category']);
};
