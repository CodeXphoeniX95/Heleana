import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { FontSize, FontWeight, Radius, Spacing } from '@/constants/theme';

// ── Types ─────────────────────────────────────────────────────────────────────

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function Input({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  style,
  ...props
}: InputProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? theme.error
    : focused
    ? theme.borderFocus
    : theme.border;

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label ? (
        <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
      ) : null}

      <View
        style={[
          styles.inputRow,
          {
            borderColor,
            backgroundColor: theme.backgroundElement,
          },
        ]}
      >
        {leftIcon ? <View style={styles.iconLeft}>{leftIcon}</View> : null}

        <TextInput
          style={[
            styles.input,
            { color: theme.text },
            leftIcon ? styles.inputWithLeftIcon : undefined,
            rightIcon ? styles.inputWithRightIcon : undefined,
            style,
          ]}
          placeholderTextColor={theme.textMuted}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          accessibilityLabel={label}
          {...props}
        />

        {rightIcon ? (
          onRightIconPress ? (
            <Pressable onPress={onRightIconPress} style={styles.iconRight}>
              {rightIcon}
            </Pressable>
          ) : (
            <View style={styles.iconRight}>{rightIcon}</View>
          )
        ) : null}
      </View>

      {error ? (
        <Text style={[styles.hint, { color: theme.error }]}>{error}</Text>
      ) : hint ? (
        <Text style={[styles.hint, { color: theme.textMuted }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.one,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    marginBottom: 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    height: '100%',
    paddingHorizontal: Spacing.three,
    fontSize: FontSize.base,
  },
  inputWithLeftIcon: {
    paddingLeft: Spacing.one,
  },
  inputWithRightIcon: {
    paddingRight: Spacing.one,
  },
  iconLeft: {
    paddingLeft: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconRight: {
    paddingRight: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
});
