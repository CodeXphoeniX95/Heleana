/**
 * ObjectivesSection — section "Objectifs & Budget" dans le détail d'un groupe.
 * Affiche la liste des objectifs, permet d'en créer, toggler (accompli/non),
 * et supprimer (créateur ou admin).
 */
import { useCallback, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { objectivesApi, Objective } from '@/lib/api';
import { useApi } from '@/hooks/use-api';
import { Button, Card, EmptyState, Input } from '@/components/ui';
import { FontSize, FontWeight, Palette, Radius, Spacing } from '@/constants/theme';

// ── Create objective modal ────────────────────────────────────────────────────

function CreateObjectiveModal({
  visible,
  groupId,
  onClose,
  onSaved,
}: {
  visible: boolean;
  groupId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle]       = useState('');
  const [description, setDesc]  = useState('');
  const [budget, setBudget]     = useState('');
  const [day, setDay]           = useState('');
  const [month, setMonth]       = useState('');
  const [year, setYear]         = useState('');
  const [loading, setLoading]   = useState(false);
  const [errors, setErrors]     = useState<Record<string, string>>({});

  function getDate(): string | undefined {
    if (year.length === 4 && month.length === 2 && day.length === 2) {
      return `${year}-${month}-${day}`;
    }
    return undefined;
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = 'Le titre est requis';
    const parsedBudget = parseFloat(budget);
    if (!budget.trim() || isNaN(parsedBudget) || parsedBudget <= 0) {
      e.budget = 'Le budget cible est obligatoire (> 0)';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setLoading(true);
    try {
      await objectivesApi.create(groupId, {
        title: title.trim(),
        description: description.trim() || undefined,
        budget: parseFloat(budget),
        target_date: getDate(),
      });
      onSaved();
      onClose();
      setTitle(''); setDesc(''); setBudget('');
      setDay(''); setMonth(''); setYear(''); setErrors({});
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
          <Text style={mS.title}>Nouvel objectif</Text>
          <Pressable onPress={onClose}>
            <Text style={mS.cancel}>Annuler</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={mS.form} keyboardShouldPersistTaps="handled">

          <Input
            label="Titre *"
            value={title}
            onChangeText={setTitle}
            placeholder="Ex: Achat terrain, Voyage groupe…"
            error={errors.title}
          />

          <Input
            label="Description (optionnel)"
            value={description}
            onChangeText={setDesc}
            placeholder="Décrivez cet objectif…"
            multiline
            numberOfLines={3}
          />

          <Input
            label="Budget cible (FCFA) *"
            value={budget}
            onChangeText={setBudget}
            keyboardType="numeric"
            placeholder="Ex: 500 000"
            error={errors.budget}
          />

          <View>
            <Text style={mS.dateLabel}>Date cible (optionnel)</Text>
            <View style={mS.dateRow}>
              <View style={{ flex: 1 }}>
                <Text style={mS.dateSub}>Jour</Text>
                <Input value={day} onChangeText={setDay} keyboardType="numeric" placeholder="JJ" maxLength={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={mS.dateSub}>Mois</Text>
                <Input value={month} onChangeText={setMonth} keyboardType="numeric" placeholder="MM" maxLength={2} />
              </View>
              <View style={{ flex: 2 }}>
                <Text style={mS.dateSub}>Année</Text>
                <Input value={year} onChangeText={setYear} keyboardType="numeric" placeholder="AAAA" maxLength={4} />
              </View>
            </View>
          </View>

          <Button label="Créer l'objectif" onPress={handleSave} loading={loading} fullWidth size="lg" />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ── Objective card ────────────────────────────────────────────────────────────

function ObjectiveCard({
  item,
  groupId,
  isAdmin,
  canDelete,
  onToggle,
  onDelete,
  groupBalance,
}: {
  item: Objective;
  groupId: string;
  isAdmin: boolean;
  canDelete: boolean;
  onToggle: () => void;
  onDelete: () => void;
  groupBalance: number;
}) {
  const hasDate   = !!item.target_date;
  const hasBudget = !!item.budget;
  const budget    = item.budget ? parseFloat(item.budget) : 0;

  // Objectif atteignable : solde ≥ budget ET pas encore accompli
  const isReachable = hasBudget && !item.is_achieved && groupBalance >= budget;

  function handleTogglePress() {
    if (!isAdmin) {
      Alert.alert(
        'Action réservée',
        'Seul un administrateur du groupe peut marquer un objectif comme accompli ou non.'
      );
      return;
    }

    if (!item.is_achieved) {
      Alert.alert(
        'Confirmer l\'accomplissement',
        `Voulez-vous vraiment marquer l'objectif "${item.title}" comme accompli ?\n\nLe budget (${budget.toLocaleString('fr-FR')} FCFA) sera déduit du solde disponible de la caisse et cet objectif ne pourra plus être supprimé.`,
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Confirmer', style: 'default', onPress: onToggle },
        ]
      );
    } else {
      Alert.alert(
        'Réouvrir l\'objectif',
        `Voulez-vous réouvrir l'objectif "${item.title}" ?\n\nSon budget réintégrera le solde disponible de la caisse.`,
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Réouvrir', style: 'default', onPress: onToggle },
        ]
      );
    }
  }

  // Calcul jours restants
  let daysLeft: number | null = null;
  if (hasDate) {
    const diff = new Date(item.target_date!).getTime() - Date.now();
    daysLeft = Math.ceil(diff / 86_400_000);
  }

  // Progression vers le budget
  const progressPct = hasBudget && budget > 0
    ? Math.min(Math.round((groupBalance / budget) * 100), 100)
    : 0;

  return (
    <View style={[
      oS.card,
      item.is_achieved && oS.cardDone,
      isReachable && oS.cardReachable,   // vert si atteignable
    ]}>
      {/* Ligne principale */}
      <View style={oS.topRow}>
        {/* Checkbox toggle (seul admin peut cliquer) */}
        <Pressable
          onPress={handleTogglePress}
          style={[
            oS.checkbox,
            item.is_achieved && oS.checkboxDone,
            !isAdmin && { opacity: 0.6 },
          ]}
        >
          {item.is_achieved && <Ionicons name="checkmark" size={14} color={Palette.neutral0} />}
        </Pressable>

        <View style={{ flex: 1 }}>
          <Text style={[oS.title, item.is_achieved && oS.titleDone]}>{item.title}</Text>
          {item.description ? (
            <Text style={oS.desc} numberOfLines={2}>{item.description}</Text>
          ) : null}
        </View>

        {canDelete && !item.is_achieved && (
          <Pressable onPress={onDelete} style={oS.deleteBtn}>
            <Ionicons name="trash-outline" size={16} color={Palette.error400} />
          </Pressable>
        )}
      </View>

      {/* Budget + barre de progression + date */}
      {(hasBudget || hasDate) && (
        <View style={oS.metaRow}>
          {hasBudget && (
            <View style={[oS.metaChip, isReachable && oS.metaChipReachable]}>
              <Ionicons
                name="wallet-outline"
                size={12}
                color={isReachable ? Palette.success600 : Palette.primary500}
              />
              <Text style={[oS.metaText, isReachable && { color: Palette.success700 }]}>
                {budget.toLocaleString('fr-FR')} FCFA
              </Text>
            </View>
          )}
          {hasDate && (
            <View style={[oS.metaChip, daysLeft !== null && daysLeft < 0 && oS.metaChipLate]}>
              <Ionicons name="calendar-outline" size={12} color={daysLeft !== null && daysLeft < 0 ? Palette.error500 : Palette.neutral500} />
              <Text style={[oS.metaText, daysLeft !== null && daysLeft < 0 && { color: Palette.error500 }]}>
                {new Date(item.target_date!).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                {daysLeft !== null && !item.is_achieved && (
                  daysLeft < 0
                    ? ` (${Math.abs(daysLeft)}j de retard)`
                    : daysLeft === 0
                    ? " (aujourd'hui)"
                    : ` (dans ${daysLeft}j)`
                )}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Barre de progression vers le budget */}
      {hasBudget && !item.is_achieved && (
        <View style={oS.progressWrap}>
          <View style={oS.progressBg}>
            <View style={[
              oS.progressFill,
              {
                width: `${progressPct}%` as any,
                backgroundColor: isReachable ? Palette.success500 : Palette.primary400,
              },
            ]} />
          </View>
          <Text style={[oS.progressLabel, isReachable && { color: Palette.success700, fontWeight: '700' as any }]}>
            {isReachable ? `✅ 100% — Objectif Atteint (${groupBalance.toLocaleString('fr-FR')} FCFA disponibles)` : `${progressPct}% — ${groupBalance.toLocaleString('fr-FR')} / ${budget.toLocaleString('fr-FR')} FCFA`}
          </Text>
        </View>
      )}

      {/* Badge atteignable / finançable */}
      {isReachable && (
        <View style={oS.reachableBadge}>
          <Ionicons name="checkmark-circle" size={18} color={Palette.success600} />
          <View style={{ flex: 1 }}>
            <Text style={oS.reachableText}>🎯 Objectif Atteint par la caisse !</Text>
            <Text style={oS.reachableSubText}>
              La caisse a accumulé {groupBalance.toLocaleString('fr-FR')} FCFA, soit plus que le budget de {budget.toLocaleString('fr-FR')} FCFA.
            </Text>
          </View>
        </View>
      )}

      {/* Statut accompli */}
      {item.is_achieved && item.achieved_at && (
        <View style={oS.achievedBadge}>
          <Ionicons name="checkmark-circle" size={13} color={Palette.success600} />
          <Text style={oS.achievedText}>
            Accompli le {new Date(item.achieved_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
          </Text>
        </View>
      )}
    </View>
  );
}

// ── Main section ──────────────────────────────────────────────────────────────

interface ObjectivesSectionProps {
  groupId: string;
  isAdmin: boolean;
  userId: string;
  groupBalance?: number;  // solde actuel du groupe
}

export function ObjectivesSection({ groupId, isAdmin, userId, groupBalance = 0 }: ObjectivesSectionProps) {
  const [showCreate, setShowCreate] = useState(false);

  const { data: objectives, loading, refetch } = useApi(
    useCallback(() => objectivesApi.list(groupId), [groupId])
  );

  async function handleToggle(obj: Objective) {
    try {
      await objectivesApi.toggle(groupId, obj.id);
      refetch();
    } catch (err) {
      Alert.alert('Erreur', (err as Error).message);
    }
  }

  async function handleDelete(obj: Objective) {
    if (obj.is_achieved) {
      Alert.alert('Action impossible', 'Un objectif accompli ne peut pas être supprimé.');
      return;
    }
    Alert.alert(
      'Supprimer',
      `Supprimer l'objectif "${obj.title}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer', style: 'destructive',
          onPress: async () => {
            try { await objectivesApi.delete(groupId, obj.id); refetch(); }
            catch (err) { Alert.alert('Erreur', (err as Error).message); }
          },
        },
      ]
    );
  }

  const pending   = objectives?.filter((o) => !o.is_achieved) ?? [];
  const achieved  = objectives?.filter((o) => o.is_achieved) ?? [];
  const reachable = objectives?.filter(
    (o) => !o.is_achieved && o.budget && groupBalance >= parseFloat(o.budget)
  ) ?? [];

  return (
    <View style={s.container}>
      {/* Header section */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Ionicons name="flag-outline" size={18} color={Palette.primary500} />
          <Text style={s.sectionTitle}>Objectifs & Budget</Text>
          {objectives && objectives.length > 0 && (
            <View style={s.countBadge}>
              <Text style={s.countText}>{objectives.length}</Text>
            </View>
          )}
        </View>
        <Pressable onPress={() => setShowCreate(true)} style={s.addBtn}>
          <Ionicons name="add" size={18} color={Palette.neutral0} />
        </Pressable>
      </View>

      {/* Bannière de notification des objectifs atteints */}
      {reachable.length > 0 && (
        <View style={s.summaryBanner}>
          <Ionicons name="trophy" size={22} color={Palette.success600} />
          <View style={{ flex: 1 }}>
            <Text style={s.summaryBannerTitle}>
              🎉 {reachable.length} objectif{reachable.length > 1 ? 's' : ''} atteignable{reachable.length > 1 ? 's' : ''} !
            </Text>
            <Text style={s.summaryBannerSub}>
              Le solde de la caisse ({groupBalance.toLocaleString('fr-FR')} FCFA) permet de financer :{' '}
              {reachable.map((o) => `"${o.title}" (${parseFloat(o.budget!).toLocaleString('fr-FR')} FCFA)`).join(', ')}.
            </Text>
          </View>
        </View>
      )}

      {/* Liste */}
      {loading ? (
        <Text style={s.loading}>Chargement…</Text>
      ) : objectives && objectives.length > 0 ? (
        <View style={s.list}>
          {/* En cours */}
          {pending.length > 0 && (
            <View style={s.subSection}>
              <Text style={s.subTitle}>En cours ({pending.length})</Text>
              {pending.map((obj) => (
                <ObjectiveCard
                  key={obj.id}
                  item={obj}
                  groupId={groupId}
                  isAdmin={isAdmin}
                  canDelete={isAdmin || obj.created_by === userId}
                  onToggle={() => handleToggle(obj)}
                  onDelete={() => handleDelete(obj)}
                  groupBalance={groupBalance}
                />
              ))}
            </View>
          )}

          {/* Accomplis */}
          {achieved.length > 0 && (
            <View style={s.subSection}>
              <Text style={s.subTitle}>Accomplis ({achieved.length})</Text>
              {achieved.map((obj) => (
                <ObjectiveCard
                  key={obj.id}
                  item={obj}
                  groupId={groupId}
                  isAdmin={isAdmin}
                  canDelete={isAdmin || obj.created_by === userId}
                  onToggle={() => handleToggle(obj)}
                  onDelete={() => handleDelete(obj)}
                  groupBalance={groupBalance}
                />
              ))}
            </View>
          )}
        </View>
      ) : (
        <View style={s.empty}>
          <Ionicons name="flag-outline" size={32} color={Palette.neutral300} />
          <Text style={s.emptyText}>Aucun objectif pour ce groupe</Text>
          <Text style={s.emptySubText}>Définissez vos projets et budgets cibles</Text>
          <Button label="Ajouter un objectif" onPress={() => setShowCreate(true)} size="sm" variant="outline" style={{ marginTop: Spacing.two }} />
        </View>
      )}

      <CreateObjectiveModal
        visible={showCreate}
        groupId={groupId}
        onClose={() => setShowCreate(false)}
        onSaved={refetch}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { gap: Spacing.two },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  sectionTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Palette.neutral800 },
  countBadge: { backgroundColor: Palette.primary100, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 },
  countText: { fontSize: FontSize.xs, color: Palette.primary600, fontWeight: FontWeight.bold },
  addBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: Palette.primary500, alignItems: 'center', justifyContent: 'center' },
  summaryBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two,
    backgroundColor: Palette.success50, borderWidth: 1.5, borderColor: Palette.success300,
    borderRadius: Radius.md, padding: Spacing.three,
  },
  summaryBannerTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Palette.success700 },
  summaryBannerSub: { fontSize: FontSize.xs, color: Palette.success600, marginTop: 2, lineHeight: 18 },
  list: { gap: Spacing.two },
  subSection: { gap: Spacing.one },
  subTitle: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Palette.neutral500, textTransform: 'uppercase', letterSpacing: 0.5 },
  empty: { alignItems: 'center', paddingVertical: Spacing.four, gap: Spacing.one },
  emptyText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Palette.neutral600 },
  emptySubText: { fontSize: FontSize.xs, color: Palette.neutral400, textAlign: 'center' },
  loading: { fontSize: FontSize.sm, color: Palette.neutral400, textAlign: 'center', paddingVertical: Spacing.three },
});

const oS = StyleSheet.create({
  card: {
    backgroundColor: Palette.neutral0, borderRadius: Radius.md,
    padding: Spacing.three, gap: Spacing.two,
    borderLeftWidth: 3, borderLeftColor: Palette.primary400,
    borderWidth: 1, borderColor: Palette.neutral200,
  },
  cardDone:      { borderLeftColor: Palette.success500, opacity: 0.8 },
  cardReachable: { borderLeftColor: Palette.success500, borderColor: Palette.success300, backgroundColor: Palette.success50 },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  checkbox: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: Palette.primary400,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 1,
  },
  checkboxDone: { backgroundColor: Palette.success500, borderColor: Palette.success500 },
  title: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Palette.neutral800, flex: 1 },
  titleDone: { textDecorationLine: 'line-through', color: Palette.neutral400 },
  desc: { fontSize: FontSize.xs, color: Palette.neutral500, marginTop: 2, lineHeight: 18 },
  deleteBtn: { padding: Spacing.one },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Palette.neutral50, borderRadius: Radius.full, paddingHorizontal: Spacing.two, paddingVertical: 3 },
  metaChipLate:      { backgroundColor: Palette.error50 },
  metaChipReachable: { backgroundColor: Palette.success100, borderWidth: 1, borderColor: Palette.success300 },
  metaText: { fontSize: FontSize.xs, color: Palette.neutral600 },
  // Barre de progression
  progressWrap: { gap: 3 },
  progressBg:   { height: 6, backgroundColor: Palette.neutral200, borderRadius: Radius.full, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: Radius.full },
  progressLabel:{ fontSize: FontSize.xs, color: Palette.neutral500 },
  // Badge atteignable
  reachableBadge: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two, backgroundColor: Palette.success100, borderWidth: 1, borderColor: Palette.success300, borderRadius: Radius.md, padding: Spacing.two },
  reachableText:  { fontSize: FontSize.xs, color: Palette.success700, fontWeight: FontWeight.bold },
  reachableSubText: { fontSize: FontSize.xs, color: Palette.success600, marginTop: 1, lineHeight: 16 },
  achievedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  achievedText: { fontSize: FontSize.xs, color: Palette.success600, fontWeight: FontWeight.medium },
});

const mS = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Palette.neutral0 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.four, borderBottomWidth: 1, borderBottomColor: Palette.neutral100 },
  title: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Palette.primary500 },
  cancel: { fontSize: FontSize.sm, color: Palette.primary500 },
  form: { padding: Spacing.four, gap: Spacing.four },
  dateLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Palette.neutral600, marginBottom: Spacing.two },
  dateSub: { fontSize: FontSize.xs, color: Palette.neutral500, marginBottom: 4 },
  dateRow: { flexDirection: 'row', gap: Spacing.two, alignItems: 'flex-end' },
});
