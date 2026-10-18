import { useCallback, useEffect, useState } from 'react';
import {
  Alert, FlatList, Modal, Pressable,
  RefreshControl, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { contributionsApi, membersApi, groupsApi, Contribution, Member, Group } from '@/lib/api';
import { useCache } from '@/hooks/use-cache';
import { AmountText, Button, Card, EmptyState, Input, LoadingScreen, SelectFilter } from '@/components/ui';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useAuthStore } from '@/stores/auth.store';
import { FontSize, FontWeight, Palette, Radius, Spacing } from '@/constants/theme';

type Filter = 'all' | 'cash' | 'tmoney' | 'flooz' | 'bank';

const PAYMENT_METHODS = [
  { key: 'cash',   label: 'Cash',    icon: 'cash-outline' },
  { key: 'tmoney', label: 'T-Money', icon: 'phone-portrait-outline' },
  { key: 'flooz',  label: 'Flooz',   icon: 'phone-portrait-outline' },
  { key: 'bank',   label: 'Banque',  icon: 'card-outline' },
];

const FILTER_OPTIONS = [
  { label: 'Tous les modes', value: 'all' as Filter },
  { label: 'Cash',           value: 'cash' as Filter },
  { label: 'T-Money',        value: 'tmoney' as Filter },
  { label: 'Flooz',          value: 'flooz' as Filter },
  { label: 'Banque',         value: 'bank' as Filter },
];

