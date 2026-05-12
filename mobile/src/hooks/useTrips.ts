import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { getErrorMessage } from '../api/client';
import { tripsApi } from '../api/trips';
import { Trip, TripInput } from '../api/types';
import { useFocusedAutoRefresh } from './useFocusedAutoRefresh';

type UseTripsOptions = {
  autoRefresh?: boolean;
  refreshIntervalMs?: number;
};

type RefreshOptions = {
  silent?: boolean;
};

export function useTrips({ autoRefresh = false, refreshIntervalMs = 10000 }: UseTripsOptions = {}) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef<Promise<void> | null>(null);

  const refresh = useCallback(async ({ silent = false }: RefreshOptions = {}) => {
    if (requestRef.current) return requestRef.current;

    if (!silent) setRefreshing(true);

    const request = tripsApi
      .list()
      .then((nextTrips) => {
        setTrips(nextTrips);
        setError(null);
      })
      .catch((err) => {
        if (!silent) setError(getErrorMessage(err));
      })
      .finally(() => {
        setLoading(false);
        if (!silent) setRefreshing(false);
        requestRef.current = null;
      });

    requestRef.current = request;
    return request;
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useFocusedAutoRefresh(() => refresh({ silent: true }), {
    enabled: autoRefresh,
    intervalMs: refreshIntervalMs
  });

  const createTrip = useCallback(
    async (payload: TripInput) => {
      const trip = await tripsApi.create(payload);
      await refresh();
      return trip;
    },
    [refresh]
  );

  const deleteTrip = useCallback(
    async (id: number) => {
      await tripsApi.remove(id);
      await refresh();
    },
    [refresh]
  );

  const stats = useMemo(() => {
    const countries = new Set(trips.flatMap((trip) => trip.stops.map((stop) => stop.country.trim().toLowerCase()).filter(Boolean)));
    const today = Date.now();

    return {
      totalTrips: trips.length,
      countries: countries.size,
      upcoming: trips.filter((trip) => new Date(trip.startDate).getTime() >= today).length
    };
  }, [trips]);

  return { trips, loading, refreshing, error, refresh, loadTrips: refresh, stats, createTrip, deleteTrip };
}
