import { useCallback } from 'react';
import {
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { contributionsApi, groupsApi, GroupStats } from '@/lib/api';
import { useApi } from '@/hooks/use-api';
import { Card, EmptyState, LoadingScreen } from '@/components/ui';
import { ScreenHeader } from '@/components/ScreenHeader';
import { FontSize, FontWeight, Palette, Radius, Spacing } from '@/constants/theme';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_HEIGHT = 160;
const CHART_PAD    = Spacing.four * 2; // padding gauche + droite
const CHART_WIDTH  = SCREEN_WIDTH - CHART_PAD - 32; // 32 = card padding

// ── Helpers ───────────────────────────────────────────────────────────────────

function monthLabel(yyyyMM: string): string {
  const [y, m] = yyyyMM.split('-');
  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
  return months[parseInt(m, 10) - 1] ?? m;
}

// ── Composant graphique en barres ─────────────────────────────────────────────

function BarChart({ data }: { data: { month: string; total: number; count: number }[] }) {
  if (!data || data.length === 0) {
    return (
      <View style={chartS.empty}>
        <Text style={chartS.emptyText}>Aucune donnée disponible</Text>
      </View>
    );
  }

  const maxVal  = Math.max(...data.map((d) => d.total), 1);
  const barWidth = Math.max(
    Math.floor((CHART_WIDTH - (data.length - 1) * 4) / data.length),
    18
  );

  return (
    <View style={chartS.container}>
      {/* Lignes de référence */}
      <View style={chartS.gridLines}>
        {[1, 0.75, 0.5, 0.25].map((pct) => (
          <View key={pct} style={[chartS.gridLine, { bottom: pct * CHART_HEIGHT }]}>
            <Text style={chartS.gridLabel}>
              {(maxVal * pct / 1000).toFixed(0)}k
            </Text>
          </View>
        ))}
      </View>

      {/* Barres */}
      <View style={chartS.bars}>
        {data.map((d, i) => {
          const heightPct = d.total / maxVal;
          const barH      = Math.max(heightPct * CHART_HEIGHT, 4);
          const isMax     = d.total === maxVal;

          return (
            <View key={i} style={[chartS.barWrap, { width: barWidth }]}>
              {/* Valeur au-dessus */}
              <Text style={chartS.barValue} numberOfLines={1}>
                {d.total >= 1000
                  ? `${(d.total / 1000).toFixed(1)}k`
                  : d.total.toLocaleString('fr-FR')}
              </Text>
              {/* Barre */}
              <View
                style={[
                  chartS.bar,
                  {
                    height: barH,
                    width: barWidth - 4,
                    backgroundColor: isMax ? Palette.primary500 : Palette.primary300,
                  },
                ]}
              />
              {/* Label mois */}
              <Text style={chartS.barLabel}>{monthLabel(d.month)}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const chartS = StyleSheet.create({
  container: {
    height: CHART_HEIGHT + 60,
    position: 'relative',
  },
  gridLines: {
    position: 'absolute',
    left: 30,
    right: 0,
    top: 0,
    bottom: 24,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopColor: Palette.neutral100,
    borderStyle: 'dashed',
  },
  gridLabel: {
    position: 'absolute',
    left: -28,
    top: -8,
    fontSize: 9,
    color: Palette.neutral400,
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: CHART_HEIGHT,
    marginLeft: 30,
    gap: 4,
    marginTop: 8,
  },
  barWrap: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 2,
  },
  barValue: {
    fontSize: 8,
    color: Palette.primary600,
    fontWeight: FontWeight.semibold,
    marginBottom: 1,
  },
  bar: {
    borderRadius: 4,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 9,
    color: Palette.neutral500,
    marginTop: 4,
    textAlign: 'center',
  },
  empty: {
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: FontSize.sm,
    color: Palette.neutral400,
  },
});

// ── KPI card ──────────────────────────────────────────────────────────────────

function KpiCard({ icon, label, value, color }: {
  icon: string; label: string; value: string; color: string;
}) {
  return (
    <View style={kpiS.card}>
      <View style={[kpiS.iconWrap, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon as any} size={22} color={color} />
      </View>
      <Text style={kpiS.value}>{value}</Text>
      <Text style={kpiS.label}>{label}</Text>
    </View>
  );
}

const kpiS = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Palette.neutral0,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    alignItems: 'center',
    gap: Spacing.one,
    borderWidth: 1,
    borderColor: Palette.neutral200,
  },
  iconWrap: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  value: { fontSize: FontSize.md, fontWeight: FontWeight.extrabold, color: Palette.neutral800 },
  label: { fontSize: FontSize.xs, color: Palette.neutral500, textAlign: 'center' },
});

// ── Top member row ────────────────────────────────────────────────────────────

function TopMemberRow({
  rank,
  member,
  maxTotal,
}: {
  rank: number;
  member: GroupStats['top_members'][0];
  maxTotal: number;
}) {
  const pct = maxTotal > 0 ? member.total / maxTotal : 0;
  const medals = ['🥇', '🥈', '🥉'];

  return (
    <View style={tmS.row}>
      {/* Rang */}
      <Text style={tmS.medal}>{medals[rank] ?? `#${rank + 1}`}</Text>

      {/* Avatar */}
      <View style={tmS.avatar}>
        <Text style={tmS.avatarText}>{member.name[0].toUpperCase()}</Text>
      </View>

      {/* Info + barre */}
      <View style={{ flex: 1, gap: 4 }}>
        <View style={tmS.nameRow}>
          <Text style={tmS.name} numberOfLines={1}>{member.name}</Text>
          <Text style={tmS.total}>{member.total.toLocaleString('fr-FR')} FCFA</Text>
        </View>
        <View style={tmS.progressBg}>
          <View style={[tmS.progressFill, { width: `${Math.round(pct * 100)}%` as any }]} />
        </View>
        <Text style={tmS.meta}>{member.count} cotisation{member.count > 1 ? 's' : ''} · moy. {Math.round(member.average).toLocaleString('fr-FR')} FCFA</Text>
      </View>
    </View>
  );
}

const tmS = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.two, borderBottomWidth: 1, borderBottomColor: Palette.neutral100 },
  medal: { fontSize: 20, width: 28, textAlign: 'center' },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: Palette.primary100, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Palette.primary500 },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Palette.neutral800, flex: 1 },
  total: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Palette.success600 },
  progressBg: { height: 5, backgroundColor: Palette.neutral100, borderRadius: Radius.full, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Palette.primary400, borderRadius: Radius.full },
  meta: { fontSize: FontSize.xs, color: Palette.neutral400 },
});

// ── Main screen ───────────────────────────────────────────────────────────────

export default function StatsScreen() {
  const params  = useLocalSearchParams();
  const groupId = Array.isArray(params.groupId) ? params.groupId[0] : (params.groupId as string);

  const { data: stats, loading, error, refetch } = useApi(
    useCallback(() => contributionsApi.stats(groupId), [groupId])
  );
  const { data: group } = useApi(
    useCallback(() => groupsApi.get(groupId), [groupId])
  );

  if (loading && !stats) return <LoadingScreen message="Calcul des statistiques…" />;

  // Erreur API (route pas encore déployée ou autre)
  if (error) {
    return (
      <SafeAreaView style={s.safe}>
        <ScreenHeader title="Statistiques" showBack />
        <EmptyState
          title="Impossible de charger les statistiques"
          message={`Erreur : ${error}\n\nVérifiez que le backend est bien déployé.`}
          actionLabel="Réessayer"
          onAction={refetch}
        />
      </SafeAreaView>
    );
  }

  if (!stats || (stats.contribution_count === 0 && (!stats.my_stats || stats.my_stats.contribution_count === 0))) {
    return (
      <SafeAreaView style={s.safe}>
        <ScreenHeader title="Statistiques" showBack />
        <EmptyState
          title="Aucune donnée"
          message="Les statistiques apparaîtront dès que des cotisations seront enregistrées."
          actionLabel="Réessayer"
          onAction={refetch}
        />
      </SafeAreaView>
    );
  }

  const currency     = group?.currency ?? 'FCFA';
  const maxTopTotal  = stats.top_members.length > 0 ? stats.top_members[0].total : 1;

  return (
    <SafeAreaView style={s.safe}>
      <ScreenHeader
        title="Statistiques"
        subtitle={group?.name}
        showBack
        dark
      />

      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={Palette.primary500} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Mes stats personnelles ── */}
        {stats.my_stats && stats.my_stats.contribution_count > 0 && (
          <Card style={s.myCard}>
            <View style={s.cardHeader}>
              <Ionicons name="person-outline" size={18} color={Palette.primary500} />
              <Text style={s.cardTitle}>Mes statistiques personnelles</Text>
            </View>

            {/* Rang + part */}
            <View style={s.myHighlights}>
              <View style={s.myHighlight}>
                <Text style={s.myHighlightValue}>
                  {stats.my_stats.rank ? `#${stats.my_stats.rank}` : '—'}
                </Text>
                <Text style={s.myHighlightLabel}>Rang dans le groupe</Text>
              </View>
              <View style={s.myHighlightSep} />
              <View style={s.myHighlight}>
                <Text style={s.myHighlightValue}>{stats.my_stats.share_pct}%</Text>
                <Text style={s.myHighlightLabel}>Part du total</Text>
              </View>
              <View style={s.myHighlightSep} />
              <View style={s.myHighlight}>
                <Text style={s.myHighlightValue}>{stats.my_stats.contribution_count}</Text>
                <Text style={s.myHighlightLabel}>Cotisations</Text>
              </View>
            </View>

            {/* Barre de progression part */}
            <View style={s.shareBarWrap}>
              <View style={s.shareBarBg}>
                <View style={[s.shareBarFill, { width: `${Math.min(stats.my_stats.share_pct, 100)}%` as any }]} />
              </View>
              <Text style={s.shareBarLabel}>{stats.my_stats.share_pct}% du groupe</Text>
            </View>

            {/* KPIs perso */}
            <View style={s.myKpiRow}>
              <View style={s.myKpi}>
                <Text style={s.myKpiValue}>{stats.my_stats.total_contributed.toLocaleString('fr-FR')}</Text>
                <Text style={s.myKpiLabel}>Total cotisé ({currency})</Text>
              </View>
              <View style={s.myKpi}>
                <Text style={s.myKpiValue}>{Math.round(stats.my_stats.average_per_contribution).toLocaleString('fr-FR')}</Text>
                <Text style={s.myKpiLabel}>Moyenne/cotisation</Text>
              </View>
            </View>
            <View style={s.myKpiRow}>
              <View style={s.myKpi}>
                <Text style={[s.myKpiValue, { color: Palette.success600 }]}>{stats.my_stats.max_contribution.toLocaleString('fr-FR')}</Text>
                <Text style={s.myKpiLabel}>Plus grande cotisation</Text>
              </View>
              <View style={s.myKpi}>
                <Text style={[s.myKpiValue, { color: Palette.neutral600 }]}>{stats.my_stats.min_contribution.toLocaleString('fr-FR')}</Text>
                <Text style={s.myKpiLabel}>Plus petite cotisation</Text>
              </View>
            </View>

            {/* Mon graphique mensuel */}
            {stats.my_stats.monthly.length > 0 && (
              <View style={{ gap: Spacing.two, marginTop: Spacing.two }}>
                <Text style={s.mySubTitle}>Mes cotisations par mois</Text>
                <BarChart data={stats.my_stats.monthly} />
              </View>
            )}
          </Card>
        )}

        {/* ── KPIs groupe ── */}
        <View style={s.kpiRow}>
          <KpiCard
            icon="people-outline"
            label="Cotisations"
            value={stats.contribution_count.toString()}
            color={Palette.primary500}
          />
          <KpiCard
            icon="wallet-outline"
            label="Total collecté"
            value={`${(stats.total_contributed / 1000).toFixed(1)}k`}
            color={Palette.success500}
          />
          <KpiCard
            icon="trending-up"
            label="Moy. mensuelle"
            value={`${Math.round(stats.monthly_average).toLocaleString('fr-FR')}`}
            color={Palette.warning500}
          />
        </View>

        <View style={s.kpiRow}>
          <KpiCard
            icon="cash-outline"
            label="Moy. / cotisation"
            value={`${Math.round(stats.average_per_contribution).toLocaleString('fr-FR')}`}
            color={Palette.primary400}
          />
          <KpiCard
            icon="calendar-outline"
            label="Mois actifs"
            value={stats.monthly.length.toString()}
            color={Palette.neutral500}
          />
          <KpiCard
            icon="star-outline"
            label="Top contributeur"
            value={stats.top_members[0]?.name.split(' ')[0] ?? '—'}
            color={Palette.warning600}
          />
        </View>

        {/* ── Graphique mensuel ── */}
        <Card style={s.chartCard}>
          <View style={s.cardHeader}>
            <Ionicons name="bar-chart-outline" size={18} color={Palette.primary500} />
            <Text style={s.cardTitle}>Cotisations par mois (12 derniers mois)</Text>
          </View>
          <BarChart data={stats.monthly} />
        </Card>

        {/* ── Top membres ── */}
        <Card style={s.topCard}>
          <View style={s.cardHeader}>
            <Ionicons name="trophy-outline" size={18} color={Palette.warning500} />
            <Text style={s.cardTitle}>Top contributeurs</Text>
          </View>
          {stats.top_members.map((m, i) => (
            <TopMemberRow
              key={m.id}
              rank={i}
              member={m}
              maxTotal={maxTopTotal}
            />
          ))}
        </Card>

        {/* ── Détail mensuel ── */}
        {stats.monthly.length > 0 && (
          <Card style={s.tableCard}>
            <View style={s.cardHeader}>
              <Ionicons name="list-outline" size={18} color={Palette.neutral600} />
              <Text style={s.cardTitle}>Détail mensuel</Text>
            </View>
            <View style={s.tableHeader}>
              <Text style={[s.tableCell, s.tableCellHeader, { flex: 2 }]}>Mois</Text>
              <Text style={[s.tableCell, s.tableCellHeader]}>Nb</Text>
              <Text style={[s.tableCell, s.tableCellHeader, { flex: 2, textAlign: 'right' }]}>Total</Text>
            </View>
            {[...stats.monthly].reverse().map((m, i) => (
              <View key={i} style={[s.tableRow, i % 2 === 0 && s.tableRowAlt]}>
                <Text style={[s.tableCell, { flex: 2 }]}>{monthLabel(m.month)} {m.month.split('-')[0]}</Text>
                <Text style={s.tableCell}>{m.count}</Text>
                <Text style={[s.tableCell, { flex: 2, textAlign: 'right', color: Palette.success600, fontWeight: FontWeight.semibold }]}>
                  {m.total.toLocaleString('fr-FR')} {currency}
                </Text>
              </View>
            ))}
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Palette.neutral50 },
  scroll: { padding: Spacing.four, gap: Spacing.three, paddingBottom: 100 },

  kpiRow: { flexDirection: 'row', gap: Spacing.two },

  chartCard: { gap: Spacing.three },
  topCard:   { gap: Spacing.one },
  tableCard: { gap: Spacing.two },
  myCard:    { gap: Spacing.three, borderLeftWidth: 3, borderLeftColor: Palette.primary500 },

  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  cardTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Palette.neutral700 },

  // Mes stats highlights
  myHighlights: { flexDirection: 'row', backgroundColor: Palette.primary50, borderRadius: Radius.md, padding: Spacing.three },
  myHighlight: { flex: 1, alignItems: 'center', gap: 2 },
  myHighlightSep: { width: 1, backgroundColor: Palette.primary200 },
  myHighlightValue: { fontSize: FontSize.xl, fontWeight: FontWeight.extrabold, color: Palette.primary500 },
  myHighlightLabel: { fontSize: FontSize.xs, color: Palette.neutral500, textAlign: 'center' },

  // Barre de part
  shareBarWrap: { gap: 4 },
  shareBarBg: { height: 8, backgroundColor: Palette.neutral200, borderRadius: Radius.full, overflow: 'hidden' },
  shareBarFill: { height: '100%', backgroundColor: Palette.primary500, borderRadius: Radius.full },
  shareBarLabel: { fontSize: FontSize.xs, color: Palette.neutral500, textAlign: 'right' },

  // KPIs perso
  myKpiRow: { flexDirection: 'row', gap: Spacing.two },
  myKpi: { flex: 1, backgroundColor: Palette.neutral50, borderRadius: Radius.md, padding: Spacing.two, gap: 2 },
  myKpiValue: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Palette.neutral800 },
  myKpiLabel: { fontSize: FontSize.xs, color: Palette.neutral400 },
  mySubTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Palette.neutral700 },

  tableHeader: { flexDirection: 'row', paddingVertical: Spacing.two, borderBottomWidth: 2, borderBottomColor: Palette.neutral200 },
  tableRow: { flexDirection: 'row', paddingVertical: Spacing.two },
  tableRowAlt: { backgroundColor: Palette.neutral50 },
  tableCell: { flex: 1, fontSize: FontSize.xs, color: Palette.neutral700 },
  tableCellHeader: { fontWeight: FontWeight.bold, color: Palette.neutral500, fontSize: FontSize.xs },
});
