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

export default function RegisterScreen() {
  const router    = useRouter();
  const register  = useAuthStore((s) => s.register);
  const isLoading = useAuthStore((s) => s.isLoading);

  const [name, setName]           = useState('');
  const [email, setEmail]         = useState('');
  const [phone, setPhone]         = useState('');
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [showPass, setShowPass]   = useState(false);

  const [errors, setErrors] = useState<{
    name?: string;
    contact?: string;
    password?: string;
    confirm?: string;
  }>({});

  function validate(): boolean {
    const e: typeof errors = {};
    if (!name.trim() || name.trim().length < 2) e.name = 'Nom requis (2 caractères minimum)';
    if (!email.trim() && !phone.trim())         e.contact = 'Email ou téléphone requis';
    if (!password || password.length < 6)       e.password = 'Mot de passe : 6 caractères minimum';
    if (password !== confirm)                   e.confirm = 'Les mots de passe ne correspondent pas';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleRegister() {
    if (!validate()) return;
    try {
      await register({
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        password,
      });
      // Navigation guard will redirect automatically
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : typeof err === 'object' && err !== null && 'message' in err
        ? String((err as any).message)
        : 'Erreur inconnue';
      Alert.alert('Inscription échouée', message);
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
            <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button">
              <Text style={styles.backText}>← Retour</Text>
            </Pressable>
            <Text style={styles.appName}>Heleanaf</Text>
            <Text style={styles.tagline}>Créez votre compte</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.title}>Inscription</Text>

            <Input
              label="Nom complet"
              placeholder="Jean Dupont"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              error={errors.name}
              containerStyle={styles.field}
            />

            <Input
              label="Email"
              placeholder="jean@exemple.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              error={errors.contact}
              containerStyle={styles.field}
            />

            <Input
              label="Numéro de téléphone (optionnel)"
              placeholder="+228 90 00 00 00"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              hint="Remplissez au moins l'email ou le téléphone"
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
                <Text style={styles.showHide}>{showPass ? 'Masquer' : 'Voir'}</Text>
              }
              onRightIconPress={() => setShowPass((v) => !v)}
            />

            <Input
              label="Confirmer le mot de passe"
              placeholder="••••••••"
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry={!showPass}
              error={errors.confirm}
              containerStyle={styles.field}
            />

            <Button
              label="Créer mon compte"
              onPress={handleRegister}
              loading={isLoading}
              fullWidth
              size="lg"
              style={styles.btn}
            />
          </View>

          {/* Login link */}
          <Pressable
            onPress={() => router.back()}
            style={styles.linkRow}
            accessibilityRole="link"
          >
            <Text style={styles.linkText}>
              Déjà un compte ?{' '}
              <Text style={styles.linkAccent}>Se connecter</Text>
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
    gap: Spacing.four,
  },
  header: {
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three,
    gap: Spacing.one,
  },
  backBtn: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.one,
  },
  backText: {
    color: Palette.primary100,
    fontSize: FontSize.sm,
  },
  appName: {
    fontSize: FontSize['3xl'],
    fontWeight: FontWeight.extrabold,
    color: Palette.neutral0,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: FontSize.base,
    color: Palette.primary100,
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
  field: {},
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
