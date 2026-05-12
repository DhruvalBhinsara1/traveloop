import type {
  CreateActivityPayload,
  CreateStopPayload,
  CreateTripPayload,
  LoginPayload,
  RegisterPayload,
  Trip
} from '../api/types';

export const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const normalizeUsername = (username: string) => username.trim().toLowerCase();

export const validateUsername = (username: string) => /^[a-z0-9_]{3,24}$/.test(normalizeUsername(username));

export const requireText = (value: string, message: string) => {
  if (!value.trim()) {
    return message;
  }
  return undefined;
};

export const validateTripDates = (startDate: string, endDate: string) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 'Use valid dates';
  }
  if (start > end) {
    return 'Start date must be before end date';
  }
  return undefined;
};

export type ValidationErrors<T extends string = string> = Partial<Record<T, string>>;

export const parseOptionalMoney = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed.replace(/[$,\s]/g, ''));
  return Number.isFinite(parsed) ? parsed : Number.NaN;
};

export const validateLogin = (payload: LoginPayload) => {
  const errors: ValidationErrors<keyof LoginPayload> = {};
  if (!validateEmail(payload.email.trim())) errors.email = 'Enter a valid email address.';
  if (!payload.password) errors.password = 'Password is required.';
  return errors;
};

export const validateRegister = (payload: RegisterPayload) => {
  const errors: ValidationErrors<keyof RegisterPayload> = {};
  if (!payload.name.trim()) errors.name = 'Name is required.';
  if (!validateUsername(payload.username)) errors.username = 'Use 3-24 letters, numbers, or underscores.';
  if (!validateEmail(payload.email.trim())) errors.email = 'Enter a valid email address.';
  if (payload.password.length < 8) errors.password = 'Password must be at least 8 characters.';
  return errors;
};

export const validateTrip = (payload: CreateTripPayload) => {
  const errors: ValidationErrors<'title' | 'startDate' | 'endDate' | 'budget'> = {};
  const dateError = validateTripDates(payload.startDate, payload.endDate);

  if (!payload.title.trim()) errors.title = 'Trip name is required.';
  if (payload.title.trim().length > 60) errors.title = 'Trip name must be 60 characters or fewer.';
  if (dateError) errors.endDate = dateError;
  if (payload.budget !== undefined && payload.budget !== null && (!Number.isFinite(payload.budget) || payload.budget < 0)) {
    errors.budget = 'Budget must be a positive number.';
  }

  return errors;
};

export const validateStop = (payload: CreateStopPayload, trip: Pick<Trip, 'startDate' | 'endDate'>) => {
  const errors: ValidationErrors<'cityName' | 'country' | 'arrivalDate' | 'departDate'> = {};
  const dateError = validateTripDates(payload.arrivalDate, payload.departDate);
  const arrival = new Date(payload.arrivalDate);
  const depart = new Date(payload.departDate);
  const tripStart = new Date(trip.startDate);
  const tripEnd = new Date(trip.endDate);

  if (!payload.cityName.trim()) errors.cityName = 'City is required.';
  if (!payload.country.trim()) errors.country = 'Country is required.';
  if (dateError) errors.departDate = dateError;
  if (!dateError && (arrival < tripStart || arrival > tripEnd)) errors.arrivalDate = 'Arrival must be within the trip dates.';
  if (!dateError && (depart < tripStart || depart > tripEnd)) errors.departDate = 'Departure must be within the trip dates.';

  return errors;
};

export const validateActivity = (payload: CreateActivityPayload) => {
  const errors: ValidationErrors<'name' | 'category' | 'cost' | 'duration'> = {};

  if (!payload.name.trim()) errors.name = 'Activity name is required.';
  if (!payload.category) errors.category = 'Choose a category.';
  if (!Number.isFinite(payload.cost) || payload.cost < 0) errors.cost = 'Cost must be zero or more.';
  if (payload.duration !== undefined && (!Number.isFinite(payload.duration) || payload.duration < 0)) {
    errors.duration = 'Duration must be zero or more.';
  }

  return errors;
};

export const validateChecklistItem = (label: string, category: string) => {
  const errors: ValidationErrors<'label' | 'category'> = {};
  if (!label.trim()) errors.label = 'Item name is required.';
  if (!category) errors.category = 'Choose a category.';
  return errors;
};

export const hasErrors = (errors: ValidationErrors) => Object.values(errors).some(Boolean);
