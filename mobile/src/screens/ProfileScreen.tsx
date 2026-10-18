import { useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/auth.store';
import { devicesApi } from '@/lib/api';
import { Button, Card, Input } from '@/components/ui';
import { ScreenHeader } from '@/components/ScreenHeader';
import { FontSize, FontWeight, Palette, Spacing, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

async function registerPushToken(): Promise<string | null> {
  // Détecte si on tourne dans Expo Go
  const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
  if (isExpoGo) {
    Alert.alert(
      'Mode Expo Go',
      'Les notifications push réelles sont actives dans l\'APK final. Veuillez tester depuis votre APK généré.'
    );
    return null;
  }

  try {
    const isRealDevice = Device.isDevice;
    if (!isRealDevice) {
      Alert.alert('Simulateur', 'Les notifications push nécessitent un appareil réel.');
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      Alert.alert(
        'Notifications désactivées',
        'Veuillez autoriser les notifications dans les paramètres de votre appareil.'
      );
      return null;
    }

    let token: string | null = null;
    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      const res = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
      token = res.data;
    } catch {
      try {
        const res = await Notifications.getDevicePushTokenAsync();
        token = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
      } catch (err2) {
        console.warn('Erreur récupération token push:', err2);
      }
    }

    if (!token) {
      Alert.alert('Erreur', 'Impossible de générer le jeton de notification.');
      return null;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('heleana_default', {
        name: 'Heleana',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: Palette.primary500,
      });
    }

    return token;
  } catch (err) {
    Alert.alert('Erreur', (err as Error).message || 'Échec de l\'activation des notifications');
    return null;
  }
}

// ── Profile screen ────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const theme      = useTheme();
  const user       = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const logout     = useAuthStore((s) => s.logout);
  const isLoading  = useAuthStore((s) => s.isLoading);

  const [editing, setEditing]   = useState(false);
  const [name, setName]         = useState(user?.name ?? '');
  const [phone, setPhone]       = useState(user?.phone ?? '');
  const [pushLoading, setPushLoading] = useState(false);
  const [pushRegistered, setPushRegistered] = useState(false);

  useEffect(() => {
    setName(user?.name ?? '');
    setPhone(user?.phone ?? '');
  }, [user]);

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('Erreur', 'Le nom ne peut pas être vide');
      return;
    }
    try {
      await updateUser({ name: name.trim(), phone: phone.trim() || undefined });
      setEditing(false);
    } catch (err) {
      Alert.alert('Erreur', (err as Error).message);
    }
  }

  async function handleRegisterPush() {
    setPushLoading(true);
    try {
      const token = await registerPushToken();
      if (token) {
        await devicesApi.register(token, Platform.OS === 'ios' ? 'ios' : 'android');
        setPushRegistered(true);
        Alert.alert('Succès', 'Vous recevrez maintenant les notifications push.');
      }
    } catch (err) {
      Alert.alert('Erreur', (err as Error).message);
    } finally {
      setPushLoading(false);
    }
  }

  function handleLogout() {
    Alert.alert('Déconnexion', 'Voulez-vous vraiment vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Déconnexion', style: 'destructive', onPress: () => logout() },
    ]);
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <ScreenHeader title="Mon profil" />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Avatar circle */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase() ?? '?'}</Text>
          </View>
          <Text style={styles.userName}>{user?.name}</Text>
          <Text style={styles.userContact}>{user?.email ?? user?.phone ?? ''}</Text>
        </View>

        {/* Edit profile */}
        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Informations personnelles</Text>
            {!editing && (
              <Text style={styles.editLink} onPress={() => setEditing(true)}>Modifier</Text>
            )}
          </View>

          {editing ? (
            <>
              <Input label="Nom complet" value={name} onChangeText={setName} autoCapitalize="words" />
              <Input label="Numéro de téléphone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
              <View style={styles.editActions}>
                <Button label="Annuler" onPress={() => { setEditing(false); setName(user?.name ?? ''); setPhone(user?.phone ?? ''); }} variant="ghost" style={{ flex: 1 }} />
                <Button label="Enregistrer" onPress={handleSave} loading={isLoading} style={{ flex: 1 }} />
              </View>
            </>
          ) : (
            <>
              <InfoRow label="Nom" value={user?.name ?? '—'} />
              <InfoRow label="Email" value={user?.email ?? '—'} />
              <InfoRow label="Téléphone" value={user?.phone ?? '—'} />
              <InfoRow label="Membre depuis" value={user?.created_at ? new Date(user.created_at).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' }) : '—'} />
            </>
          )}
        </Card>

        {/* Push notifications */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications push</Text>
          <Text style={styles.pushDesc}>
            Activez les notifications pour être alerté des cotisations, retraits et votes en temps réel.
          </Text>
          <Button
            label={pushRegistered ? '✅ Notifications activées' : 'Activer les notifications'}
            onPress={handleRegisterPush}
            loading={pushLoading}
            disabled={pushRegistered}
            variant="outline"
            fullWidth
          />
        </Card>

        {/* Logout */}
        <Button
          label="Se déconnecter"
          onPress={handleLogout}
          variant="danger"
          fullWidth
          style={styles.logoutBtn}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={infoS.row}>
      <Text style={infoS.label}>{label}</Text>
      <Text style={infoS.value}>{value}</Text>
    </View>
  );
}

const infoS = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.two, borderBottomWidth: 1, borderBottomColor: Palette.neutral100 },
  label: { fontSize: FontSize.sm, color: Palette.neutral500 },
  value: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Palette.neutral800, maxWidth: '60%', textAlign: 'right' },
});

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: Spacing.four, gap: Spacing.four, paddingBottom: Spacing.seven },
  avatarSection: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.three },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: Palette.primary500, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: FontSize['3xl'], fontWeight: FontWeight.bold, color: Palette.neutral0 },
  userName: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Palette.primary500 },
  userContact: { fontSize: FontSize.sm, color: Palette.neutral500 },
  section: { gap: Spacing.two },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Palette.neutral800 },
  editLink: { fontSize: FontSize.sm, color: Palette.primary500, fontWeight: FontWeight.medium },
  editActions: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.two },
  pushDesc: { fontSize: FontSize.sm, color: Palette.neutral500, lineHeight: 20 },
  logoutBtn: { marginTop: Spacing.two },
});
