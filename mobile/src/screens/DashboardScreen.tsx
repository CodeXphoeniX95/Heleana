import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuthStore } from '@/stores/auth.store';
import { dashboardApi, DashboardData, Contribution, Withdrawal, Group } from '@/lib/api';
import { AmountText, Badge, Card, EmptyState, LoadingScreen, statusLabel, statusToVariant } from '@/components/ui';
import { FontSize, FontWeight, Palette, Spacing, Radius } from '@/constants/theme';

const POLLING_INTERVAL = 30_000;
const MAX_RECENT       = 5;

// ── Greeting ──────────────────────────────────────────────────────────────────

function greet(name: string) {
  return `Salu, ${name.split(' ')[0]} 👋`;
}

// ── Solde perso card ──────────────────────────────────────────────────────────

function SoldeCard({ myTotal, groupCount, groupsBalance }: {
  myTotal: number; groupCount: number; groupsBalance: number;
}) {
  return (
    <View style={s.soldeCard}>
      <Text style={s.soldeLabel}>Mes cotisations totales</Text>
      <Text style={s.soldeAmount}>{myTotal.toLocaleString('fr-FR')} FCFA</Text>
      <View style={s.soldeRow}>
        <View style={s.soldeDetailItem}>
          <Ionicons name="trending-up" size={13} color={Palette.success300} />
          <Text style={s.soldeDetail}>
            Solde groupe{groupCount > 1 ? 's' : ''} : {groupsBalance.toLocaleString('fr-FR')} FCFA
          </Text>
        </View>
      </View>
      <Text style={s.soldeSub}>{groupCount} groupe{groupCount > 1 ? 's' : ''}</Text>
    </View>
  );
}

// ── Rows ──────────────────────────────────────────────────────────────────────

function ContributionRow({ item }: { item: Contribution }) {
  return (
    <View style={s.row}>
      <View style={s.avatarGreen}>
        <Ionicons name="arrow-up" size={15} color={Palette.success600} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.rowName}>{item.member_name}</Text>
        <Text style={s.rowMeta}>
          {new Date(item.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
        </Text>
      </View>
      <Text style={s.amountGreen}>+{parseFloat(String(item.amount)).toLocaleString('fr-FR')} FCFA</Text>
    </View>
  );
}

function WithdrawalRow({ item, onPress }: { item: Withdrawal; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={s.row}>
      <View style={s.avatarOrange}>
        <Ionicons name="arrow-down" size={15} color={Palette.warning600} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.rowName} numberOfLines={1}>{item.requester_name}</Text>
        <Text style={s.rowMeta} numberOfLines={1}>{item.reason}</Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <Text style={s.amountRed}>-{parseFloat(String(item.amount)).toLocaleString('fr-FR')} FCFA</Text>
        <Badge label={statusLabel(item.status)} variant={statusToVariant(item.status)} />
      </View>
    </Pressable>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const router = useRouter();
  const user   = useAuthStore((st) => st.user);

  const [data, setData]         = useState<DashboardData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadAll = useCallback(async (silent = false) => {
    if (!useAuthStore.getState().token) return;
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      // UN SEUL appel API — tout arrive en même temps
      const result = await dashboardApi.get();
      setData(result);
    } catch (err: any) {
      if (err?.message?.includes('Token') || err?.status === 401) {
        return; // Ignore deconnexion/token manquant silencieusement
      }
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!useAuthStore.getState().token) return;
    loadAll();
    pollingRef.current = setInterval(() => {
      if (useAuthStore.getState().token) {
        loadAll(true);
      }
    }, POLLING_INTERVAL);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [loadAll]);

  if (loading && !data) return <LoadingScreen message="Chargement…" />;

  const groups       = data?.groups ?? [];
  const contributions= data?.recent_contributions ?? [];
  const withdrawals  = data?.pending_withdrawals ?? [];
  const myTotal      = data?.my_total ?? 0;
  const groupsBalance= groups.reduce((s, g) => s + (g.balance ?? 0), 0);

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadAll(true)} tintColor={Palette.primary500} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting */}
        <View style={s.greetBlock}>
          <Text style={s.greet}>{greet(user?.name ?? 'vous')}</Text>
          <Text style={s.greetSub}>Voici un résumé de vos cotisations</Text>
        </View>

        {/* Solde perso */}
        {groups.length > 0 && (
          <SoldeCard
            myTotal={myTotal}
            groupCount={groups.length}
            groupsBalance={groupsBalance}
          />
        )}

        {/* Cotisations récentes */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Cotisations récentes</Text>
            {contributions.length > 0 && (
              <Text style={s.sectionCount}>{contributions.length} / {MAX_RECENT}</Text>
            )}
          </View>
          <Card>
            {contributions.length > 0
              ? contributions.map((c) => <ContributionRow key={c.id} item={c} />)
              : <Text style={s.empty}>Aucune cotisation enregistrée</Text>
            }
          </Card>
        </View>

        {/* Retraits en attente */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Retraits en attente</Text>
            {withdrawals.length > 0 && (
              <View style={s.badge}>
                <Text style={s.badgeText}>{withdrawals.length}</Text>
              </View>
            )}
          </View>
          <Card>
            {withdrawals.length > 0
              ? withdrawals.map((w) => (
                  <WithdrawalRow
                    key={w.id}
                    item={w}
                    onPress={() => router.push({
                      pathname: '/group/[groupId]/withdrawals',
                      params: { groupId: w.group_id }
                    } as any)}
                  />
                ))
              : <Text style={s.empty}>Aucun retrait en attente</Text>
            }
          </Card>
        </View>

        {/* Mes groupes */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Mes groupes</Text>
          {groups.length > 0 ? (
            groups.map((g) => (
              <Card
                key={g.id}
                onPress={() => router.push({
                  pathname: '/group/[groupId]/',
                  params: { groupId: g.id }
                } as any)}
                style={s.groupCard}
              >
                <View style={s.groupRow}>
                  <View style={s.groupAvatar}>
                    <Text style={s.groupAvatarText}>{g.name[0].toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.groupName}>{g.name}</Text>
                    <Text style={s.groupMeta}>
                      {g.member_count} membre{(g.member_count ?? 0) > 1 ? 's' : ''} · {g.currency}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Text style={[
                      s.groupBalance,
                      { color: (g.balance ?? 0) >= 0 ? Palette.success600 : Palette.error500 }
                    ]}>
                      {(g.balance ?? 0).toLocaleString('fr-FR')} {g.currency}
                    </Text>
                    <Badge
                      label={g.role === 'admin' ? 'Admin' : 'Membre'}
                      variant={g.role === 'admin' ? 'primary' : 'default'}
                    />
                  </View>
                </View>
              </Card>
            ))
          ) : (
            <EmptyState
              title="Aucun groupe"
              message="Rejoignez ou créez un groupe de cotisation"
              actionLabel="Voir les groupes"
              onAction={() => router.push('/(tabs)/groups' as any)}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Palette.neutral50 },
  scroll: { padding: Spacing.four, gap: Spacing.four, paddingBottom: 100 },

  greetBlock: { gap: 2 },
  greet:    { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Palette.primary500 },
  greetSub: { fontSize: FontSize.sm, color: Palette.neutral500 },

  soldeCard: {
    backgroundColor: Palette.primary500, borderRadius: Radius.xl,
    padding: Spacing.four, alignItems: 'center', gap: Spacing.one,
  },
  soldeLabel:  { fontSize: FontSize.sm, color: Palette.primary100 },
  soldeAmount: { fontSize: FontSize['3xl'], fontWeight: FontWeight.extrabold, color: Palette.neutral0 },
  soldeRow:    { flexDirection: 'row', gap: Spacing.four, marginTop: Spacing.one },
  soldeDetailItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  soldeDetail: { fontSize: FontSize.xs, color: Palette.primary200 },
  soldeSub:    { fontSize: FontSize.xs, color: Palette.primary300, marginTop: 2 },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.three,
    paddingVertical: Spacing.two, borderBottomWidth: 1, borderBottomColor: Palette.neutral100,
  },
  avatarGreen:  { width: 34, height: 34, borderRadius: 17, backgroundColor: Palette.success50,  alignItems: 'center', justifyContent: 'center' },
  avatarOrange: { width: 34, height: 34, borderRadius: 17, backgroundColor: Palette.warning50,  alignItems: 'center', justifyContent: 'center' },
  rowName: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Palette.neutral800 },
  rowMeta: { fontSize: FontSize.xs, color: Palette.neutral400, marginTop: 1 },
  amountGreen: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Palette.success600 },
  amountRed:   { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Palette.error500 },

  section:       { gap: Spacing.two },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle:  { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Palette.neutral800 },
  sectionCount:  { fontSize: FontSize.xs, color: Palette.neutral400 },
  badge: {
    backgroundColor: Palette.warning500, borderRadius: 10,
    minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5,
  },
  badgeText: { fontSize: FontSize.xs, color: Palette.neutral0, fontWeight: FontWeight.bold },
  empty: { fontSize: FontSize.sm, color: Palette.neutral400, textAlign: 'center', paddingVertical: Spacing.three },

  groupCard:       { marginBottom: Spacing.two },
  groupRow:        { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  groupAvatar:     { width: 42, height: 42, borderRadius: 21, backgroundColor: Palette.primary100, alignItems: 'center', justifyContent: 'center' },
  groupAvatarText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Palette.primary500 },
  groupName:       { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Palette.neutral800 },
  groupMeta:       { fontSize: FontSize.xs, color: Palette.neutral500, marginTop: 1 },
  groupBalance:    { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
});
