import React from 'react';
import { Text, TextStyle } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { FontSize, FontWeight } from '@/constants/theme';

interface AmountTextProps {
  amount: number | string;
  currency?: string;
  positive?: boolean;   // forcer la couleur succès
  negative?: boolean;   // forcer la couleur erreur
  large?: boolean;
  style?: TextStyle;
}

/** Formate un montant en FCFA avec séparateurs de milliers */
export function formatAmount(amount: number | string, currency = 'FCFA'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return `0 ${currency}`;
  return `${num.toLocaleString('fr-FR')} ${currency}`;
}

export function AmountText({
  amount,
  currency = 'FCFA',
  positive,
  negative,
  large,
  style,
}: AmountTextProps) {
  const theme = useTheme();
  const color = positive
    ? theme.success
    : negative
    ? theme.error
    : theme.text;

  return (
    <Text
      style={[
        {
          color,
          fontSize: large ? FontSize.xl : FontSize.base,
          fontWeight: FontWeight.bold,
        },
        style,
      ]}
    >
      {formatAmount(amount, currency)}
    </Text>
  );
}
