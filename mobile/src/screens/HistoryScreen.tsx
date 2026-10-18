import { useEffect, useState } from 'react';
import {
  FlatList, RefreshControl, Switch,
  StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { groupsApi, contributionsApi, withdrawalsApi, Group, Contribution, Withdrawal } from '@/lib/api';
import { Badge, EmptyState, LoadingScreen, SelectFilter, statusLabel, statusToVariant } from '@/components/ui';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useAuthStore } from '@/stores/auth.store';
import { FontSize, FontWeight, Palette, Radius, Spacing } from '@/constants/theme';

// ── Types ─────────────────────────────────────────────────────────────────────

type TxType       = 'all' | 'contribution' | 'withdrawal';
type PaymentFilter= 'all' | 'cash' | 'tmoney' | 'flooz' | 'bank';

const TYPE_OPTIONS = [
  { label: 'Toutes transactions', value: 'all' as TxType },
  { label: 'Cotisations',         value: 'contribution' as TxType },
  { label: 'Retraits',            value: 'withdrawal' as TxType },
];

const PAYMENT_OPTIONS = [
  { label: 'Tous modes',  value: 'all' as PaymentFilter },
  { label: 'Cash',        value: 'cash' as PaymentFilter },
  { label: 'T-Money',     value: 'tmoney' as PaymentFilter },
  { label: 'Flooz',       value: 'flooz' as PaymentFilter },
  { label: 'Banque',      value: 'bank' as PaymentFilter },
];

interface Transaction {
  id: string;
  type: 'contribution' | 'withdrawal';
  userId: string;   // user_id de l'acteur (membre qui a cotisé ou demandeur)
  date: string;
  amount: number;
  person: string;
  detail: string;
  status?: string;
  groupName: string;
  currency: string;
}

// ── Filter bar ────────────────────────────────────────────────────────────────

// ── Transaction row ───────────────────────────────────────────────────────────

const methodLabel: Record<string, string> = { cash: '💵 Cash', tmoney: '📱 T-Money', flooz: '📱 Flooz', bank: '🏦 Banque' };

function TxRow({ tx }: { tx: Transaction }) {
  const isContrib = tx.type === 'contribution';
  const iconName  = isContrib ? 'arrow-up-circle' : 'arrow-down-circle';
  const iconColor = isContrib ? Palette.success600 : Palette.warning600;
  const iconBg    = isContrib ? Palette.success50  : Palette.warning50;

  return (
    <View style={rS.row}>
      <View style={[rS.icon, { backgroundColor: iconBg }]}>
        <Ionicons name={iconName as any} size={22} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={rS.topRow}>
          <Text style={rS.person} numberOfLines={1}>{tx.person}</Text>
          <Text style={[rS.amount, { color: isContrib ? Palette.success600 : Palette.error500 }]}>
            {isContrib ? '+' : '-'}{tx.amount.toLocaleString('fr-FR')} {tx.currency}
          </Text>
        </View>
        <View style={rS.bottomRow}>
          <Text style={rS.detail}>
            {isContrib ? (methodLabel[tx.detail] ?? tx.detail) : tx.detail}
          </Text>
          <Text style={rS.date}>
            {new Date(tx.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
          </Text>
        </View>
        <View style={rS.metaRow}>
          <Ionicons name="people-outline" size={11} color={Palette.primary400} />
          <Text style={rS.groupName}>{tx.groupName}</Text>
          {!isContrib && tx.status && (
            <Badge label={statusLabel(tx.status)} variant={statusToVariant(tx.status)} />
          )}
        </View>
      </View>
    </View>
  );
}

const rS = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three, paddingVertical: Spacing.three, borderBottomWidth: 1, borderBottomColor: Palette.neutral100, backgroundColor: Palette.neutral0, paddingHorizontal: Spacing.four },
  icon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  person: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Palette.neutral800, flex: 1 },
  amount: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  detail: { fontSize: FontSize.xs, color: Palette.neutral500 },
  date: { fontSize: FontSize.xs, color: Palette.neutral400 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  groupName: { fontSize: FontSize.xs, color: Palette.primary400, fontWeight: FontWeight.medium },
});

// ── Summary bar ───────────────────────────────────────────────────────────────

function SummaryBar({ transactions }: { transactions: Transaction[] }) {
  const totalIn  = transactions.filter((t) => t.type === 'contribution').reduce((s, t) => s + t.amount, 0);
  const totalOut = transactions.filter((t) => t.type === 'withdrawal' && (t.status === 'paid' || t.status === 'approved')).reduce((s, t) => s + t.amount, 0);

  return (
    <View style={sbS.bar}>
      <View style={sbS.item}>
        <Text style={sbS.label}>Total cotisé</Text>
        <Text style={[sbS.value, { color: Palette.success600 }]}>+{totalIn.toLocaleString('fr-FR')}</Text>
      </View>
      <View style={sbS.sep} />
      <View style={sbS.item}>
        <Text style={sbS.label}>Total retiré</Text>
        <Text style={[sbS.value, { color: Palette.error500 }]}>-{totalOut.toLocaleString('fr-FR')}</Text>
      </View>
      <View style={sbS.sep} />
      <View style={sbS.item}>
        <Text style={sbS.label}>Transactions</Text>
        <Text style={sbS.value}>{transactions.length}</Text>
      </View>
    </View>
  );
}

