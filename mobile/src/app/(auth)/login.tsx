import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/auth.store';
import { Button, Input } from '@/components/ui';
import { FontSize, FontWeight, Palette, Radius, Spacing } from '@/constants/theme';

export default function LoginScreen() {
  const router   = useRouter();
  const login    = useAuthStore((s) => s.login);
  const isLoading= useAuthStore((s) => s.isLoading);

  const [identifier, setIdentifier] = useState(''); // email ou téléphone
  const [password, setPassword]     = useState('');
  const [showPass, setShowPass]     = useState(false);
  const [errors, setErrors]         = useState<{ identifier?: string; password?: string }>({});

  function validate(): boolean {
    const e: typeof errors = {};
    if (!identifier.trim()) e.identifier = 'Email ou téléphone requis';
    if (!password)          e.password   = 'Mot de passe requis';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleLogin() {
    if (!validate()) return;

    const isEmail = identifier.includes('@');
    try {
      await login(
        isEmail
          ? { email: identifier.trim(), password }
          : { phone: identifier.trim(), password }
      );
    } catch (err: any) {
      // Extraire le message quelle que soit la forme de l'erreur
      const message =
        err?.message ??
        err?.error ??
        err?.response?.data?.error ??
        err?.response?.data?.message ??
        JSON.stringify(err) ??
        'Erreur inconnue';
      Alert.alert('Connexion échouée', String(message));
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.appName}>Heleanaf</Text>
            <Text style={styles.tagline}>Votre caisse commune, simplifiée</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.title}>Connexion</Text>

            <Input
              label="Email ou numéro de téléphone"
              placeholder="goyitresor@gmail.com ou +228..."
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
              keyboardType="email-address"
              error={errors.identifier}
              containerStyle={styles.field}
            />

            <Input
              label="Mot de passe"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPass}
              error={errors.password}
              containerStyle={styles.field}
              rightIcon={
                <Text style={styles.showHide}>
                  {showPass ? 'Masquer' : 'Voir'}
                </Text>
              }
              onRightIconPress={() => setShowPass((v) => !v)}
            />

            <Button
              label="Se connecter"
              onPress={handleLogin}
              loading={isLoading}
              fullWidth
              size="lg"
              style={styles.btn}
            />
          </View>

          {/* Register link */}
          <Pressable
            onPress={() => router.push('/(auth)/register')}
            style={styles.linkRow}
            accessibilityRole="link"
          >
            <Text style={styles.linkText}>
              Pas encore de compte ?{' '}
              <Text style={styles.linkAccent}>S'inscrire</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Palette.primary500,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six,
    justifyContent: 'center',
    gap: Spacing.four,
  },
  header: {
    alignItems: 'center',
    paddingTop: Spacing.five,
    paddingBottom: Spacing.three,
    gap: Spacing.one,
  },
  appName: {
    fontSize: FontSize['4xl'],
    fontWeight: FontWeight.extrabold,
    color: Palette.neutral0,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: FontSize.base,
    color: Palette.primary100,
    textAlign: 'center',
  },
  card: {
    backgroundColor: Palette.neutral0,
    borderRadius: Radius.xl,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Palette.primary500,
    marginBottom: Spacing.one,
  },
  field: {
    // gap handled by card
  },
  btn: {
    marginTop: Spacing.one,
  },
  showHide: {
    fontSize: FontSize.sm,
    color: Palette.primary500,
    fontWeight: FontWeight.medium,
  },
  linkRow: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  linkText: {
    fontSize: FontSize.sm,
    color: Palette.primary100,
  },
  linkAccent: {
    fontWeight: FontWeight.semibold,
    color: Palette.neutral0,
    textDecorationLine: 'underline',
  },
});
