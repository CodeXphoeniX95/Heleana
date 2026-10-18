import { useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { groupsApi, Group } from '@/lib/api';
import { useApi } from '@/hooks/use-api';
import { Badge, Button, Card, EmptyState, Input, LoadingScreen } from '@/components/ui';
import { ScreenHeader } from '@/components/ScreenHeader';
import { FontSize, FontWeight, Palette, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// ── Create group modal ────────────────────────────────────────────────────────

function CreateGroupModal({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName]                     = useState('');
  const [description, setDescription]       = useState('');
  const [currency, setCurrency]             = useState('FCFA');
  const [rule, setRule]                     = useState<'fixed' | 'free'>('fixed');
  const [fixedAmount, setFixedAmount]       = useState('');
  const [frequency, setFrequency]           = useState('monthly');
  const [validationRule, setValidationRule] = useState('majority');
  const [loading, setLoading]               = useState(false);
  const [errors, setErrors]                 = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Le nom est requis';
    if (rule === 'fixed' && (!fixedAmount || parseFloat(fixedAmount) <= 0))
      e.fixedAmount = 'Montant fixe requis';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleCreate() {
    if (!validate()) return;
    setLoading(true);
    try {
      await groupsApi.create({
        name: name.trim(),
        description: description.trim() || undefined,
        currency,
        contribution_rule: rule,
        fixed_amount: rule === 'fixed' ? parseFloat(fixedAmount) : undefined,
        frequency,
        validation_rule: validationRule,
      });
      onCreated();
      onClose();
      resetForm();
    } catch (err) {
      Alert.alert('Erreur', err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setName(''); setDescription(''); setCurrency('FCFA');
    setRule('fixed'); setFixedAmount(''); setFrequency('monthly');
    setValidationRule('majority'); setErrors({});
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={modalStyles.safe}>
        <View style={modalStyles.header}>
          <Text style={modalStyles.title}>Créer un groupe</Text>
          <Pressable onPress={onClose} style={modalStyles.closeBtn}>
            <Text style={modalStyles.closeText}>Annuler</Text>
          </Pressable>
        </View>

        <FlatList
          data={[]}
          renderItem={null}
          ListHeaderComponent={
            <View style={modalStyles.form}>
              <Input label="Nom du groupe *" value={name} onChangeText={setName} error={errors.name} placeholder="Ex: Tontine famille" />
              <Input label="Description" value={description} onChangeText={setDescription} placeholder="Optionnel" multiline numberOfLines={2} />
              <Input label="Devise" value={currency} onChangeText={setCurrency} placeholder="FCFA" />

              <View style={modalStyles.toggleRow}>
                <Text style={modalStyles.fieldLabel}>Règle de cotisation</Text>
                <View style={modalStyles.toggleGroup}>
                  {(['fixed', 'free'] as const).map((v) => (
                    <Pressable key={v} onPress={() => setRule(v)} style={[modalStyles.toggleBtn, rule === v && modalStyles.toggleActive]}>
                      <Text style={[modalStyles.toggleText, rule === v && modalStyles.toggleTextActive]}>
                        {v === 'fixed' ? 'Montant fixe' : 'Libre'}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {rule === 'fixed' && (
                <Input
                  label="Montant fixe (FCFA) *"
                  value={fixedAmount}
                  onChangeText={setFixedAmount}
                  keyboardType="numeric"
                  error={errors.fixedAmount}
                  placeholder="Ex: 5000"
                />
              )}

              <View style={modalStyles.toggleRow}>
                <Text style={modalStyles.fieldLabel}>Fréquence</Text>
                <View style={modalStyles.toggleGroup}>
                  {[{ v: 'weekly', l: 'Hebdo' }, { v: 'monthly', l: 'Mensuel' }, { v: 'other', l: 'Autre' }].map(({ v, l }) => (
                    <Pressable key={v} onPress={() => setFrequency(v)} style={[modalStyles.toggleBtn, frequency === v && modalStyles.toggleActive]}>
                      <Text style={[modalStyles.toggleText, frequency === v && modalStyles.toggleTextActive]}>{l}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={modalStyles.toggleRow}>
                <Text style={modalStyles.fieldLabel}>Validation des retraits</Text>
                <View style={modalStyles.toggleGroup}>
                  {[{ v: 'majority', l: 'Majorité' }, { v: 'unanimity', l: 'Unanimité' }].map(({ v, l }) => (
                    <Pressable key={v} onPress={() => setValidationRule(v)} style={[modalStyles.toggleBtn, validationRule === v && modalStyles.toggleActive]}>
                      <Text style={[modalStyles.toggleText, validationRule === v && modalStyles.toggleTextActive]}>{l}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <Button label="Créer le groupe" onPress={handleCreate} loading={loading} fullWidth size="lg" style={{ marginTop: Spacing.three }} />
            </View>
          }
          keyExtractor={() => 'form'}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      </SafeAreaView>
    </Modal>
  );
}

// ── Join group modal ──────────────────────────────────────────────────────────

function JoinGroupModal({ visible, onClose, onJoined }: { visible: boolean; onClose: () => void; onJoined: () => void }) {
  const [code, setCode]     = useState('');
  const [loading, setLoading] = useState(false);

  async function handleJoin() {
    if (!code.trim()) return;
    setLoading(true);
    try {
      await groupsApi.join(code.trim());
      onJoined();
      onClose();
      setCode('');
    } catch (err) {
      Alert.alert('Erreur', err instanceof Error ? err.message : 'Code invalide');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <SafeAreaView style={modalStyles.safe}>
        <View style={modalStyles.header}>
          <Text style={modalStyles.title}>Rejoindre un groupe</Text>
          <Pressable onPress={onClose}><Text style={modalStyles.closeText}>Annuler</Text></Pressable>
        </View>
        <View style={modalStyles.form}>
          <Input
            label="Code d'invitation"
            value={code}
            onChangeText={(t) => setCode(t.toUpperCase())}
            placeholder="Ex: A3F7B2"
            autoCapitalize="characters"
            autoCorrect={false}
          />
          <Button label="Rejoindre" onPress={handleJoin} loading={loading} fullWidth size="lg" />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

// ── Group card ────────────────────────────────────────────────────────────────

function GroupCard({ group, onPress }: { group: Group; onPress: () => void }) {
  return (
    <Card onPress={onPress} style={cardStyles.card}>
      <View style={cardStyles.row}>
        <View style={cardStyles.avatar}>
          <Text style={cardStyles.avatarText}>{group.name[0].toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={cardStyles.nameRow}>
            <Text style={cardStyles.name} numberOfLines={1}>{group.name}</Text>
            <Badge label={group.role === 'admin' ? 'Admin' : 'Membre'} variant={group.role === 'admin' ? 'primary' : 'default'} />
          </View>
          <Text style={cardStyles.meta}>
            {group.member_count} membre{(group.member_count ?? 0) > 1 ? 's' : ''} ·{' '}
            {group.contribution_rule === 'fixed'
              ? `${parseFloat(group.fixed_amount ?? '0').toLocaleString('fr-FR')} ${group.currency}`
              : `Libre (${group.currency})`}
          </Text>
        </View>
        <Text style={cardStyles.arrow}>›</Text>
      </View>
    </Card>
  );
}

const cardStyles = StyleSheet.create({
  card: { marginBottom: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Palette.primary100, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Palette.primary500 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, flexWrap: 'wrap' },
  name: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Palette.neutral800, flex: 1 },
  meta: { fontSize: FontSize.xs, color: Palette.neutral500, marginTop: 2 },
  arrow: { fontSize: 22, color: Palette.neutral300 },
});

// ── Main screen ───────────────────────────────────────────────────────────────

export default function GroupsScreen() {
  const theme   = useTheme();
  const router  = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin]     = useState(false);

  const { data: groups, loading, refetch } = useApi(() => groupsApi.list());

  if (loading && !groups) return <LoadingScreen message="Chargement des groupes…" />;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <ScreenHeader
        title="Mes groupes"
        rightAction={
          <Pressable onPress={() => setShowCreate(true)} style={styles.addBtn}>
            <Text style={styles.addBtnText}>+</Text>
          </Pressable>
        }
      />

      <FlatList
        data={groups ?? []}
        keyExtractor={(g) => g.id}
        renderItem={({ item }) => (
          <GroupCard
            group={item}
            onPress={() => router.push({
              pathname: '/group/[groupId]/',
              params: { groupId: item.id }
            } as any)}
          />
        )}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={Palette.primary500} />}
        ListEmptyComponent={
          <View style={styles.emptyBlock}>
            <Text style={styles.emptyTitle}>Aucun groupe</Text>
            <Text style={styles.emptyMsg}>Créez votre premier groupe ou rejoignez-en un avec un code d'invitation.</Text>
            <Button label="+ Créer un groupe" onPress={() => setShowCreate(true)} fullWidth style={{ marginTop: Spacing.two }} />
            <Button label="Rejoindre avec un code" onPress={() => setShowJoin(true)} variant="outline" fullWidth style={{ marginTop: Spacing.two }} />
          </View>
        }
        ListFooterComponent={
          groups && groups.length > 0 ? (
            <Button label="Rejoindre avec un code" onPress={() => setShowJoin(true)} variant="outline" fullWidth style={{ marginTop: Spacing.two }} />
          ) : null
        }
        showsVerticalScrollIndicator={false}
      />

      <CreateGroupModal visible={showCreate} onClose={() => setShowCreate(false)} onCreated={refetch} />
      <JoinGroupModal   visible={showJoin}   onClose={() => setShowJoin(false)}   onJoined={refetch} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  list: { padding: Spacing.four, paddingBottom: Spacing.seven },
  addBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: Palette.primary500, alignItems: 'center', justifyContent: 'center',
  },
  addBtnText: { color: Palette.neutral0, fontSize: 22, lineHeight: 28, fontWeight: FontWeight.bold },
  emptyBlock: { padding: Spacing.four, alignItems: 'center', gap: Spacing.two },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Palette.neutral800, textAlign: 'center' },
  emptyMsg: { fontSize: FontSize.sm, color: Palette.neutral500, textAlign: 'center', lineHeight: 22 },
});

const modalStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Palette.neutral0 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: Spacing.four, borderBottomWidth: 1, borderBottomColor: Palette.neutral200,
  },
  title: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Palette.primary500 },
  closeBtn: { padding: Spacing.one },
  closeText: { fontSize: FontSize.sm, color: Palette.primary500 },
  form: { padding: Spacing.four, gap: Spacing.three },
  fieldLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Palette.neutral600 },
  toggleRow: { gap: Spacing.one },
  toggleGroup: { flexDirection: 'row', gap: Spacing.two },
  toggleBtn: {
    flex: 1, paddingVertical: Spacing.two, borderRadius: Radius.md,
    borderWidth: 1.5, borderColor: Palette.neutral200, alignItems: 'center',
  },
  toggleActive: { borderColor: Palette.primary500, backgroundColor: Palette.primary50 },
  toggleText: { fontSize: FontSize.sm, color: Palette.neutral600 },
  toggleTextActive: { color: Palette.primary500, fontWeight: FontWeight.semibold },
});