const sbS = StyleSheet.create({
  bar: { flexDirection: 'row', backgroundColor: Palette.neutral0, borderBottomWidth: 1, borderBottomColor: Palette.neutral200 },
  item: { flex: 1, alignItems: 'center', paddingVertical: Spacing.three, gap: 2 },
  sep: { width: 1, backgroundColor: Palette.neutral200 },
  label: { fontSize: FontSize.xs, color: Palette.neutral500 },
  value: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Palette.neutral800 },
});

// ── Main screen ───────────────────────────────────────────────────────────────

export default function HistoryScreen() {
  const [groups, setGroups]             = useState<Group[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);

  const [typeFilter, setTypeFilter]     = useState<TxType>('all');
  const [payFilter, setPayFilter]       = useState<PaymentFilter>('all');
  const [groupFilter, setGroupFilter]   = useState<string>('all');
  const [onlyMine, setOnlyMine]         = useState(false);

  const user = useAuthStore((s) => s.user);

  async function loadAll(silent = false) {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const grps = await groupsApi.list();
      setGroups(grps);

      const allTx: Transaction[] = [];

      await Promise.all(grps.map(async (g) => {
        const [contribs, withdrawals] = await Promise.all([
          contributionsApi.list(g.id, { limit: 100 }).catch(() => [] as Contribution[]),
          withdrawalsApi.list(g.id).catch(() => [] as Withdrawal[]),
        ]);

        contribs.forEach((c) => {
          allTx.push({
            id: `c-${c.id}`,
            type: 'contribution',
            userId: c.user_id,
            date: c.created_at,
            amount: parseFloat(c.amount),
            person: c.member_name,
            detail: c.payment_method,
            groupName: g.name,
            currency: g.currency,
          });
        });

        withdrawals.forEach((w) => {
          allTx.push({
            id: `w-${w.id}`,
            type: 'withdrawal',
            userId: w.user_id,
            date: w.created_at,
            amount: parseFloat(w.amount),
            person: w.requester_name,
            detail: w.reason,
            status: w.status,
            groupName: g.name,
            currency: g.currency,
          });
        });
      }));

      // Tri par date décroissante
      allTx.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setTransactions(allTx);
    } catch (err) {
      console.error('History error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  // ── Filtres ──────────────────────────────────────────────────────────────────

  const filtered = transactions.filter((tx) => {
    if (onlyMine && tx.userId !== user?.id) return false;
    if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
    if (payFilter !== 'all' && tx.type === 'contribution' && tx.detail !== payFilter) return false;
    if (groupFilter !== 'all' && tx.groupName !== groupFilter) return false;
    return true;
  });

  if (loading) return <LoadingScreen message="Chargement de l'historique…" />;

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Historique" subtitle={`${filtered.length} transaction${filtered.length > 1 ? 's' : ''}`} />

      {/* Switch "Mes transactions seulement" */}
      <View style={styles.switchRow}>
        <Ionicons name="person-outline" size={16} color={onlyMine ? Palette.primary500 : Palette.neutral500} />
        <Text style={[styles.switchLabel, onlyMine && styles.switchLabelActive]}>
          Mes transactions seulement
        </Text>
        <Switch
          value={onlyMine}
          onValueChange={setOnlyMine}
          trackColor={{ false: Palette.neutral200, true: Palette.primary300 }}
          thumbColor={onlyMine ? Palette.primary500 : Palette.neutral400}
        />
      </View>

      {/* Filtres en ligne — type + paiement + groupe */}
      <View style={styles.filtersBar}>
        <SelectFilter
          label="Type"
          options={TYPE_OPTIONS}
          value={typeFilter}
          onChange={setTypeFilter}
          style={styles.filterItem}
        />
        {typeFilter !== 'withdrawal' && (
          <SelectFilter
            label="Paiement"
            options={PAYMENT_OPTIONS}
            value={payFilter}
            onChange={setPayFilter}
            style={styles.filterItem}
          />
        )}
        {groups.length > 1 && (
          <SelectFilter
            label="Groupe"
            options={[
              { label: 'Tous groupes', value: 'all' },
              ...groups.map((g) => ({ label: g.name, value: g.name })),
            ]}
            value={groupFilter}
            onChange={setGroupFilter}
            style={styles.filterItem}
          />
        )}
      </View>

      {/* Résumé */}
      {filtered.length > 0 && <SummaryBar transactions={filtered} />}

      {/* Liste */}
      <FlatList
        data={filtered}
        keyExtractor={(tx) => tx.id}
        renderItem={({ item }) => <TxRow tx={item} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadAll(true)} tintColor={Palette.primary500} />}
        ListEmptyComponent={
          <EmptyState
            title="Aucune transaction"
            message="Les cotisations et retraits apparaîtront ici."
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Palette.neutral50 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    backgroundColor: Palette.neutral0,
    borderBottomWidth: 1,
    borderBottomColor: Palette.neutral100,
  },
  switchLabel: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Palette.neutral500,
  },
  switchLabelActive: {
    color: Palette.primary500,
    fontWeight: FontWeight.semibold,
  },
  filtersBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    padding: Spacing.three,
    backgroundColor: Palette.neutral0,
    borderBottomWidth: 1,
    borderBottomColor: Palette.neutral200,
  },
  filterItem: { flex: 1, minWidth: 120 },
});
