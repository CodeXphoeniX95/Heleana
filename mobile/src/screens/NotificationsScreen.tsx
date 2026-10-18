import { useCallback, useEffect } from 'react';
import {
  FlatList, Pressable, RefreshControl, StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { notificationsApi, NotificationItem } from '@/lib/api';
import { useApi } from '@/hooks/use-api';
import { EmptyState, LoadingScreen } from '@/components/ui';
import { ScreenHeader } from '@/components/ScreenHeader';
import { FontSize, FontWeight, Palette, Spacing } from '@/constants/theme';

// ── Helpers ───────────────────────────────────────────────────────────────────

type NotifConfig = { icon: string; color: string; bg: string };

function notifConfig(type: string | null): NotifConfig {
  switch (type) {
    case 'contribution':
      return { icon: 'arrow-up-circle', color: Palette.success600, bg: Palette.success50 };
    case 'withdrawal_request':
      return { icon: 'cash-outline', color: Palette.warning600, bg: Palette.warning50 };
    case 'withdrawal_approved':
      return { icon: 'checkmark-circle', color: Palette.success600, bg: Palette.success50 };
    case 'withdrawal_rejected':
      return { icon: 'close-circle', color: Palette.error500, bg: Palette.error50 };
    default:
      return { icon: 'notifications-outline', color: Palette.primary500, bg: Palette.primary50 };
  }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 1)  return 'À l\'instant';
  if (mins  < 60) return `Il y a ${mins} min`;
  if (hours < 24) return `Il y a ${hours} h`;
  if (days  < 7)  return `Il y a ${days} j`;
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

// ── Notification row ──────────────────────────────────────────────────────────

function NotifRow({ item, onPress }: { item: NotificationItem; onPress: (item: NotificationItem) => void }) {
  const cfg = notifConfig(item.type);
  const targetGroupId = item.group_id ?? item.entity_id;
  const isClickable = !!targetGroupId;

  return (
    <Pressable
      onPress={() => onPress(item)}
      disabled={!isClickable}
      style={({ pressed }) => [
        s.row,
        !item.is_read && s.unread,
        pressed && isClickable && { opacity: 0.75, backgroundColor: Palette.neutral100 },
      ]}
    >
      <View style={[s.iconWrap, { backgroundColor: cfg.bg }]}>
        <Ionicons name={cfg.icon as any} size={22} color={cfg.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[s.title, !item.is_read && s.titleBold]}>{item.title}</Text>
        <Text style={s.message} numberOfLines={2}>{item.message}</Text>
        <Text style={s.time}>{timeAgo(item.created_at)}</Text>
      </View>
      {!item.is_read && <View style={s.dot} />}
      {isClickable && (
        <Ionicons name="chevron-forward" size={16} color={Palette.neutral400} style={{ alignSelf: 'center', marginLeft: Spacing.one }} />
      )}
    </Pressable>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function NotificationsScreen() {
  const router = useRouter();
  const { data, loading, refetch } = useApi(
    useCallback(() => notificationsApi.list({ limit: 50 }), [])
  );

  const notifications = data?.notifications ?? [];
  const unreadCount   = data?.unread_count   ?? 0;

  // Marquer tout comme lu dès l'ouverture de l'écran
  useEffect(() => {
    if (unreadCount > 0) {
      notificationsApi.markRead().then(() => refetch()).catch(() => {});
    }
  }, [unreadCount]);

  function handlePress(item: NotificationItem) {
    const groupId = item.group_id ?? item.entity_id;
    if (!groupId) return;

    if (item.type?.startsWith('withdrawal')) {
      router.push({ pathname: '/group/[groupId]/withdrawals', params: { groupId } } as any);
    } else if (item.type === 'contribution') {
      router.push({ pathname: '/group/[groupId]/contributions', params: { groupId } } as any);
    } else {
      router.push({ pathname: '/group/[groupId]', params: { groupId } } as any);
    }
  }

  if (loading && !data) return <LoadingScreen message="Chargement…" />;

  return (
    <SafeAreaView style={s.safe}>
      <ScreenHeader
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}` : 'Tout est lu ✓'}
      />

      <FlatList
        data={notifications}
        keyExtractor={(n) => n.id}
        renderItem={({ item }) => <NotifRow item={item} onPress={handlePress} />}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={Palette.primary500} />}
        ListEmptyComponent={
          <EmptyState
            title="Aucune notification"
            message="Vous serez notifié des cotisations, retraits et votes de votre groupe."
          />
        }
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={s.separator} />}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Palette.neutral50 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three, padding: Spacing.four, backgroundColor: Palette.neutral0 },
  unread: { backgroundColor: Palette.primary50 },
  iconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: FontSize.sm, color: Palette.neutral700, lineHeight: 20 },
  titleBold: { fontWeight: FontWeight.semibold, color: Palette.neutral900 },
  message: { fontSize: FontSize.xs, color: Palette.neutral500, marginTop: 2, lineHeight: 18 },
  time: { fontSize: FontSize.xs, color: Palette.neutral400, marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Palette.primary500, marginTop: 6 },
  separator: { height: 1, backgroundColor: Palette.neutral100 },
  markAll: { fontSize: FontSize.sm, color: Palette.primary500, fontWeight: FontWeight.medium },
});
