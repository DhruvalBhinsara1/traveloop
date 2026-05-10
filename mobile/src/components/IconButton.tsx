import React, { ReactNode } from 'react';
import {
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

import { colors, layout, radius, shadows, spacing, typography } from '../theme';

export type IconButtonVariant = 'white' | 'primary' | 'soft' | 'ghost';
export type IconButtonTone = 'primary' | 'neutral' | 'accent';
export type IconButtonSize = 'sm' | 'md' | 'lg';

export type IconButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  icon: ReactNode;
  label: string;
  badge?: string | number;
  size?: IconButtonSize;
  tone?: IconButtonTone;
  variant?: IconButtonVariant;
  style?: StyleProp<ViewStyle>;
};

const SIZE_STYLES: Record<IconButtonSize, ViewStyle> = {
  sm: { height: 40, width: 40 },
  md: { height: layout.minTouchTarget, width: layout.minTouchTarget },
  lg: { height: 52, width: 52 },
};

const TONES: Record<IconButtonTone, { solid: string; soft: string; text: string }> = {
  primary: { solid: colors.primary, soft: colors.primarySoft, text: colors.primary },
  neutral: { solid: colors.text, soft: colors.surfaceAlt, text: colors.text },
  accent: { solid: colors.accent, soft: colors.accentSoft, text: colors.accent },
};

export function IconButton({
  icon,
  label,
  badge,
  size = 'md',
  tone = 'neutral',
  variant = 'white',
  disabled,
  style,
  ...pressableProps
}: IconButtonProps) {
  const toneValues = TONES[tone];
  const backgroundColor =
    variant === 'primary'
      ? colors.primary
      : variant === 'soft'
        ? toneValues.soft
        : variant === 'ghost'
          ? 'transparent'
          : colors.white;
  const borderColor = variant === 'ghost' ? colors.border : 'transparent';

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        SIZE_STYLES[size],
        { backgroundColor, borderColor },
        variant !== 'ghost' && shadows.subtle,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
      {...pressableProps}
    >
      {icon}
      {badge !== undefined ? (
        <View style={styles.badge}>
          <Text numberOfLines={1} style={styles.badgeText}>
            {badge}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    minHeight: layout.minTouchTarget,
    minWidth: layout.minTouchTarget,
  },
  pressed: {
    opacity: 0.76,
  },
  disabled: {
    opacity: 0.48,
  },
  badge: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderColor: colors.surface,
    borderRadius: radius.pill,
    borderWidth: 2,
    justifyContent: 'center',
    minHeight: 18,
    minWidth: 18,
    paddingHorizontal: spacing.xs,
    position: 'absolute',
    right: -2,
    top: -2,
  },
  badgeText: {
    color: colors.surface,
    fontSize: 10,
    fontWeight: typography.weight.bold,
    lineHeight: 12,
  },
});
