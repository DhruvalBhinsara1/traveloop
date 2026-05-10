import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { colors, spacing, typography } from '../theme';

export type ProgressBarTone = 'primary' | 'accent' | 'success' | 'warning' | 'danger';

export type ProgressBarProps = {
  value: number;
  danger?: boolean;
  height?: number;
  label?: string;
  max?: number;
  min?: number;
  showValue?: boolean;
  style?: StyleProp<ViewStyle>;
  tone?: ProgressBarTone;
};

const TONES: Record<ProgressBarTone, string> = {
  primary: colors.primary,
  accent: colors.warning,
  success: colors.success,
  warning: colors.warning,
  danger: colors.danger,
};

export function ProgressBar({
  value,
  danger = false,
  height = 9,
  label,
  max = 100,
  min = 0,
  showValue,
  style,
  tone = 'primary',
}: ProgressBarProps) {
  const range = max - min;
  const normalized = range > 0 ? (value - min) / range : 0;
  const percent = Math.min(1, Math.max(0, normalized));
  const percentLabel = `${Math.round(percent * 100)}%`;
  const fillColor = danger ? colors.danger : TONES[tone];

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min, max, now: value, text: percentLabel }}
      style={style}
    >
      {label || showValue ? (
        <View style={styles.header}>
          {label ? (
            <Text numberOfLines={1} style={styles.label}>
              {label}
            </Text>
          ) : (
            <View />
          )}
          {showValue ? <Text style={styles.value}>{percentLabel}</Text> : null}
        </View>
      ) : null}
      <View style={[styles.track, { height, borderRadius: height / 2 }]}>
        <View
          style={[
            styles.fill,
            {
              backgroundColor: fillColor,
              borderRadius: height / 2,
              width: `${percent * 100}%`,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  label: {
    ...typography.bodyMedium,
    flex: 1,
    marginRight: spacing.md,
  },
  value: {
    ...typography.caption,
    fontWeight: typography.weight.bold,
  },
  track: {
    backgroundColor: colors.gray100,
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    height: '100%',
  },
});
