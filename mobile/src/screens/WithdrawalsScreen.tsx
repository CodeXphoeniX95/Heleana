import { useCallback, useState } from 'react';
import {
  Alert, FlatList, Modal, Platform, Pressable,
  RefreshControl, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { withdrawalsApi, approvalsApi, membersApi, groupsApi, Withdrawal } from '@/lib/api';
import { useCache } from '@/hooks/use-cache';
import { AmountText, Badge, Button, Card, EmptyState, Input, LoadingScreen, statusLabel, statusToVariant } from '@/components/ui';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useAuthStore } from '@/stores/auth.store';
import { FontSize, FontWeight, Palette, Radius, Spacing } from '@/constants/theme';

// ── DatePicker simple (sans dépendance externe) ───────────────────────────────
// Affiche un sélecteur de date sous forme de 3 champs jour/mois/année

function SimpleDatePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  // value format: YYYY-MM-DD or ''
  const parts = value ? value.split('-') : ['', '', ''];
  const [year, setYear]   = useState(parts[0]);
  const [month, setMonth] = useState(parts[1]);
  const [day, setDay]     = useState(parts[2]);

  function update(y: string, m: string, d: string) {
    if (y.length === 4 && m.length === 2 && d.length === 2) {
      onChange(`${y}-${m}-${d}`);
    } else {
      onChange('');
    }
  }

  return (
    <View style={dpS.row}>
      <View style={dpS.field}>
        <Text style={dpS.label}>Jour</Text>
        <Input
          value={day}
          onChangeText={(v) => { setDay(v); update(year, month, v); }}
          keyboardType="numeric"
          placeholder="JJ"
          maxLength={2}
          style={dpS.input}
        />
      </View>
      <View style={dpS.field}>
        <Text style={dpS.label}>Mois</Text>
        <Input
          value={month}
          onChangeText={(v) => { setMonth(v); update(year, v, day); }}
          keyboardType="numeric"
          placeholder="MM"
          maxLength={2}
          style={dpS.input}
        />
      </View>
      <View style={[dpS.field, { flex: 2 }]}>
        <Text style={dpS.label}>Année</Text>
        <Input
          value={year}
          onChangeText={(v) => { setYear(v); update(v, month, day); }}
          keyboardType="numeric"
          placeholder="AAAA"
          maxLength={4}
          style={dpS.input}
        />
      </View>
    </View>
  );
}

const dpS = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.two, alignItems: 'flex-end' },
  field: { flex: 1 },
  label: { fontSize: FontSize.xs, color: Palette.neutral500, marginBottom: 4 },
  input: {},
});

// ── Request modal ─────────────────────────────────────────────────────────────

