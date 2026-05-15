import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const runSafely = async (primary: () => Promise<void>, fallback?: () => Promise<void>) => {
  try {
    await primary();
  } catch {
    if (fallback) {
      await fallback().catch(() => undefined);
    }
  }
};

export const playSelectionHaptic = () => {
  if (Platform.OS === 'android') {
    return runSafely(
      () => Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Segment_Frequent_Tick),
      () => Haptics.selectionAsync()
    );
  }

  return runSafely(() => Haptics.selectionAsync());
};

export const playPullTickHaptic = playSelectionHaptic;

export const playPullReadyHaptic = () => {
  if (Platform.OS === 'android') {
    return runSafely(
      () => Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Confirm),
      () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    );
  }

  return runSafely(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
};

export const playLongPressHaptic = () => {
  if (Platform.OS === 'android') {
    return runSafely(
      () => Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Long_Press),
      () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    );
  }

  return runSafely(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
};
