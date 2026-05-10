import { useMemo } from 'react';

import type { Trip } from '../api/types';
import { calcBudgetStats } from '../utils/budgetCalc';

export const useBudget = (trip?: Trip | null) => useMemo(() => calcBudgetStats(trip), [trip]);