function RequestWithdrawalModal({ visible, groupId, balance, onClose, onSaved }: {
  visible: boolean; groupId: string; balance: number; onClose: () => void; onSaved: () => void;
}) {
  const [amount, setAmount]   = useState('');
  const [reason, setReason]   = useState('');
  const [date, setDate]       = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors]   = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    const amt = parseFloat(amount);
    if (!amount || isNaN(amt) || amt <= 0) e.amount = 'Montant requis (> 0)';
    else if (amt > balance) e.amount = `Solde insuffisant. Maximum : ${balance.toLocaleString('fr-FR')} FCFA`;
    if (!reason.trim()) e.reason = 'Motif requis';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setLoading(true);
    try {
      await withdrawalsApi.request(groupId, {
        amount: parseFloat(amount),
        reason: reason.trim(),
        desired_date: date || undefined,
      });
      onSaved(); onClose();
      setAmount(''); setReason(''); setDate(''); setErrors({});
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
          <Text style={mS.title}>Demande de retrait</Text>
          <Pressable onPress={onClose}><Text style={mS.cancel}>Annuler</Text></Pressable>
        </View>
        <ScrollView contentContainerStyle={mS.form} keyboardShouldPersistTaps="handled">

          {/* Solde disponible */}
          <View style={mS.balanceInfo}>
            <Text style={mS.balanceLabel}>Solde disponible</Text>
            <Text style={mS.balanceValue}>{balance.toLocaleString('fr-FR')} FCFA</Text>
          </View>

          <Input
            label="Montant à retirer (FCFA) *"
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholder={`Max : ${balance.toLocaleString('fr-FR')}`}
            error={errors.amount}
          />

          <Input
            label="Motif *"
            value={reason}
            onChangeText={setReason}
            placeholder="Expliquez la raison du retrait"
            multiline
            numberOfLines={3}
            error={errors.reason}
          />

          <View>
            <Text style={mS.dateLabel}>Date souhaitée (optionnel)</Text>
            <SimpleDatePicker value={date} onChange={setDate} />
            {date ? <Text style={mS.datePreview}>📅 {new Date(date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</Text> : null}
          </View>

          <Button label="Envoyer la demande" onPress={handleSave} loading={loading} fullWidth size="lg" />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ── Vote modal ────────────────────────────────────────────────────────────────

function VoteModal({ visible, withdrawal, onClose, onVoted }: {
  visible: boolean; withdrawal: Withdrawal | null; onClose: () => void; onVoted: () => void;
}) {
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleVote(decision: 'approve' | 'reject') {
    if (!withdrawal) return;
    setLoading(true);
    try {
      await approvalsApi.vote(withdrawal.id, { decision, comment: comment.trim() || undefined });
      onVoted(); onClose(); setComment('');
    } catch (err) {
      Alert.alert('Erreur', (err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (!withdrawal) return null;
  const eligible = Math.max(withdrawal.member_count - 1, 0);
  const progress = eligible > 0 ? Math.round((withdrawal.total_votes / eligible) * 100) : 0;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <SafeAreaView style={mS.safe}>
        <View style={mS.header}>
          <Text style={mS.title}>Voter sur ce retrait</Text>
          <Pressable onPress={onClose}><Text style={mS.cancel}>Fermer</Text></Pressable>
        </View>
        <ScrollView contentContainerStyle={mS.form} keyboardShouldPersistTaps="handled">

          <View style={mS.summaryBlock}>
            <Text style={mS.summaryName}>{withdrawal.requester_name} demande</Text>
            <Text style={mS.summaryAmount}>{parseFloat(withdrawal.amount).toLocaleString('fr-FR')} FCFA</Text>
            <Text style={mS.summaryReason}>"{withdrawal.reason}"</Text>
            <Badge label={statusLabel(withdrawal.status)} variant={statusToVariant(withdrawal.status)} size="md" style={{ marginTop: Spacing.two }} />
          </View>

          <View style={mS.progressSection}>
            <View style={mS.progressHeader}>
              <Text style={mS.progressLabel}>Votes reçus</Text>
              <Text style={mS.progressCount}>{withdrawal.total_votes} / {eligible}</Text>
            </View>
            <View style={mS.progressBar}>
              <View style={[mS.progressFill, { width: `${progress}%` as any }]} />
            </View>
            <View style={mS.voteRow}>
              <View style={[mS.voteChip, { backgroundColor: Palette.success50 }]}>
                <Text style={[mS.voteChipText, { color: Palette.success600 }]}>✅ {withdrawal.approve_count} pour</Text>
              </View>
              <View style={[mS.voteChip, { backgroundColor: Palette.error50 }]}>
                <Text style={[mS.voteChipText, { color: Palette.error500 }]}>❌ {withdrawal.reject_count} contre</Text>
              </View>
            </View>
          </View>

          {withdrawal.status === 'pending' ? (
            <>
              <Input label="Commentaire (optionnel)" value={comment} onChangeText={setComment} placeholder="Votre avis…" multiline />
              <View style={mS.voteButtons}>
                <Button label="✅ Approuver" onPress={() => handleVote('approve')} loading={loading} variant="primary" style={{ flex: 1 }} />
                <Button label="❌ Rejeter"   onPress={() => handleVote('reject')}  loading={loading} variant="danger"   style={{ flex: 1 }} />
              </View>
            </>
          ) : (
            <Text style={mS.resolvedText}>Cette demande a été {withdrawal.status === 'approved' ? 'approuvée ✅' : withdrawal.status === 'rejected' ? 'rejetée ❌' : 'payée 💸'}.</Text>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ── Withdrawal card ───────────────────────────────────────────────────────────

function WithdrawalCard({ item, isAdmin, myId, onVote, onMarkPaid }: {
  item: Withdrawal; isAdmin: boolean; myId: string; onVote: () => void; onMarkPaid: () => void;
}) {
  const isRequester = item.user_id === myId;
  const eligible    = Math.max(item.member_count - 1, 0);
  const canVote     = item.status === 'pending' && !isRequester;

  return (
    <Card onPress={canVote ? onVote : undefined} style={wS.card}>
      <View style={wS.top}>
        <View style={wS.avatarWrap}>
          <Text style={wS.avatarText}>{item.requester_name[0]?.toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={wS.name}>{item.requester_name}{isRequester ? ' (moi)' : ''}</Text>
          <Text style={wS.reason} numberOfLines={2}>{item.reason}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Text style={wS.amount}>{parseFloat(item.amount).toLocaleString('fr-FR')} FCFA</Text>
          <Badge label={statusLabel(item.status)} variant={statusToVariant(item.status)} />
        </View>
      </View>

      <View style={wS.bottom}>
        <Text style={wS.date}>{new Date(item.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
        {item.status === 'pending' && (
          <Text style={wS.votes}>{item.approve_count}✅ {item.reject_count}❌ — {item.total_votes}/{eligible} votes</Text>
        )}
      </View>

      {canVote && <Text style={wS.tapHint}>Appuyez pour voter →</Text>}

      {isAdmin && item.status === 'approved' && (
        <Button label="💸 Marquer comme payé" onPress={onMarkPaid} variant="outline" size="sm" style={{ marginTop: Spacing.two }} />
      )}
    </Card>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function WithdrawalsScreen() {
  const params  = useLocalSearchParams();
  const groupId = Array.isArray(params.groupId) ? params.groupId[0] : (params.groupId as string);
  const user    = useAuthStore((s) => s.user);
  const [showRequest, setShowRequest] = useState(false);
  const [selected, setSelected]       = useState<Withdrawal | null>(null);

  const { data: withdrawals, loading, refreshing, refetch } = useCache(useCallback(() => withdrawalsApi.list(groupId), [groupId]), `withdrawals-${groupId}`);
  const { data: members }  = useCache(useCallback(() => membersApi.list(groupId), [groupId]), `members-${groupId}`);
  const { data: dash }     = useCache(useCallback(() => groupsApi.dashboard(groupId), [groupId]), `dashboard-${groupId}`);

  const myRole  = (members?.find((m) => m.user_id === user?.id)?.role ?? 'member') as 'admin' | 'member';
  const balance = dash ? parseFloat(dash.balance) : 0;

  async function handleMarkPaid(w: Withdrawal) {
    Alert.alert(
      'Confirmer la demande de retrait',
      `Confirmer la demande de retrait de ${parseFloat(w.amount).toLocaleString('fr-FR')} FCFA\npar ${w.requester_name}\npour : "${w.reason}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Confirmer', onPress: async () => {
          try { await withdrawalsApi.markPaid(groupId, w.id); refetch(); }
          catch (err) { Alert.alert('Erreur', (err as Error).message); }
        }},
      ]
    );
  }

  if (loading && !withdrawals) return <LoadingScreen message="Chargement des retraits…" />;

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader
        title="Retraits"
        subtitle={dash ? `Solde : ${parseFloat(dash.balance).toLocaleString('fr-FR')} FCFA` : undefined}
        showBack
        rightAction={
          <Pressable onPress={() => setShowRequest(true)} style={styles.addBtn}>
            <Text style={styles.addBtnText}>+</Text>
          </Pressable>
        }
      />

      <FlatList
        data={withdrawals ?? []}
        keyExtractor={(w) => w.id}
        renderItem={({ item }) => (
          <WithdrawalCard
            item={item}
            isAdmin={myRole === 'admin'}
            myId={user?.id ?? ''}
            onVote={() => setSelected(item)}
            onMarkPaid={() => handleMarkPaid(item)}
          />
        )}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refetch} tintColor={Palette.primary500} />}
        ListEmptyComponent={
          <EmptyState
            title="Aucune demande de retrait"
            message="Faites une demande. Les membres devront approuver avant tout paiement."
            actionLabel="Faire une demande"
            onAction={() => setShowRequest(true)}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      <RequestWithdrawalModal
        visible={showRequest}
        groupId={groupId}
        balance={balance}
        onClose={() => setShowRequest(false)}
        onSaved={refetch}
      />
      <VoteModal
        visible={!!selected}
        withdrawal={selected}
        onClose={() => setSelected(null)}
        onVoted={refetch}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Palette.neutral50 },
  list: { padding: Spacing.four, paddingBottom: 100 },
  addBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: Palette.primary500, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { color: Palette.neutral0, fontSize: 22, lineHeight: 28, fontWeight: FontWeight.bold },
});

const wS = StyleSheet.create({
  card: { marginBottom: Spacing.two },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  avatarWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: Palette.warning50, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Palette.warning600 },
  name: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Palette.neutral800 },
  reason: { fontSize: FontSize.xs, color: Palette.neutral500, marginTop: 2, lineHeight: 18 },
  amount: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Palette.error500 },
  bottom: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.two, paddingTop: Spacing.two, borderTopWidth: 1, borderTopColor: Palette.neutral100 },
  date: { fontSize: FontSize.xs, color: Palette.neutral400 },
  votes: { fontSize: FontSize.xs, color: Palette.neutral500 },
  tapHint: { fontSize: FontSize.xs, color: Palette.primary400, fontWeight: FontWeight.medium, textAlign: 'right', marginTop: Spacing.one },
});

const mS = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Palette.neutral0 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.four, borderBottomWidth: 1, borderBottomColor: Palette.neutral100 },
  title: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Palette.primary500 },
  cancel: { fontSize: FontSize.sm, color: Palette.primary500 },
  form: { padding: Spacing.four, gap: Spacing.four },
  balanceInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Palette.success50, borderRadius: Radius.md, padding: Spacing.three },
  balanceLabel: { fontSize: FontSize.sm, color: Palette.success700 },
  balanceValue: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Palette.success600 },
  dateLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Palette.neutral600, marginBottom: Spacing.two },
  datePreview: { fontSize: FontSize.sm, color: Palette.primary500, marginTop: Spacing.one, fontStyle: 'italic' },
  summaryBlock: { backgroundColor: Palette.neutral50, borderRadius: Radius.lg, padding: Spacing.four, alignItems: 'center', gap: Spacing.one },
  summaryName: { fontSize: FontSize.sm, color: Palette.neutral500 },
  summaryAmount: { fontSize: FontSize['2xl'], fontWeight: FontWeight.extrabold, color: Palette.neutral800 },
  summaryReason: { fontSize: FontSize.sm, color: Palette.neutral600, textAlign: 'center', fontStyle: 'italic' },
  progressSection: { gap: Spacing.two },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Palette.neutral700 },
  progressCount: { fontSize: FontSize.sm, color: Palette.neutral500 },
  progressBar: { height: 8, backgroundColor: Palette.neutral200, borderRadius: Radius.full, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Palette.primary500, borderRadius: Radius.full },
  voteRow: { flexDirection: 'row', gap: Spacing.two },
  voteChip: { flex: 1, borderRadius: Radius.md, paddingVertical: Spacing.two, alignItems: 'center' },
  voteChipText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  voteButtons: { flexDirection: 'row', gap: Spacing.two },
  resolvedText: { fontSize: FontSize.base, color: Palette.neutral600, textAlign: 'center', paddingVertical: Spacing.three },
});
