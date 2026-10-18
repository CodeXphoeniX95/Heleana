import { useCallback, useState } from 'react';
import {
  Alert, Pressable, RefreshControl, ScrollView,
  Share, StyleSheet, Text, View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { groupsApi, membersApi, Member, GroupDetail } from '@/lib/api';
import { useCache } from '@/hooks/use-cache';
import { AmountText, Badge, Button, Card, EmptyState, LoadingScreen } from '@/components/ui';
import { ScreenHeader } from '@/components/ScreenHeader';
import { ObjectivesSection } from '@/components/ObjectivesSection';
import { SearchMemberModal } from '@/components/SearchMemberModal';
import { useAuthStore } from '@/stores/auth.store';
import { FontSize, FontWeight, Palette, Spacing, Radius } from '@/constants/theme';

// ── Member row ────────────────────────────────────────────────────────────────

function MemberRow({ member, isMe, isAdmin, onRemove }: {
  member: Member; isMe: boolean; isAdmin: boolean; onRemove: () => void;
}) {
  return (
    <View style={mS.row}>
      <View style={[mS.avatar, { backgroundColor: isMe ? Palette.primary500 : Palette.primary100 }]}>
        <Text style={[mS.avatarText, { color: isMe ? Palette.neutral0 : Palette.primary500 }]}>
          {member.name[0].toUpperCase()}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={mS.name}>{member.name}{isMe ? ' (moi)' : ''}</Text>
        <Text style={mS.contact} numberOfLines={1}>{member.email ?? member.phone ?? '—'}</Text>
      </View>
      <Badge label={member.role === 'admin' ? 'Admin' : 'Membre'} variant={member.role === 'admin' ? 'primary' : 'default'} />
      {isAdmin && !isMe && (
        <Pressable onPress={onRemove} style={mS.removeBtn}>
          <Ionicons name="close-circle-outline" size={20} color={Palette.error400} />
        </Pressable>
      )}
    </View>
  );
}

const mS = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.three, borderBottomWidth: 1, borderBottomColor: Palette.neutral100 },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: FontSize.base, fontWeight: FontWeight.bold },
  name: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Palette.neutral800 },
  contact: { fontSize: FontSize.xs, color: Palette.neutral400, marginTop: 1 },
  removeBtn: { padding: Spacing.one },
});

// ── Info row ──────────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={iS.row}>
      <Text style={iS.label}>{label}</Text>
      <Text style={iS.value}>{value}</Text>
    </View>
  );
}

const iS = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.two, borderBottomWidth: 1, borderBottomColor: Palette.neutral100 },
  label: { fontSize: FontSize.sm, color: Palette.neutral500 },
  value: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Palette.neutral800, maxWidth: '55%', textAlign: 'right' },
});

// ── Main screen ───────────────────────────────────────────────────────────────

