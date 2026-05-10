import { Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';

import { colors, shadows, typography } from '../theme';

type Props = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  variant?: 'primary' | 'secondary' | 'danger';
  style?: ViewStyle;
};

export function Button({ label, onPress, loading, disabled, icon, variant = 'primary', style }: Props) {
  const isPrimary = variant === 'primary';
  const isDanger = variant === 'danger';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        isPrimary && styles.primary,
        variant === 'secondary' && styles.secondary,
        isDanger && styles.danger,
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
        style
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary || isDanger ? colors.white : colors.primary} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={18} color={isPrimary || isDanger ? colors.white : colors.charcoal} /> : null}
          <Text style={[styles.label, { color: isPrimary || isDanger ? colors.white : colors.charcoal }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

export function IconButton({
  icon,
  onPress,
  variant = 'white',
  children
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  variant?: 'white' | 'primary' | 'soft' | 'danger';
  children?: ReactNode;
}) {
  const backgroundColor =
    variant === 'primary' ? colors.primary : variant === 'danger' ? colors.danger : variant === 'soft' ? colors.gray100 : colors.white;
  const iconColor = variant === 'primary' || variant === 'danger' ? colors.white : colors.charcoal;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.iconButton, { backgroundColor }, pressed && styles.pressed]}>
      {children ?? (icon ? <Ionicons name={icon} size={18} color={iconColor} /> : null)}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: 999,
    paddingHorizontal: 24,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8
  },
  primary: {
    backgroundColor: colors.primary,
    ...shadows.button
  },
  secondary: {
    backgroundColor: colors.gray100
  },
  danger: {
    backgroundColor: colors.danger
  },
  disabled: {
    opacity: 0.55
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.98 }]
  },
  label: {
    ...typography.label
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.subtle
  }
});
