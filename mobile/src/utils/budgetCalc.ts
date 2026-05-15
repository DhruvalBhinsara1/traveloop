import { Ionicons } from '@expo/vector-icons';

import { Activity, ActivityCategory, BillExpense, Stop, Trip } from '../api/types';

type CostedStop = { activities?: Array<{ cost?: number | null }> };
type CategorizedStop = { activities?: Array<{ category: ActivityCategory; cost?: number | null }> };

export const CATEGORY_LABELS: Record<ActivityCategory, string> = {
  sightseeing: 'Sightseeing',
  food: 'Food',
  adventure: 'Adventure',
  transport: 'Transport',
  stay: 'Stay',
  other: 'Other'
};

export const CATEGORY_ICONS: Record<ActivityCategory, keyof typeof Ionicons.glyphMap> = {
  sightseeing: 'sparkles-outline',
  food: 'restaurant-outline',
  adventure: 'trail-sign-outline',
  transport: 'bus-outline',
  stay: 'bed-outline',
  other: 'ellipsis-horizontal-circle-outline'
};

export const CATEGORY_COLORS: Record<ActivityCategory, string> = {
  sightseeing: '#1B7FF0',
  food: '#F59E0B',
  adventure: '#10B981',
  transport: '#4B5563',
  stay: '#EF4444',
  other: '#9CA3AF'
};

export const ACTIVITY_CATEGORIES = Object.keys(CATEGORY_LABELS) as ActivityCategory[];

export const calcTotal = (stops: CostedStop[] = []) =>
  stops.flatMap((stop) => stop.activities ?? []).reduce((sum, activity) => sum + Number(activity.cost || 0), 0);

export const calcSharedExpenseTotal = (expenses: BillExpense[] = []) =>
  expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);

export const calcTripTotal = (trip?: Trip | null) =>
  calcTotal(trip?.stops ?? []) + calcSharedExpenseTotal(trip?.billExpenses ?? []);

export const calcByCategory = (stops: CategorizedStop[] = []) =>
  stops.flatMap((stop) => stop.activities ?? []).reduce<Record<ActivityCategory, number>>((acc, activity) => {
    acc[activity.category] = (acc[activity.category] || 0) + Number(activity.cost || 0);
    return acc;
  }, {} as Record<ActivityCategory, number>);

export const calcStopSubtotal = (stop: Stop) =>
  (stop.activities ?? []).reduce((sum, activity) => sum + Number(activity.cost || 0), 0);

export const calcBudgetStats = (trip?: Trip | null) => {
  const total = calcTripTotal(trip);
  const budget = Number(trip?.budget ?? 0);
  const percentage = budget > 0 ? Math.min(100, Math.round((total / budget) * 100)) : 0;

  return {
    total,
    budget,
    remaining: Math.max(0, budget - total),
    percentage,
    isOverBudget: budget > 0 && total > budget,
    byCategory: calcByCategory(trip?.stops ?? [])
  };
};

export const formatMoney = (value?: number | null, currency = 'USD') =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0
  }).format(Number(value ?? 0));

export const sortActivitiesByDate = (activities: Activity[] = []) =>
  [...activities].sort((a, b) => {
    if (!a.date && !b.date) return a.id - b.id;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });
