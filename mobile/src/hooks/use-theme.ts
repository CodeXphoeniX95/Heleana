import { useColorScheme } from 'react-native';
import { Colors, Theme } from '@/constants/theme';

/**
 * Retourne le thème (couleurs) correspondant au mode sombre/clair actuel.
 * Pour le MVP Heleana, on force le mode clair (interface en français, public Togo).
 */
export function useTheme(): Theme {
  // Force light pour le MVP – à retirer si dark mode souhaité plus tard
  return Colors.light;
}

export type { Theme };
