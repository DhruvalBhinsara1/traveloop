import { useCallback, useEffect, useRef } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, RefreshControl, ScrollViewProps } from 'react-native';

import { colors } from '../theme';
import { playPullReadyHaptic, playPullTickHaptic } from '../utils/haptics';

const PULL_DEAD_ZONE = 24;
const PULL_TICK_DISTANCE = 18;
const PULL_READY_DISTANCE = 96;
const MIN_HAPTIC_INTERVAL_MS = 40;

type StagedRefreshOptions = {
  enabled?: boolean;
  indicatorColors?: string[];
  onMomentumScrollEnd?: ScrollViewProps['onMomentumScrollEnd'];
  onRefresh?: () => void | Promise<void>;
  onScroll?: ScrollViewProps['onScroll'];
  progressViewOffset?: number;
  refreshing: boolean;
  tintColor?: string;
};

export function useStagedRefreshControl({
  enabled = true,
  indicatorColors = [colors.primary],
  onMomentumScrollEnd,
  onRefresh,
  onScroll,
  progressViewOffset,
  refreshing,
  tintColor = colors.primary
}: StagedRefreshOptions) {
  const lastHapticAtRef = useRef(0);
  const maxTickIndexRef = useRef(0);
  const readyHapticPlayedRef = useRef(false);
  const refreshLockedRef = useRef(false);
  const canRefresh = enabled && Boolean(onRefresh);

  useEffect(() => {
    if (!refreshing) {
      lastHapticAtRef.current = 0;
      maxTickIndexRef.current = 0;
      readyHapticPlayedRef.current = false;
      refreshLockedRef.current = false;
    }
  }, [refreshing]);

  const handleRefresh = useCallback(() => {
    if (!onRefresh) return;

    refreshLockedRef.current = true;
    maxTickIndexRef.current = 0;
    readyHapticPlayedRef.current = false;
    return onRefresh();
  }, [onRefresh]);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    onScroll?.(event);
    if (!canRefresh || refreshing || refreshLockedRef.current) return;

    const pullDistance = Math.max(0, -event.nativeEvent.contentOffset.y);
    if (pullDistance <= 0) {
      lastHapticAtRef.current = 0;
      maxTickIndexRef.current = 0;
      readyHapticPlayedRef.current = false;
      return;
    }

    const now = Date.now();
    const canPlayHaptic = now - lastHapticAtRef.current >= MIN_HAPTIC_INTERVAL_MS;
    if (!canPlayHaptic) return;

    if (pullDistance >= PULL_READY_DISTANCE && !readyHapticPlayedRef.current) {
      readyHapticPlayedRef.current = true;
      lastHapticAtRef.current = now;
      playPullReadyHaptic();
      return;
    }

    if (pullDistance <= PULL_DEAD_ZONE || readyHapticPlayedRef.current) return;

    const nextTickIndex = Math.floor((pullDistance - PULL_DEAD_ZONE) / PULL_TICK_DISTANCE) + 1;
    if (nextTickIndex > maxTickIndexRef.current) {
      maxTickIndexRef.current = nextTickIndex;
      lastHapticAtRef.current = now;
      playPullTickHaptic();
    }
  }, [canRefresh, onScroll, refreshing]);

  const handleMomentumScrollEnd = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    onMomentumScrollEnd?.(event);
    if (!refreshing) {
      lastHapticAtRef.current = 0;
      maxTickIndexRef.current = 0;
      readyHapticPlayedRef.current = false;
      refreshLockedRef.current = false;
    }
  }, [onMomentumScrollEnd, refreshing]);

  return {
    refreshControl: canRefresh ? (
      <RefreshControl
        colors={indicatorColors}
        progressViewOffset={progressViewOffset}
        refreshing={refreshing}
        tintColor={tintColor}
        onRefresh={handleRefresh}
      />
    ) : undefined,
    onScroll: handleScroll,
    onMomentumScrollEnd: handleMomentumScrollEnd,
    scrollEventThrottle: 16
  };
}
