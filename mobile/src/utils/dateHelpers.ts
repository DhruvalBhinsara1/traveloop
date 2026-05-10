export const toDate = (value: string | Date) => (value instanceof Date ? value : new Date(value));

export const formatShortDate = (value: string | Date) =>
  toDate(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric'
  });

export const formatDateRange = (start: string | Date, end: string | Date) => `${formatShortDate(start)} - ${formatShortDate(end)}`;

export const nightsBetween = (start: string | Date, end: string | Date) => {
  const ms = toDate(end).getTime() - toDate(start).getTime();
  return Math.max(1, Math.round(ms / 86400000));
};

export const isUpcoming = (start: string | Date) => toDate(start).getTime() >= Date.now();

export const todayIso = () => new Date().toISOString().slice(0, 10);

export const toIsoDate = (value: Date) => {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const date = `${value.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${date}`;
};

export const formatDate = (value?: string | Date | null, includeYear = false) => {
  if (!value) return 'TBD';
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return 'TBD';

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: includeYear ? 'numeric' : undefined
  });
};

export const getTripDays = (start?: string | Date | null, end?: string | Date | null) => {
  if (!start || !end) return 0;
  const ms = toDate(end).getTime() - toDate(start).getTime();
  if (Number.isNaN(ms)) return 0;
  return Math.max(1, Math.round(ms / 86400000) + 1);
};

export const getNights = (start?: string | Date | null, end?: string | Date | null) => {
  if (!start || !end) return 0;
  const ms = toDate(end).getTime() - toDate(start).getTime();
  if (Number.isNaN(ms)) return 0;
  return Math.max(0, Math.round(ms / 86400000));
};

export const isUpcomingTrip = (trip: { startDate: string }) => isUpcoming(trip.startDate);

export const isPastTrip = (trip: { endDate: string }) => toDate(trip.endDate).getTime() < Date.now();

export const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

export const minutesAgoLabel = (date: Date | null) => {
  if (!date) return 'Not saved yet';
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return 'Saved just now';
  if (minutes === 1) return 'Saved 1 min ago';
  return `Saved ${minutes} min ago`;
};
