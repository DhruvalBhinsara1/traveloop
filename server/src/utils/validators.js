import { HttpError, parseDate, requireFields } from './http.js';

export const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const normalizeUsername = (username) => String(username ?? '').trim().toLowerCase();

export const validateUsername = (username) => {
  const normalized = normalizeUsername(username);

  if (!/^[a-z0-9_]{3,24}$/.test(normalized)) {
    throw new HttpError(400, 'Username must be 3-24 characters using letters, numbers, or underscores');
  }

  return normalized;
};

export const validateAuth = ({ name, username, email, password }, mode = 'register') => {
  requireFields(
    { email, password, ...(mode === 'register' ? { name, username } : {}) },
    mode === 'register' ? ['name', 'username', 'email', 'password'] : ['email', 'password']
  );

  if (!validateEmail(email)) {
    throw new HttpError(400, 'Email must be valid');
  }

  if (mode === 'register') {
    validateUsername(username);
  }

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
