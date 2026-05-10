import { useCallback, useEffect, useMemo, useState } from 'react';

import { getErrorMessage } from '../api/client';
import { tripsApi } from '../api/trips';
import { Trip, TripInput } from '../api/types';

export function useTrips() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      setTrips(await tripsApi.list());
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

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
