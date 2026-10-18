import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { FontSize, FontWeight, Radius, Spacing } from '@/constants/theme';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize    = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
}: ButtonProps) {
  const theme = useTheme();
  const isDisabled = disabled || loading;

  const containerStyle: ViewStyle[] = [
    styles.base,
    sizeStyles[size],
    fullWidth && styles.fullWidth,
    // Variant background
    variant === 'primary'   && { backgroundColor: theme.primary },
    variant === 'secondary' && { backgroundColor: theme.backgroundElement },
    variant === 'outline'   && { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: theme.primary },
    variant === 'ghost'     && { backgroundColor: 'transparent' },
    variant === 'danger'    && { backgroundColor: theme.error },
    isDisabled              && styles.disabled,
    style,
  ].filter(Boolean) as ViewStyle[];

  const labelColor: string =
    variant === 'primary'   ? theme.textOnPrimary :
    variant === 'secondary' ? theme.text :
    variant === 'outline'   ? theme.primary :
    variant === 'ghost'     ? theme.primary :
    variant === 'danger'    ? theme.textOnPrimary :
    theme.textOnPrimary;

  const textStyle: TextStyle = {
    ...labelSizeStyles[size],
    color: labelColor,
    fontWeight: FontWeight.semibold,
  };

  return (
    <Pressable
      style={({ pressed }) => [
        ...containerStyle,
        pressed && !isDisabled && styles.pressed,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' || variant === 'ghost' ? theme.primary : theme.textOnPrimary}
        />
      ) : (
        <Text style={textStyle}>{label}</Text>
      )}
    </Pressable>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    flexDirection: 'row',
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
});

const sizeStyles: Record<ButtonSize, ViewStyle> = {
  sm: { height: 36, paddingHorizontal: Spacing.three },
  md: { height: 48, paddingHorizontal: Spacing.four },
  lg: { height: 56, paddingHorizontal: Spacing.five },
};

const labelSizeStyles: Record<ButtonSize, TextStyle> = {
  sm: { fontSize: FontSize.sm },
  md: { fontSize: FontSize.base },
  lg: { fontSize: FontSize.md },
};
