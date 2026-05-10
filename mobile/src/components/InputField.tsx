import { ReactNode, forwardRef, useState } from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';

import { colors, layout, radius, spacing, typography } from '../theme';

export type InputFieldProps = Omit<TextInputProps, 'style'> & {
  label?: string;
  containerStyle?: StyleProp<ViewStyle>;
  error?: string;
  helperText?: string;
  inputContainerStyle?: StyleProp<ViewStyle>;
  leftAccessory?: ReactNode;
  rightAccessory?: ReactNode;
  right?: ReactNode;
  style?: StyleProp<TextStyle>;
};

export const InputField = forwardRef<TextInput, InputFieldProps>(
  (
    {
      label,
      containerStyle,
      editable = true,
      error,
      helperText,
      inputContainerStyle,
      leftAccessory,
      onBlur,
      onFocus,
      placeholderTextColor = colors.gray400,
      right,
      rightAccessory,
      style,
      multiline,
      ...textInputProps
    },
    ref,
  ) => {
    const [focused, setFocused] = useState(false);
    const hasError = Boolean(error);
    const supportingText = error ?? helperText;
    const trailingAccessory = rightAccessory ?? right;

    return (
      <View style={[styles.container, containerStyle]}>
        {label ? (
          <Text numberOfLines={1} style={styles.label}>
            {label}
          </Text>
        ) : null}
        <View
          style={[
            styles.inputContainer,
            multiline && styles.multilineContainer,
            focused && styles.focused,
            hasError && styles.errorBorder,
            !editable && styles.disabled,
            inputContainerStyle,
          ]}
        >
          {leftAccessory ? <View style={styles.leftAccessory}>{leftAccessory}</View> : null}
          <TextInput
            ref={ref}
            accessibilityState={{ disabled: !editable }}
            autoCapitalize="none"
            editable={editable}
            multiline={multiline}
            onBlur={(event) => {
              setFocused(false);
              onBlur?.(event);
            }}
            onFocus={(event) => {
              setFocused(true);
              onFocus?.(event);
            }}
            placeholderTextColor={placeholderTextColor}
            style={[styles.input, multiline && styles.multilineInput, style]}
            {...textInputProps}
          />
          {trailingAccessory ? <View style={styles.rightAccessory}>{trailingAccessory}</View> : null}
        </View>
        {supportingText ? (
          <Text style={[styles.helperText, hasError && styles.errorText]}>{supportingText}</Text>
        ) : null}
      </View>
    );
  },
);

InputField.displayName = 'InputField';

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
  },
  label: {
    ...typography.bodyMedium,
    color: colors.charcoal,
    marginBottom: spacing.sm,
  },
  inputContainer: {
    alignItems: 'center',
    backgroundColor: colors.gray50,
    borderColor: colors.gray100,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 52,
    paddingHorizontal: spacing.md,
  },
  focused: {
    borderColor: colors.primary,
  },
  errorBorder: {
    borderColor: colors.danger,
  },
  disabled: {
    opacity: 0.58,
  },
  input: {
    ...typography.bodyMedium,
    color: colors.charcoal,
    flex: 1,
    minHeight: layout.minTouchTarget,
    paddingVertical: spacing.sm,
  },
  multilineContainer: {
    alignItems: 'flex-start',
    minHeight: 112,
    paddingVertical: spacing.sm,
  },
  multilineInput: {
    minHeight: 92,
    textAlignVertical: 'top',
  },
  leftAccessory: {
    marginRight: spacing.sm,
    paddingTop: spacing.xs,
  },
  rightAccessory: {
    marginLeft: spacing.sm,
    paddingTop: spacing.xs,
  },
  helperText: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  errorText: {
    color: colors.danger,
  },
});
