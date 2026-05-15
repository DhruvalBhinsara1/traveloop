import React, { ReactNode } from 'react';
import {
  ActivityIndicator,
  PressableProps,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';

import { colors, layout, radius, shadows, spacing, typography } from '../theme';
import { HapticPressable as Pressable } from './HapticPressable';

export type ButtonSize = 'sm' | 'md' | 'lg';
export type ButtonTone = 'primary' | 'secondary';

export type AppButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  title: string;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

type ButtonBaseProps = AppButtonProps & {
  tone: ButtonTone;
};

const SIZE_STYLES: Record<
  ButtonSize,
  { container: ViewStyle; label: TextStyle; spinner: number | 'small' }
> = {
  sm: {
    container: { minHeight: layout.minTouchTarget, paddingHorizontal: spacing.lg },
    label: { fontSize: typography.size.sm, lineHeight: typography.lineHeight.sm },
    spinner: 'small',
  },
  md: {
    container: { minHeight: 50, paddingHorizontal: spacing.xl },
    label: { fontSize: typography.size.md, lineHeight: typography.lineHeight.md },
    spinner: 'small',
  },
  lg: {
    container: { minHeight: 56, paddingHorizontal: spacing.xxl },
    label: { fontSize: typography.size.lg, lineHeight: typography.lineHeight.lg },
    spinner: 'small',
  },
};

const TONE_STYLES: Record<
  ButtonTone,
  {
    container: ViewStyle;
    pressed: ViewStyle;
    disabled: ViewStyle;
    label: TextStyle;
    disabledLabel: TextStyle;
    spinnerColor: string;
  }
> = {
  primary: {
    container: { backgroundColor: colors.primary, ...shadows.button },
    pressed: { backgroundColor: colors.primaryPressed },
    disabled: { backgroundColor: colors.disabled },
    label: { color: colors.surface },
    disabledLabel: { color: colors.disabledText },
    spinnerColor: colors.surface,
  },
  secondary: {
    container: {
      backgroundColor: colors.gray100,
    },
    pressed: { backgroundColor: colors.gray200 },
    disabled: { backgroundColor: colors.gray100 },
    label: { color: colors.charcoal },
    disabledLabel: { color: colors.disabledText },
    spinnerColor: colors.primary,
  },
};

export function ButtonBase({
  title,
  tone,
  size = 'md',
  fullWidth,
  loading,
  disabled,
  leftIcon,
  rightIcon,
  style,
  textStyle,
  accessibilityLabel,
  ...pressableProps
}: ButtonBaseProps) {
  const isDisabled = Boolean(disabled || loading);
  const toneStyle = TONE_STYLES[tone];
  const sizeStyle = SIZE_STYLES[size];

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: Boolean(loading) }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        sizeStyle.container,
        toneStyle.container,
        fullWidth && styles.fullWidth,
        pressed && !isDisabled && toneStyle.pressed,
        isDisabled && toneStyle.disabled,
        style,
      ]}
      {...pressableProps}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator
            color={toneStyle.spinnerColor}
            size={sizeStyle.spinner}
            style={styles.leftSlot}
          />
        ) : leftIcon ? (
          <View style={styles.leftSlot}>{leftIcon}</View>
        ) : null}
        <Text
          numberOfLines={1}
          style={[
            styles.label,
            sizeStyle.label,
            toneStyle.label,
            isDisabled && toneStyle.disabledLabel,
            textStyle,
          ]}
        >
          {title}
        </Text>
        {!loading && rightIcon ? <View style={styles.rightSlot}>{rightIcon}</View> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: radius.pill,
    justifyContent: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  content: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  label: {
    fontFamily: typography.fontFamily.label,
    fontWeight: typography.weight.bold,
    textAlign: 'center',
  },
  leftSlot: {
    marginRight: spacing.sm,
  },
  rightSlot: {
    marginLeft: spacing.sm,
  },
});
