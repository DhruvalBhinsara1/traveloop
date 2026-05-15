import React, { ReactNode } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ImageBackground,
  ImageSourcePropType,
  ImageStyle,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

import { colors, layout, radius, shadows, spacing, typography } from '../theme';
import { HapticPressable as Pressable } from './HapticPressable';

export type PhotoCardProps = {
  image: ImageSourcePropType;
  title: string;
  aspectRatio?: number;
  footer?: ReactNode;
  height?: number;
  imageStyle?: StyleProp<ImageStyle>;
  meta?: string;
  onPress?: () => void;
  overline?: string;
  rating?: string | number;
  style?: StyleProp<ViewStyle>;
  subtitle?: string;
  topRight?: ReactNode;
};

export function PhotoCard({
  image,
  title,
  aspectRatio,
  footer,
  height = layout.featuredCardHeight,
  imageStyle,
  meta,
  onPress,
  overline,
  rating,
  style,
  subtitle,
  topRight,
}: PhotoCardProps) {
  const content = (
    <ImageBackground
      source={image}
      resizeMode="cover"
      imageStyle={[styles.image, imageStyle]}
      style={[styles.imageFrame, aspectRatio ? { aspectRatio } : { height }]}
    >
      <View style={styles.topRow}>
        {rating !== undefined ? (
          <View style={styles.rating}>
            <Text style={styles.ratingStar}>*</Text>
            <Text numberOfLines={1} style={styles.ratingText}>
              {rating}
            </Text>
          </View>
        ) : (
          <View />
        )}
        {topRight}
      </View>
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.75)']}
        style={styles.bottomShade}
      />
      <View style={styles.content}>
        <View>
          {meta ? (
            <Text numberOfLines={1} style={styles.meta}>
              {meta}
            </Text>
          ) : null}
          {overline ? (
            <Text numberOfLines={1} style={styles.overline}>
              {overline}
            </Text>
          ) : null}
          <Text numberOfLines={2} style={styles.title}>
            {title}
          </Text>
          {subtitle ? (
            <Text numberOfLines={1} style={styles.subtitle}>
              {subtitle}
            </Text>
          ) : null}
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
      </View>
    </ImageBackground>
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
    overflow: 'hidden',
    ...shadows.card,
  },
  pressed: {
    opacity: 0.93,
    transform: [{ scale: 0.99 }],
  },
  imageFrame: {
    justifyContent: 'flex-end',
    overflow: 'hidden',
    width: '100%',
  },
  image: {
    borderRadius: radius.lg,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: 14,
    position: 'absolute',
    right: 14,
    top: 14,
    zIndex: 2,
  },
  rating: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.30)',
    borderRadius: radius.pill,
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  ratingStar: {
    color: colors.warning,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    lineHeight: typography.lineHeight.xs,
    marginRight: spacing.xs,
  },
  ratingText: {
    color: colors.white,
    fontFamily: typography.fontFamily.label,
    fontSize: 13,
    fontWeight: typography.weight.bold,
    lineHeight: 18,
  },
  bottomShade: {
    bottom: 0,
    height: '50%',
    left: 0,
    position: 'absolute',
    right: 0,
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: spacing.md,
  },
  meta: {
    color: colors.surface,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.xs,
    marginBottom: spacing.xs,
  },
  overline: {
    color: 'rgba(255,255,255,0.86)',
    fontFamily: typography.fontFamily.body,
    fontSize: 11,
    lineHeight: typography.lineHeight.xs,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.surface,
    fontFamily: typography.fontFamily.headingExtraBold,
    fontSize: 22,
    fontWeight: typography.weight.extrabold,
    lineHeight: 28,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.88)',
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    lineHeight: typography.lineHeight.sm,
    marginTop: spacing.xs,
  },
  footer: {
    marginTop: spacing.md,
  },
});
