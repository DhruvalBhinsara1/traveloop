import React, { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

import { colors, radius, shadows, spacing, typography } from '../theme';

export type BottomSheetSize = 'content' | 'medium' | 'full';

export type BottomSheetModalProps = {
  visible: boolean;
  children: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  dismissOnBackdropPress?: boolean;
  footer?: ReactNode;
  onClose: () => void;
  showHandle?: boolean;
  size?: BottomSheetSize;
  style?: StyleProp<ViewStyle>;
  title?: string;
};

const SIZE_STYLES: Record<BottomSheetSize, ViewStyle> = {
  content: { maxHeight: '82%' },
  medium: { minHeight: '46%', maxHeight: '82%' },
  full: { minHeight: '92%', maxHeight: '92%' },
};

export function BottomSheetModal({
  visible,
  children,
  contentStyle,
  dismissOnBackdropPress = true,
  footer,
  onClose,
  showHandle = true,
  size = 'content',
  style,
  title,
}: BottomSheetModalProps) {
  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={styles.root}>
        <Pressable
          accessibilityLabel="Close modal"
          accessibilityRole="button"
          disabled={!dismissOnBackdropPress}
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          pointerEvents="box-none"
          style={styles.keyboardLayer}
        >
          <SafeAreaView style={[styles.sheet, SIZE_STYLES[size], style]}>
            {showHandle ? <View style={styles.handle} /> : null}
            {title ? (
              <Text numberOfLines={2} style={styles.title}>
                {title}
              </Text>
            ) : null}
            <View style={[styles.content, contentStyle]}>{children}</View>
            {footer ? <View style={styles.footer}>{footer}</View> : null}
          </SafeAreaView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.overlay,
    flex: 1,
    justifyContent: 'flex-end',
  },
  keyboardLayer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: 20,
    paddingTop: 12,
    ...shadows.md,
  },
  handle: {
    alignSelf: 'center',
    backgroundColor: colors.gray200,
    borderRadius: radius.pill,
    height: 4,
    marginBottom: 20,
    width: 40,
  },
  title: {
    ...typography.h2,
    marginBottom: spacing.md,
  },
  content: {
    paddingBottom: 20,
  },
  footer: {
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingBottom: spacing.lg,
    paddingTop: spacing.lg,
  },
});
