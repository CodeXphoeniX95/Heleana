import { Tabs } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useEffect, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { notificationsApi } from '@/lib/api';
import { Palette, FontSize, FontWeight } from '@/constants/theme';
// ── Tab icon ──────────────────────────────────────────────────────────────────

function TabIcon({
  icon,
  iconOutline,
  label,
  focused,
  badge,
}: {
  icon: string;
  iconOutline: string;
  label: string;
  focused: boolean;
  badge?: number;
}) {
  return (
    <View style={s.tabItem}>
      <View style={s.iconWrap}>
        <Ionicons
          name={(focused ? icon : iconOutline) as any}
          size={22}
          color={focused ? Palette.primary500 : Palette.neutral400}
        />
        {badge && badge > 0 ? (
          <View style={s.badge}>
            <Text style={s.badgeText}>{badge > 9 ? '9+' : badge}</Text>
          </View>
        ) : null}
      </View>
      <Text style={[s.label, focused && s.labelActive]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

// ── Layout ────────────────────────────────────────────────────────────────────

export default function TabsLayout() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    function fetchUnread() {
      notificationsApi.list({ limit: 1 }).then(({ unread_count }) => {
        setUnreadCount(unread_count);
      }).catch(() => {});
    }
    fetchUnread();
    const interval = setInterval(fetchUnread, 30_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: s.tabBar,
        tabBarShowLabel: false,
        tabBarBackground: () => (
          <View style={s.tabBarBg}>
            <View style={s.tabBarTop} />
            <Text style={s.blessed}>⚓ Blessed Forever 🤍</Text>
          </View>
        ),
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="home" iconOutline="home-outline" label="Accueil" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="people" iconOutline="people-outline" label="Groupes" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="time" iconOutline="time-outline" label="Historique" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="notifications" iconOutline="notifications-outline" label="Alertes" focused={focused} badge={unreadCount} />
          ),
        }}
        listeners={{ tabPress: () => setUnreadCount(0) }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="person" iconOutline="person-outline" label="Profil" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const s = StyleSheet.create({
  tabBar: {
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    height: 82,
    paddingBottom: 4,
    paddingTop: 6,
  },
  tabBarBg: {
    flex: 1,
    backgroundColor: Palette.neutral0,
    borderTopWidth: 1,
    borderTopColor: Palette.neutral200,
  },
  tabBarTop: {
    flex: 1,
  },
  blessed: {
    textAlign: 'center',
    fontSize: 9,
    color: Palette.neutral400,
    paddingBottom: 4,
    letterSpacing: 0.3,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    width: 64,
  },
  iconWrap: { position: 'relative' },
  label: {
    fontSize: 10,
    color: Palette.neutral400,
    textAlign: 'center',
    width: 60,
  },
  labelActive: {
    color: Palette.primary500,
    fontWeight: FontWeight.semibold,
  },
  badge: {
    position: 'absolute', top: -4, right: -8,
    backgroundColor: Palette.error500, borderRadius: 8,
    minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
  },
  badgeText: { color: Palette.neutral0, fontSize: 9, fontWeight: FontWeight.bold },
});
