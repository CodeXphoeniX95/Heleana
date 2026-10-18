import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { FontSize, FontWeight, Palette, HEADER_HEIGHT, Spacing } from '@/constants/theme';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  rightAction?: React.ReactNode;
  style?: ViewStyle;
  dark?: boolean;
}

export function ScreenHeader({
  title,
  subtitle,
  showBack = false,
  rightAction,
  style,
  dark = false,
}: ScreenHeaderProps) {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const bgColor = dark ? Palette.primary500 : Palette.neutral0;
  const txtColor= dark ? Palette.neutral0   : Palette.neutral800;
  const subColor= dark ? Palette.primary200  : Palette.neutral500;
  const iconColor = dark ? Palette.neutral0 : Palette.neutral700;

  return (
    <View
      style={[
        s.container,
        {
          backgroundColor: bgColor,
          paddingTop: insets.top + Spacing.two,
          height: HEADER_HEIGHT + insets.top,
          borderBottomColor: dark ? 'transparent' : Palette.neutral200,
        },
        style,
      ]}
    >
      {/* Left */}
      <View style={s.side}>
        {showBack && (
          <Pressable onPress={() => router.back()} style={s.backBtn} accessibilityRole="button" accessibilityLabel="Retour">
            <Ionicons name="chevron-back" size={26} color={iconColor} />
          </Pressable>
        )}
      </View>

      {/* Center */}
      <View style={s.center}>
        <Text style={[s.title, { color: txtColor }]} numberOfLines={1}>{title}</Text>
        {subtitle ? (
          <Text style={[s.subtitle, { color: subColor }]} numberOfLines={1}>{subtitle}</Text>
        ) : null}
      </View>

      {/* Right */}
      <View style={[s.side, s.sideRight]}>
        {rightAction}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
    borderBottomWidth: 1,
  },
  side: { width: 44, alignItems: 'flex-start', justifyContent: 'center' },
  sideRight: { alignItems: 'flex-end' },
  center: { flex: 1, alignItems: 'center' },
  title: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  subtitle: { fontSize: FontSize.xs, marginTop: 1 },
  backBtn: { padding: Spacing.one },
});