export default function GroupDetailScreen() {
  const router  = useRouter();
  const params  = useLocalSearchParams();
  const groupId = Array.isArray(params.groupId) ? params.groupId[0] : (params.groupId as string);
  const user    = useAuthStore((s) => s.user);
  const [showSearch, setShowSearch] = useState(false);

  // Un seul appel API pour tout charger
  const { data, loading, refreshing, refetch } = useCache<GroupDetail>(
    useCallback(() => groupsApi.detail(groupId), [groupId]),
    `group-detail-${groupId}`
  );

  const group    = data?.group;
  const members  = data?.members ?? [];
  const dash     = data?.dashboard;
  const isAdmin  = data?.my_role === 'admin';

  async function handleRemoveMember(m: Member) {
    Alert.alert('Retirer le membre', `Retirer ${m.name} du groupe ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Retirer', style: 'destructive',
        onPress: async () => {
          try { await membersApi.remove(groupId, m.user_id); refetch(); }
          catch (err) { Alert.alert('Erreur', (err as Error).message); }
        },
      },
    ]);
  }

  async function handleShare() {
    if (!group) return;
    await Share.share({
      message: `Rejoins mon groupe "${group.name}" sur Heleanaf 💰\nCode : ${group.invite_code}`,
    });
  }

  if (loading) return <LoadingScreen message="Chargement du groupe…" />;
  if (!group)  return <EmptyState title="Groupe introuvable" message="Ce groupe n'existe pas ou vous n'y avez pas accès." />;

  const freqLabels: Record<string, string>  = { weekly: 'Hebdomadaire', monthly: 'Mensuelle', other: 'Autre' };
  const validLabels: Record<string, string> = { majority: 'Majorité simple', unanimity: 'Unanimité', percentage: `${group.validation_pct}%` };

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader
        title={group.name}
        subtitle={`${members.length} membres`}
        showBack
        dark
        rightAction={
          <Pressable onPress={handleShare} style={styles.shareBtn}>
            <Ionicons name="share-social" size={20} color={Palette.neutral0} />
          </Pressable>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refetch} tintColor={Palette.primary500} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Solde ── */}
        {dash && (
          <View style={styles.soldeCard}>
            <View style={styles.soldeItem}>
              <Text style={styles.soldeLabel}>Cotisé</Text>
              <Text style={styles.soldeValue}>{parseFloat(String(dash.total_contributed)).toLocaleString('fr-FR')}</Text>
            </View>
            <View style={styles.soldeSep} />
            <View style={styles.soldeItem}>
              <Text style={styles.soldeLabel}>Retiré</Text>
              <Text style={[styles.soldeValue, { color: Palette.error400 }]}>{parseFloat(String(dash.total_withdrawn)).toLocaleString('fr-FR')}</Text>
            </View>
            <View style={styles.soldeSep} />
            <View style={styles.soldeItem}>
              <Text style={styles.soldeLabel}>Solde</Text>
              <Text style={[styles.soldeValue, { color: parseFloat(String(dash.balance)) >= 0 ? Palette.success500 : Palette.error500 }]}>
                {parseFloat(String(dash.balance)).toLocaleString('fr-FR')}
              </Text>
            </View>
          </View>
        )}

        {/* ── Code invitation ── */}
        <Card style={styles.inviteCard}>
          <View style={styles.inviteTop}>
            <View>
              <Text style={styles.inviteLabel}>Code d'invitation</Text>
              <Text style={styles.inviteCode}>{group.invite_code}</Text>
            </View>
            <Button label="Partager" onPress={handleShare} size="sm" variant="outline" />
          </View>
          <Text style={styles.inviteHint}>Partagez ce code pour inviter des membres</Text>
        </Card>

        {/* ── Actions rapides ── */}
        <View style={styles.actionsRow}>
          <Pressable style={styles.actionBtn} onPress={() => router.push({ pathname: '/group/[groupId]/contributions', params: { groupId } } as any)}>
            <View style={[styles.actionIconWrap, { backgroundColor: Palette.success50 }]}>
              <Ionicons name="wallet" size={24} color={Palette.success600} />
            </View>
            <Text style={styles.actionLabel}>Cotisations</Text>
          </Pressable>
          <Pressable style={styles.actionBtn} onPress={() => router.push({ pathname: '/group/[groupId]/withdrawals', params: { groupId } } as any)}>
            <View style={[styles.actionIconWrap, { backgroundColor: Palette.warning50 }]}>
              <Ionicons name="cash" size={24} color={Palette.warning600} />
            </View>
            <Text style={styles.actionLabel}>Retraits</Text>
          </Pressable>
          <Pressable style={styles.actionBtn} onPress={() => router.push({ pathname: '/group/[groupId]/stats', params: { groupId } } as any)}>
            <View style={[styles.actionIconWrap, { backgroundColor: Palette.primary50 }]}>
              <Ionicons name="bar-chart-outline" size={24} color={Palette.primary500} />
            </View>
            <Text style={styles.actionLabel}>Statistiques</Text>
          </Pressable>
        </View>

        {/* ── Membres ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Membres ({members.length})</Text>
            {isAdmin && (
              <Pressable onPress={() => setShowSearch(true)} style={styles.addMemberBtn}>
                <Ionicons name="person-add-outline" size={14} color={Palette.neutral0} />
                <Text style={styles.addMemberText}>Ajouter</Text>
              </Pressable>
            )}
          </View>
          <Card>
            {members.map((m) => (
              <MemberRow
                key={m.id}
                member={m}
                isMe={m.user_id === user?.id}
                isAdmin={isAdmin}
                onRemove={() => handleRemoveMember(m)}
              />
            ))}
          </Card>
        </View>

        {/* ── Objectifs & Budget ── */}
        <ObjectivesSection
          groupId={groupId}
          isAdmin={isAdmin}
          userId={user?.id ?? ''}
          groupBalance={dash ? parseFloat(String(dash.balance)) : 0}
        />

        {/* ── Paramètres ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Paramètres</Text>
          <Card>
            <InfoRow label="Devise" value={group.currency} />
            <InfoRow
              label="Cotisation"
              value={group.contribution_rule === 'fixed'
                ? `${parseFloat(group.fixed_amount ?? '0').toLocaleString('fr-FR')} ${group.currency}`
                : 'Montant libre'}
            />
            <InfoRow label="Fréquence"            value={freqLabels[group.frequency]          ?? group.frequency} />
            <InfoRow label="Validation retraits"  value={validLabels[group.validation_rule]   ?? group.validation_rule} />
          </Card>
        </View>
      </ScrollView>

      {isAdmin && (
        <SearchMemberModal
          visible={showSearch}
          groupId={groupId}
          existingMemberIds={members.map((m) => m.user_id)}
          onClose={() => setShowSearch(false)}
          onAdded={() => { refetch(); setShowSearch(false); }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Palette.neutral50 },
  scroll: { padding: Spacing.four, gap: Spacing.four, paddingBottom: 100 },

  shareBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },

  soldeCard: { flexDirection: 'row', backgroundColor: Palette.neutral0, borderRadius: Radius.lg, padding: Spacing.four, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4 },
  soldeItem: { flex: 1, alignItems: 'center', gap: 4 },
  soldeSep:  { width: 1, backgroundColor: Palette.neutral200 },
  soldeLabel:{ fontSize: FontSize.xs, color: Palette.neutral400, textTransform: 'uppercase', letterSpacing: 0.5 },
  soldeValue:{ fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Palette.neutral800 },

  inviteCard: { gap: Spacing.two },
  inviteTop:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  inviteLabel:{ fontSize: FontSize.xs, color: Palette.neutral500, marginBottom: 2 },
  inviteCode: { fontSize: FontSize['2xl'], fontWeight: FontWeight.extrabold, color: Palette.primary500, letterSpacing: 6 },
  inviteHint: { fontSize: FontSize.xs, color: Palette.neutral400, lineHeight: 18 },

  actionsRow: { flexDirection: 'row', gap: Spacing.three },
  actionBtn:  { flex: 1, backgroundColor: Palette.neutral0, borderRadius: Radius.lg, padding: Spacing.three, alignItems: 'center', gap: Spacing.two, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4 },
  actionIconWrap: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  actionLabel:{ fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Palette.neutral700 },

  section:      { gap: Spacing.two },
  sectionHeader:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Palette.neutral800 },
  addMemberBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Palette.primary500, borderRadius: Radius.full, paddingHorizontal: Spacing.three, paddingVertical: Spacing.one },
  addMemberText:{ fontSize: FontSize.xs, color: Palette.neutral0, fontWeight: FontWeight.medium },
});
