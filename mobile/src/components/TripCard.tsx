import React from 'react';
import {
  Image,
  ImageSourcePropType,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

import { colors, radius, shadows, spacing, typography } from '../theme';
import { HapticPressable as Pressable } from './HapticPressable';
import { ProgressBar } from './ProgressBar';

export type TripCardStatus = 'planning' | 'booked' | 'live' | 'complete';

export type TripCardProps = {
  destination: string;
  dates: string;
  details?: string;
  image?: ImageSourcePropType;
  onPress?: () => void;
  priceLabel?: string;
  progress?: number;
  status?: TripCardStatus;
  style?: StyleProp<ViewStyle>;
  tag?: string;
  travelers?: string;
};

const STATUS_COPY: Record<TripCardStatus, string> = {
  planning: 'Planning',
  booked: 'Booked',
  live: 'Live',
  complete: 'Complete',
};

const STATUS_COLORS: Record<TripCardStatus, { background: string; text: string }> = {
  planning: { background: colors.secondarySoft, text: colors.secondary },
  booked: { background: colors.primarySoft, text: colors.primary },
  live: { background: colors.accentSoft, text: colors.accent },
  complete: { background: colors.successSoft, text: colors.success },
};

export function TripCard({
  destination,
  dates,
  details,
  image,
  onPress,
  priceLabel,
  progress,
  status = 'planning',
  style,
  tag,
  travelers,
}: TripCardProps) {
  const statusColors = STATUS_COLORS[status];
  const content = (
    <>
      {image ? (
        <Image source={image} resizeMode="cover" style={styles.image} />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Text style={styles.placeholderText}>{destination.charAt(0).toUpperCase()}</Text>
        </View>
      )}
      <View style={styles.body}>
        <View style={styles.header}>
          <Text numberOfLines={1} style={styles.destination}>
            {destination}
          </Text>
          <View style={[styles.status, { backgroundColor: statusColors.background }]}>
            <Text numberOfLines={1} style={[styles.statusText, { color: statusColors.text }]}>
              {STATUS_COPY[status]}
            </Text>
          </View>
        </View>
        <Text numberOfLines={1} style={styles.dates}>
          {dates}
        </Text>
        {details ? (
          <Text numberOfLines={2} style={styles.details}>
            {details}
          </Text>
        ) : null}
        <View style={styles.footer}>
          <View style={styles.metaGroup}>
            {travelers ? (
              <Text numberOfLines={1} style={styles.meta}>
                {travelers}
              </Text>
            ) : null}
            {tag ? (
              <Text numberOfLines={1} style={styles.meta}>
                {tag}
              </Text>
            ) : null}
          </View>
          {priceLabel ? (
            <Text numberOfLines={1} style={styles.price}>
              {priceLabel}
            </Text>
          ) : null}
        </View>
        {progress !== undefined ? (
          <ProgressBar value={progress} max={1} style={styles.progress} />
        ) : null}
      </View>
    </>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [styles.card, pressed && styles.pressed, style]}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={[styles.card, style]}>{content}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    flexDirection: 'row',
    minHeight: 148,
    overflow: 'hidden',
    ...shadows.card,
  },
  pressed: {
    opacity: 0.93,
    transform: [{ scale: 0.99 }],
  },
  image: {
    backgroundColor: colors.gray100,
    width: 112,
  },
  imagePlaceholder: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    width: 112,
  },
  placeholderText: {
    color: colors.primary,
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.bold,
    lineHeight: typography.lineHeight.xxl,
  },
  body: {
    flex: 1,
    padding: spacing.md,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  destination: {
    color: colors.text,
    flex: 1,
    fontFamily: typography.fontFamily.headingBold,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    lineHeight: typography.lineHeight.lg,
    marginRight: spacing.sm,
  },
  status: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  statusText: {
    fontSize: typography.size.xs,
    fontFamily: typography.fontFamily.label,
    fontWeight: typography.weight.bold,
    lineHeight: typography.lineHeight.xs,
  },
  dates: {
    color: colors.textMuted,
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.sm,
    marginTop: spacing.xs,
  },
  details: {
    color: colors.textMuted,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    marginTop: spacing.sm,
  },
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  metaGroup: {
    flex: 1,
    marginRight: spacing.md,
  },
  meta: {
    color: colors.textSubtle,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
    lineHeight: typography.lineHeight.xs,
  },
  price: {
    color: colors.text,
    fontFamily: typography.fontFamily.label,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    lineHeight: typography.lineHeight.sm,
  },
  progress: {
    marginTop: spacing.md,
  },
});
