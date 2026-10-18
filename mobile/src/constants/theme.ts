import { Platform } from 'react-native';

// ── Palette Heleana ───────────────────────────────────────────────────────────
// Bleu marine profond (inspire confiance, stabilité)  → primaire
// Vert émeraude                                        → succès / solde positif
// Ambre                                                → avertissement / en attente
// Rouge corail                                         → erreur / rejet

export const Palette = {
  // Primaire
  primary50:  '#E8F0FE',
  primary100: '#C5D5F8',
  primary200: '#9DB9F2',
  primary300: '#6F99EB',
  primary400: '#4A7EE4',
  primary500: '#1B4F72',  // couleur principale Heleana
  primary600: '#174369',
  primary700: '#12355D',
  primary800: '#0D2851',
  primary900: '#061B3F',

  // Succès / Cotisation
  success50:  '#E8F8F5',
  success100: '#C9EDE6',
  success200: '#A3E0D4',
  success300: '#74CFC0',
  success400: '#4DBFAD',
  success500: '#1ABC9C',
  success600: '#17A589',
  success700: '#138D75',
  success800: '#0E7462',
  success900: '#085C4D',

  // Avertissement / En attente
  warning50:  '#FEF9E7',
  warning100: '#FCF3CF',
  warning200: '#F9E79F',
  warning300: '#F7DC6F',
  warning400: '#F4D03F',
  warning500: '#F1C40F',
  warning600: '#D4AC0D',
  warning700: '#B7950B',
  warning800: '#9A7D0A',
  warning900: '#7D6608',

  // Erreur / Rejet
  error50:  '#FDEDEC',
  error100: '#FADBD8',
  error200: '#F5B7B1',
  error300: '#F1948A',
  error400: '#EC7063',
  error500: '#E74C3C',
  error600: '#CB4335',
  error700: '#B03A2E',
  error800: '#943126',
  error900: '#78281F',

  // Neutres
  neutral0:   '#FFFFFF',
  neutral50:  '#F8F9FA',
  neutral100: '#F1F2F4',
  neutral200: '#E4E6EA',
  neutral300: '#C8CDD5',
  neutral400: '#9EA6B4',
  neutral500: '#6B7585',
  neutral600: '#4A5568',
  neutral700: '#2D3748',
  neutral800: '#1A202C',
  neutral900: '#0D1117',
} as const;

// ── Thème clair (mode par défaut) ─────────────────────────────────────────────
export const Colors = {
  light: {
    // Fonds
    background:         Palette.neutral0,
    backgroundElement:  Palette.neutral100,
    backgroundSelected: Palette.primary50,
    backgroundCard:     Palette.neutral0,

    // Textes
    text:          Palette.neutral800,
    textSecondary: Palette.neutral500,
    textMuted:     Palette.neutral400,
    textOnPrimary: Palette.neutral0,

    // Actions
    primary:       Palette.primary500,
    primaryLight:  Palette.primary100,

    // Statuts
    success:       Palette.success500,
    successLight:  Palette.success50,
    warning:       Palette.warning500,
    warningLight:  Palette.warning50,
    error:         Palette.error500,
    errorLight:    Palette.error50,

    // Bordures
    border:        Palette.neutral200,
    borderFocus:   Palette.primary500,

    // Ombres
    shadow:        Palette.neutral800,

    // Tab bar
    tabActive:     Palette.primary500,
    tabInactive:   Palette.neutral400,
  },

  // Mode sombre (conservé mais non prioritaire pour MVP)
  dark: {
    background:         Palette.neutral900,
    backgroundElement:  Palette.neutral800,
    backgroundSelected: Palette.primary900,
    backgroundCard:     Palette.neutral800,

    text:          Palette.neutral50,
    textSecondary: Palette.neutral400,
    textMuted:     Palette.neutral500,
    textOnPrimary: Palette.neutral0,

    primary:       Palette.primary400,
    primaryLight:  Palette.primary700,

    success:       Palette.success400,
    successLight:  Palette.success900,
    warning:       Palette.warning400,
    warningLight:  Palette.warning900,
    error:         Palette.error400,
    errorLight:    Palette.error900,

    border:        Palette.neutral700,
    borderFocus:   Palette.primary400,

    shadow:        Palette.neutral900,

    tabActive:     Palette.primary400,
    tabInactive:   Palette.neutral500,
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;
export type Theme = typeof Colors.light;

// ── Typographie ───────────────────────────────────────────────────────────────
export const Fonts = Platform.select({
  ios: {
    sans:     'system-ui',
    serif:    'ui-serif',
    rounded:  'ui-rounded',
    mono:     'ui-monospace',
    medium:   'system-ui',
    bold:     'system-ui',
  },
  default: {
    sans:     'normal',
    serif:    'serif',
    rounded:  'normal',
    mono:     'monospace',
    medium:   'normal',
    bold:     'normal',
  },
  web: {
    sans:     'var(--font-display)',
    serif:    'var(--font-serif)',
    rounded:  'var(--font-rounded)',
    mono:     'var(--font-mono)',
    medium:   'var(--font-display)',
    bold:     'var(--font-display)',
  },
});

export const FontSize = {
  xs:   11,
  sm:   13,
  base: 15,
  md:   17,
  lg:   20,
  xl:   24,
  '2xl': 28,
  '3xl': 32,
  '4xl': 40,
} as const;

export const FontWeight = {
  regular: '400' as const,
  medium:  '500' as const,
  semibold:'600' as const,
  bold:    '700' as const,
  extrabold:'800' as const,
};

// ── Espacement ────────────────────────────────────────────────────────────────
export const Spacing = {
  half: 2,
  one:  4,
  two:  8,
  three:16,
  four: 24,
  five: 32,
  six:  48,
  seven:64,
} as const;

// ── Rayons de bordure ─────────────────────────────────────────────────────────
export const Radius = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   24,
  full: 9999,
} as const;

// ── Ombres ────────────────────────────────────────────────────────────────────
export const Shadow = {
  sm: {
    shadowColor: Palette.neutral800,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: Palette.neutral800,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: Palette.neutral800,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
} as const;

// ── Layout ────────────────────────────────────────────────────────────────────
export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 600;
export const HEADER_HEIGHT = 56;
