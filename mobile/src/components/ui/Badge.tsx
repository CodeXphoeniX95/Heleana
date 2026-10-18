import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { FontSize, FontWeight, Radius, Spacing } from '@/constants/theme';

// ── Types ─────────────────────────────────────────────────────────────────────

export type BadgeVariant =
  | 'default'
  | 'primary'
  | 'success'
  | 'warning'
  | 'error'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'paid';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

// ── Status → variant map ──────────────────────────────────────────────────────

export function statusToVariant(status: string): BadgeVariant {
  switch (status) {
    case 'pending':  return 'pending';
    case 'approved': return 'approved';
    case 'rejected': return 'rejected';
    case 'paid':     return 'paid';
    default:         return 'default';
  }
}

export function statusLabel(status: string): string {
  switch (status) {
    case 'pending':  return 'En attente';
    case 'approved': return 'Approuvé';
    case 'rejected': return 'Rejeté';
    case 'paid':     return 'Payé';
    default:         return status;
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function Badge({ label, variant = 'default', size = 'sm', style }: BadgeProps) {
  const theme = useTheme();

  const { bg, text } = getVariantColors(variant, theme);

  return (
    <View style={[styles.badge, sizeStyles[size], { backgroundColor: bg }, style]}>
      <Text style={[styles.label, { color: text, fontSize: size === 'sm' ? FontSize.xs : FontSize.sm }]}>
        {label}
      </Text>
    </View>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getVariantColors(
  variant: BadgeVariant,
  theme: ReturnType<typeof useTheme>
): { bg: string; text: string } {
  switch (variant) {
    case 'primary':
      return { bg: theme.primaryLight,  text: theme.primary };
    case 'success':
    case 'approved':
      return { bg: theme.successLight,  text: theme.success };
    case 'warning':
    case 'pending':
      return { bg: theme.warningLight,  text: theme.warning };
    case 'error':
    case 'rejected':
      return { bg: theme.errorLight,    text: theme.error };
    case 'paid':
      return { bg: theme.primaryLight,  text: theme.primary };
    default:
      return { bg: theme.backgroundElement, text: theme.textSecondary };
  }
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: Radius.full,
  },
  label: {
    fontWeight: FontWeight.semibold,
  },
});

const sizeStyles = {
  sm: { paddingHorizontal: Spacing.two, paddingVertical: 2  },
  md: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.one },
};
