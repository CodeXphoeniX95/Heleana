/**
 * Configuration centrale de l'application Heleana.
 *
 * Pour le développement local : créez un fichier .env à la racine du dossier
 * mobile avec :
 *
 *   EXPO_PUBLIC_API_URL=http://192.168.x.x:3000
 *
 * Pour la production (APK) : l'URL Vercel sera utilisée par défaut.
 */
export const Config = {
  API_URL: process.env.EXPO_PUBLIC_API_URL ?? 'https://heleana-api.vercel.app',
} as const;
