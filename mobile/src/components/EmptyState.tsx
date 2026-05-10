import { ReactNode } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  Image,
  ImageSourcePropType,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

import { colors, radius, spacing, typography } from '../theme';
import { PrimaryButton } from './PrimaryButton';
import { SecondaryButton } from './SecondaryButton';

export type EmptyStateProps = {
  title: string;
  action?: string;
  actionLabel?: string;
  body?: string;
  icon?: ReactNode;
  image?: ImageSourcePropType;
  message?: string;
  onAction?: () => void;
  onSecondaryAction?: () => void;
  secondaryActionLabel?: string;
  style?: StyleProp<ViewStyle>;
};

export function EmptyState({
  title,
  action,
  actionLabel,
  body,
  icon,
  image,
  message,
  onAction,
  onSecondaryAction,
  secondaryActionLabel,
  style,
}: EmptyStateProps) {
  const primaryLabel = actionLabel ?? action;
  const supportingText = message ?? body;

  return (
    <View style={[styles.container, style]}>
      {image ? <Image source={image} resizeMode="cover" style={styles.image} /> : null}
      {!image && icon ? <View style={styles.icon}>{icon}</View> : null}
      {!image && !icon ? (
        <View style={styles.icon}>
          <Ionicons name="airplane-outline" size={42} color={colors.primary} />
        </View>
      ) : null}
      <Text style={styles.title}>{title}</Text>
      {supportingText ? <Text style={styles.message}>{supportingText}</Text> : null}
      {primaryLabel && onAction ? (
        <PrimaryButton fullWidth title={primaryLabel} onPress={onAction} style={styles.action} />
      ) : null}
      {secondaryActionLabel && onSecondaryAction ? (
        <SecondaryButton
          fullWidth
          title={secondaryActionLabel}
          onPress={onSecondaryAction}
          style={styles.secondaryAction}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xxl,
  },
  image: {
    borderRadius: radius.lg,
    height: 148,
    marginBottom: spacing.lg,
    width: 216,
  },
  icon: {
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: radius.pill,
    height: 72,
    justifyContent: 'center',
    marginBottom: spacing.lg,
    width: 72,
  },
  title: {
    ...typography.h2,
    textAlign: 'center',
  },
  message: {
    ...typography.body,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  action: {
    marginTop: spacing.lg,
  },
  secondaryAction: {
    marginTop: spacing.sm,
  },
});