function AddContributionModal({ visible, groupId, members, myId, group, onClose, onSaved }: {
  visible: boolean; groupId: string; members: Member[];
  myId: string; group: Group | null; onClose: () => void; onSaved: () => void;
}) {
  const isFixed  = group?.contribution_rule === 'fixed';
  const fixedAmt = group?.fixed_amount ? parseFloat(group.fixed_amount) : 0;
  const currency = group?.currency ?? 'FCFA';

  const [selectedUserId, setSelectedUserId] = useState<string>(members[0]?.user_id ?? myId);
  const [amount, setAmount]                 = useState(isFixed ? String(fixedAmt) : '');
  const [method, setMethod]                 = useState('cash');
  const [note, setNote]                     = useState('');
  const [loading, setLoading]               = useState(false);
  const [errors, setErrors]                 = useState<Record<string, string>>({});

  // Re-sync quand le modal s'ouvre
  useEffect(() => {
    if (visible) {
      setSelectedUserId(members[0]?.user_id ?? myId);
      setAmount(isFixed ? String(fixedAmt) : '');
      setMethod('cash');
      setNote('');
      setErrors({});
    }
  }, [visible]);

  function validate() {
    const e: Record<string, string> = {};
    if (!amount || parseFloat(amount) <= 0) e.amount = 'Montant requis (> 0)';
    if (!selectedUserId) e.member = 'Sélectionnez un membre';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setLoading(true);
    try {
      await contributionsApi.record(groupId, {
        user_id: selectedUserId,
        amount: parseFloat(amount),
        payment_method: method,
        note: note.trim() || undefined,
      });
      onSaved(); onClose();
      setAmount(''); setNote(''); setMethod('cash'); setErrors({});
      setSelectedUserId(members[0]?.user_id ?? myId);
    } catch (err) {
      Alert.alert('Erreur', (err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <SafeAreaView style={mS.safe}>
        <View style={mS.header}>
          <View>
            <Text style={mS.title}>Enregistrer une cotisation</Text>
            <Text style={mS.subtitle}>
              {isFixed
                ? `Montant fixe : ${fixedAmt.toLocaleString('fr-FR')} ${currency}`
                : `Montant libre (${currency})`}
            </Text>
          </View>
          <Pressable onPress={onClose}><Text style={mS.cancel}>Annuler</Text></Pressable>
        </View>
        <ScrollView contentContainerStyle={mS.form} keyboardShouldPersistTaps="handled">

          {/* Sélection du membre */}
          <View>
            <Text style={mS.fieldLabel}>Membre qui cotise *</Text>
            {errors.member ? <Text style={mS.fieldError}>{errors.member}</Text> : null}
            <View style={mS.chipRow}>
              {members.map((m) => (
                <Pressable
                  key={m.user_id}
                  onPress={() => setSelectedUserId(m.user_id)}
                  style={[mS.chip, selectedUserId === m.user_id && mS.chipActive]}
                >
                  <Text style={[mS.chipText, selectedUserId === m.user_id && mS.chipTextActive]}>
                    {m.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <Input
            label={`Montant (${currency}) *`}
            value={amount}
            onChangeText={isFixed ? undefined : setAmount}
            editable={!isFixed}
            keyboardType="numeric"
            placeholder={isFixed ? `${fixedAmt.toLocaleString('fr-FR')} (fixe)` : 'Saisir le montant'}
            error={errors.amount}
            hint={isFixed ? `Montant fixe défini par l'admin` : 'Montant libre — saisissez ce qui a été reçu'}
          />

          <View>
            <Text style={mS.fieldLabel}>Moyen de paiement</Text>
            <View style={mS.chipRow}>
              {PAYMENT_METHODS.map(({ key, label, icon }) => (
                <Pressable
                  key={key}
                  onPress={() => setMethod(key)}
                  style={[mS.chip, method === key && mS.chipSuccess]}
                >
                  <Ionicons name={icon as any} size={14} color={method === key ? Palette.success600 : Palette.neutral500} />
                  <Text style={[mS.chipText, method === key && mS.chipTextSuccess]}>{label}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <Input
            label="Note (optionnel)"
            value={note}
            onChangeText={setNote}
            placeholder="Ex: Cotisation octobre 2026"
            multiline
            numberOfLines={2}
          />

          <Button label="Enregistrer la cotisation" onPress={handleSave} loading={loading} fullWidth size="lg" />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ── Edit contribution modal (admin) ──────────────────────────────────────────

function EditContributionModal({ visible, contribution, groupId, onClose, onSaved }: {
  visible: boolean;
  contribution: Contribution | null;
  groupId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [amount, setAmount]   = useState('');
  const [method, setMethod]   = useState('cash');
  const [note, setNote]       = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors]   = useState<Record<string, string>>({});

  useEffect(() => {
    if (visible && contribution) {
      setAmount(parseFloat(contribution.amount).toString());
      setMethod(contribution.payment_method);
      setNote(contribution.note ?? '');
      setErrors({});
    }
  }, [visible, contribution]);

  function validate() {
    const e: Record<string, string> = {};
    if (!amount || parseFloat(amount) <= 0) e.amount = 'Montant requis (> 0)';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate() || !contribution) return;
    setLoading(true);
    try {
      await contributionsApi.update(groupId, contribution.id, {
        amount: parseFloat(amount),
        payment_method: method,
        note: note.trim() || undefined,
      });
      onSaved(); onClose();
    } catch (err) {
      Alert.alert('Erreur', (err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (!contribution) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <SafeAreaView style={mS.safe}>
        <View style={mS.header}>
          <View>
            <Text style={mS.title}>Modifier la cotisation</Text>
            <Text style={mS.subtitle}>{contribution.member_name}</Text>
          </View>
          <Pressable onPress={onClose}><Text style={mS.cancel}>Annuler</Text></Pressable>
        </View>
        <ScrollView contentContainerStyle={mS.form} keyboardShouldPersistTaps="handled">
          <Input
            label="Montant (FCFA) *"
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            error={errors.amount}
          />
          <View>
            <Text style={mS.fieldLabel}>Moyen de paiement</Text>
            <View style={mS.chipRow}>
              {PAYMENT_METHODS.map(({ key, label, icon }) => (
                <Pressable
                  key={key}
                  onPress={() => setMethod(key)}
                  style={[mS.chip, method === key && mS.chipSuccess]}
                >
                  <Ionicons name={icon as any} size={14} color={method === key ? Palette.success600 : Palette.neutral500} />
                  <Text style={[mS.chipText, method === key && mS.chipTextSuccess]}>{label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          <Input
            label="Note (optionnel)"
            value={note}
            onChangeText={setNote}
            placeholder="Note…"
            multiline
            numberOfLines={2}
          />
          <Button label="Enregistrer les modifications" onPress={handleSave} loading={loading} fullWidth size="lg" />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ── Contribution item (avec appui long pour admin) ────────────────────────────

const methodLabel: Record<string, string> = { cash: 'Cash', tmoney: 'T-Money', flooz: 'Flooz', bank: 'Banque' };
const methodIcon:  Record<string, string> = { cash: 'cash-outline', tmoney: 'phone-portrait-outline', flooz: 'phone-portrait-outline', bank: 'card-outline' };

function ContributionItem({
  item,
  isAdmin,
  onLongPress,
}: {
  item: Contribution;
  isAdmin: boolean;
  onLongPress?: () => void;
}) {
  return (
    <Pressable
      onLongPress={isAdmin ? onLongPress : undefined}
      delayLongPress={400}
      style={({ pressed }) => [rS.row, pressed && isAdmin && rS.rowPressed]}
    >
      <View style={rS.avatar}>
        <Text style={rS.avatarText}>{item.member_name?.[0]?.toUpperCase() ?? '?'}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={rS.name}>{item.member_name}</Text>
        <View style={rS.metaRow}>
          <Ionicons name={(methodIcon[item.payment_method] ?? 'cash-outline') as any} size={12} color={Palette.neutral400} />
          <Text style={rS.meta}>
            {methodLabel[item.payment_method] ?? item.payment_method}
            {' · '}{new Date(item.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
          </Text>
        </View>
        {item.note ? <Text style={rS.note} numberOfLines={1}>"{item.note}"</Text> : null}
      </View>
      <View style={{ alignItems: 'flex-end', gap: 2 }}>
        <Text style={rS.amount}>+{parseFloat(item.amount).toLocaleString('fr-FR')} FCFA</Text>
        {isAdmin && (
          <Text style={rS.longPressHint}>Appui long pour modifier</Text>
        )}
      </View>
    </Pressable>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function ContributionsScreen() {
  const params  = useLocalSearchParams();
  const groupId = Array.isArray(params.groupId) ? params.groupId[0] : (params.groupId as string);
  const user    = useAuthStore((s) => s.user);
  const [showAdd, setShowAdd]         = useState(false);
  const [filter, setFilter]           = useState<Filter>('all');
  const [selectedItem, setSelectedItem] = useState<Contribution | null>(null);
  const [showEdit, setShowEdit]       = useState(false);

  const { data: contributions, loading: cLoading, refreshing: cRefreshing, refetch } = useCache(useCallback(() => contributionsApi.list(groupId), [groupId]), `contributions-${groupId}`);
  const { data: members, loading: mLoading }  = useCache(useCallback(() => membersApi.list(groupId), [groupId]), `members-${groupId}`);
  const { data: summary }                      = useCache(useCallback(() => contributionsApi.summary(groupId), [groupId]), `summary-${groupId}`);
  const { data: group }                        = useCache(useCallback(() => groupsApi.get(groupId), [groupId]), `group-${groupId}`);

  const myRole = (members?.find((m) => m.user_id === user?.id)?.role ?? 'member') as 'admin' | 'member';
  const filtered = contributions?.filter((c) => filter === 'all' || c.payment_method === filter) ?? [];
  const total    = contributions?.reduce((s, c) => s + parseFloat(c.amount), 0) ?? 0;

  function handleLongPress(item: Contribution) {
    setSelectedItem(item);
    Alert.alert(
      'Cotisation de ' + item.member_name,
      `${parseFloat(item.amount).toLocaleString('fr-FR')} FCFA — ${methodLabel[item.payment_method] ?? item.payment_method}`,
      [
        {
          text: '✏️ Modifier',
          onPress: () => setShowEdit(true),
        },
        {
          text: '🗑️ Supprimer',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Confirmer la suppression',
              `Supprimer la cotisation de ${parseFloat(item.amount).toLocaleString('fr-FR')} FCFA de ${item.member_name} ?`,
              [
                { text: 'Annuler', style: 'cancel' },
                {
                  text: 'Supprimer', style: 'destructive',
                  onPress: async () => {
                    try {
                      await contributionsApi.delete(groupId, item.id);
                      refetch();
                    } catch (err) {
                      Alert.alert('Erreur', (err as Error).message);
                    }
                  },
                },
              ]
            );
          },
        },
        { text: 'Annuler', style: 'cancel' },
      ]
    );
  }

  if ((cLoading || mLoading) && !contributions) return <LoadingScreen message="Chargement des cotisations…" />;
  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader
        title="Cotisations"
        showBack
        rightAction={
          // Seul l'admin peut enregistrer une cotisation
          myRole === 'admin' ? (
            <Pressable onPress={() => setShowAdd(true)} style={styles.addBtn} accessibilityLabel="Ajouter une cotisation">
              <Text style={styles.addBtnText}>+</Text>
            </Pressable>
          ) : null
        }
      />

      {/* Total */}
      {total > 0 && (
        <View style={styles.totalBanner}>
          <Text style={styles.totalLabel}>Total collecté</Text>
          <Text style={styles.totalAmount}>{total.toLocaleString('fr-FR')} FCFA</Text>
        </View>
      )}

      {/* Filtre par moyen de paiement */}
      <SelectFilter
        label="Filtrer par moyen de paiement"
        options={FILTER_OPTIONS}
        value={filter}
        onChange={setFilter}
        style={styles.filterSelect}
      />

      <FlatList
        data={filtered}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => (
          <ContributionItem
            item={item}
            isAdmin={myRole === 'admin'}
            onLongPress={() => handleLongPress(item)}
          />
        )}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={cRefreshing} onRefresh={refetch} tintColor={Palette.primary500} />}
        ListHeaderComponent={
          summary && summary.length > 0 && filter === 'all' ? (
            <Card style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Récapitulatif par membre</Text>
              {summary.map((s) => (
                <View key={s.user_id} style={styles.summaryRow}>
                  <View style={styles.summaryAvatar}>
                    <Text style={styles.summaryAvatarText}>{s.name[0].toUpperCase()}</Text>
                  </View>
                  <Text style={styles.summaryName} numberOfLines={1}>{s.name}</Text>
                  <Text style={styles.summaryCount}>{s.count} fois</Text>
                  <AmountText amount={s.total} currency="FCFA" positive />
                </View>
              ))}
            </Card>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            title={filter !== 'all' ? 'Aucune cotisation avec ce filtre' : 'Aucune cotisation'}
            message={myRole === 'admin' ? 'Enregistrez la première cotisation.' : "L'admin enregistrera vos cotisations."}
            actionLabel={myRole === 'admin' ? 'Ajouter' : undefined}
            onAction={myRole === 'admin' ? () => setShowAdd(true) : undefined}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      {members && myRole === 'admin' && (
        <AddContributionModal
          visible={showAdd}
          groupId={groupId}
          members={members}
          myId={user?.id ?? ''}
          group={group ?? null}
          onClose={() => setShowAdd(false)}
          onSaved={refetch}
        />
      )}

      {/* Modal de modification */}
      {myRole === 'admin' && (
        <EditContributionModal
          visible={showEdit}
          contribution={selectedItem}
          groupId={groupId}
          onClose={() => { setShowEdit(false); setSelectedItem(null); }}
          onSaved={() => { refetch(); setShowEdit(false); setSelectedItem(null); }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Palette.neutral50 },
  list: { padding: Spacing.four, paddingBottom: 100 },
  addBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: Palette.primary500, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { color: Palette.neutral0, fontSize: 22, lineHeight: 28, fontWeight: FontWeight.bold },
  filterSelect: { marginHorizontal: Spacing.four, marginBottom: Spacing.two },
  totalBanner: { backgroundColor: Palette.primary500, paddingVertical: Spacing.three, paddingHorizontal: Spacing.four, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: FontSize.sm, color: Palette.primary100 },
  totalAmount: { fontSize: FontSize.lg, fontWeight: FontWeight.extrabold, color: Palette.neutral0 },
  summaryCard: { marginBottom: Spacing.three, gap: Spacing.two },
  summaryTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Palette.neutral700 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.one },
  summaryAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: Palette.primary100, alignItems: 'center', justifyContent: 'center' },
  summaryAvatarText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Palette.primary500 },
  summaryName: { flex: 1, fontSize: FontSize.sm, color: Palette.neutral800 },
  summaryCount: { fontSize: FontSize.xs, color: Palette.neutral400 },
});

const rS = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.three, borderBottomWidth: 1, borderBottomColor: Palette.neutral100, backgroundColor: Palette.neutral0, paddingHorizontal: Spacing.three, marginBottom: 1 },
  rowPressed: { backgroundColor: Palette.primary50 },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: Palette.success50, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Palette.success600 },
  name: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Palette.neutral800 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  meta: { fontSize: FontSize.xs, color: Palette.neutral400 },
  note: { fontSize: FontSize.xs, color: Palette.neutral500, fontStyle: 'italic', marginTop: 2 },
  amount: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Palette.success600 },
  longPressHint: { fontSize: 9, color: Palette.neutral300, textAlign: 'right' },
});

const mS = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Palette.neutral0 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.four, borderBottomWidth: 1, borderBottomColor: Palette.neutral100 },
  title: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Palette.primary500 },
  subtitle: { fontSize: FontSize.xs, color: Palette.neutral500, marginTop: 2 },
  cancel: { fontSize: FontSize.sm, color: Palette.primary500 },
  form: { padding: Spacing.four, gap: Spacing.four },
  fieldLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Palette.neutral600, marginBottom: Spacing.two },
  fieldError: { fontSize: FontSize.xs, color: Palette.error500, marginBottom: Spacing.one },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: Radius.full, borderWidth: 1.5, borderColor: Palette.neutral200, backgroundColor: Palette.neutral50 },
  chipActive: { borderColor: Palette.primary500, backgroundColor: Palette.primary50 },
  chipText: { fontSize: FontSize.sm, color: Palette.neutral600 },
  chipTextActive: { color: Palette.primary500, fontWeight: FontWeight.semibold },
  chipSuccess: { borderColor: Palette.success500, backgroundColor: Palette.success50 },
  chipTextSuccess: { color: Palette.success600, fontWeight: FontWeight.semibold },
});
