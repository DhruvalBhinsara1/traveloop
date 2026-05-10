import { Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

import { colors, radius, shadows, spacing, typography } from '../theme';

export type StatPillTone = 'primary' | 'neutral' | 'success' | 'warning' | 'danger';

export type StatPillProps = {
  label: string;
  value?: string | number;
  icon?: keyof typeof Ionicons.glyphMap | ReactNode;
  onPress?: () => void;
  selected?: boolean;
  style?: StyleProp<ViewStyle>;
  tone?: StatPillTone;
};

const TONES: Record<StatPillTone, { background: string; border: string; text: string }> = {
  primary: { background: colors.primaryLight, border: colors.primaryLight, text: colors.primary },
  neutral: { background: colors.white, border: colors.gray200, text: colors.charcoal },
  success: { background: colors.successSoft, border: colors.successSoft, text: colors.success },
  warning: { background: colors.warningSoft, border: colors.warningSoft, text: colors.warning },
  danger: { background: colors.dangerSoft, border: colors.dangerSoft, text: colors.danger },
};

export function StatPill({
  label,
  value,
  icon,
  onPress,
  selected,
  style,
  tone = 'neutral',
}: StatPillProps) {
  const toneStyle = TONES[tone];
  const iconNode =
    typeof icon === 'string' ? (
      <Ionicons
        name={icon as keyof typeof Ionicons.glyphMap}
        size={18}
        color={selected ? colors.white : toneStyle.text}
      />
    ) : (
      icon
    );

  const content = (
    <>
      {iconNode ? <View style={styles.icon}>{iconNode}</View> : null}
      <View>
        {value !== undefined ? (
          <Text
            numberOfLines={1}
            style={[styles.value, { color: selected ? colors.white : toneStyle.text }]}
          >
            {value}
          </Text>
        ) : null}
        <Text numberOfLines={1} style={[styles.label, selected && styles.selectedLabel]}>
          {label}
        </Text>
      </View>
    </>
  );

  const pillStyle = [
    styles.pill,
    {
      backgroundColor: selected ? toneStyle.text : toneStyle.background,
      borderColor: selected ? toneStyle.text : toneStyle.border,
    },
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [pillStyle, pressed && styles.pressed]}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={pillStyle}>{content}</View>;
}

const styles = StyleSheet.create({
  pill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: spacing.sm,
    ...shadows.subtle,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  icon: {
    marginRight: spacing.sm,
  },
  value: {
    ...typography.label,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
  },
  label: {
    ...typography.caption,
  },
  selectedLabel: {
    color: colors.white,
  },
});
