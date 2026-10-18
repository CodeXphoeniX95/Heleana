/**
 * Composant Icon — wraps @expo/vector-icons/Ionicons
 * Usage : <Icon name="wallet" size={24} color={theme.primary} />
 *
 * Toutes les icônes utilisées dans Heleana sont listées ici
 * pour faciliter la maintenance.
 */
import React from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

export type IconName =
  // Navigation / tabs
  | 'home'
  | 'home-outline'
  | 'people'
  | 'people-outline'
  | 'notifications'
  | 'notifications-outline'
  | 'person'
  | 'person-outline'
  | 'time'
  | 'time-outline'
  // Actions
  | 'add'
  | 'add-circle'
  | 'close'
  | 'chevron-forward'
  | 'chevron-back'
  | 'share-social'
  | 'copy'
  | 'search'
  | 'filter'
  | 'refresh'
  // Finance
  | 'wallet'
  | 'wallet-outline'
  | 'cash'
  | 'cash-outline'
  | 'card'
  | 'card-outline'
  | 'trending-up'
  | 'trending-down'
  | 'arrow-up-circle'
  | 'arrow-down-circle'
  | 'checkmark-circle'
  | 'close-circle'
  | 'hourglass'
  | 'banknote'
  // Status
  | 'checkmark'
  | 'checkmark-done'
  | 'alert-circle'
  | 'information-circle'
  | 'shield-checkmark'
  // User
  | 'log-out'
  | 'create-outline'
  | 'camera-outline'
  | 'mail-outline'
  | 'call-outline'
  // Misc
  | 'eye'
  | 'eye-off'
  | 'calendar'
  | 'star'
  | 'settings';

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
}

export function Icon({ name, size = 20, color = '#1B4F72' }: IconProps) {
  return <Ionicons name={name as any} size={size} color={color} />;
}

// ── Icônes spécialisées pour les moyens de paiement ──────────────────────────

export type PaymentIconName = 'cash' | 'mobile' | 'bank' | 'card';

interface PaymentIconProps {
  method: string;
  size?: number;
  color?: string;
}

export function PaymentIcon({ method, size = 18, color }: PaymentIconProps) {
  const map: Record<string, IconName> = {
    cash:   'cash',
    tmoney: 'phone-portrait' as any,
    flooz:  'phone-portrait' as any,
    bank:   'card',
  };
  const iconName = map[method] ?? 'cash';
  return <Ionicons name={iconName as any} size={size} color={color ?? '#6B7585'} />;
}
