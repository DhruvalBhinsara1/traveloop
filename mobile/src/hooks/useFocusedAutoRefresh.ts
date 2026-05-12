import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';

type AutoRefreshOptions = {
  enabled?: boolean;
  intervalMs?: number;
};

const DEFAULT_REFRESH_INTERVAL_MS = 10000;
const MIN_REFRESH_INTERVAL_MS = 5000;

export function useFocusedAutoRefresh(
  refresh: () => Promise<void> | void,
  { enabled = true, intervalMs = DEFAULT_REFRESH_INTERVAL_MS }: AutoRefreshOptions = {}
) {
  const refreshRef = useRef(refresh);
  const safeIntervalMs = Math.max(intervalMs, MIN_REFRESH_INTERVAL_MS);

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      if (!enabled) return undefined;

      const timer = setInterval(() => {
        if (AppState.currentState !== 'active') return;
        void refreshRef.current();
      }, safeIntervalMs);

      return () => clearInterval(timer);
    }, [enabled, safeIntervalMs])
  );
}
