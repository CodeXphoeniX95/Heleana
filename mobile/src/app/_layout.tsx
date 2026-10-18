import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuthStore, selectIsAuth, selectIsHydrated } from '@/stores/auth.store';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { Palette } from '@/constants/theme';
import { AutoLogoutWrapper } from '@/components/AutoLogoutWrapper';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const hydrate    = useAuthStore((s) => s.hydrate);
  const isHydrated = useAuthStore(selectIsHydrated);
  const isAuth     = useAuthStore(selectIsAuth);
  const segments   = useSegments();
  const router     = useRouter();

  // Hydrate auth state on mount
  useEffect(() => {
    hydrate().catch(() => {}).finally(() => {
      SplashScreen.hideAsync().catch(() => {});
    });
  }, [hydrate]);

  // Navigation guard: redirect based on auth state
  useEffect(() => {
    if (!isHydrated) return;

    const inAuthGroup = segments[0] === '(auth)';

    const timer = setTimeout(() => {
      if (!isAuth && !inAuthGroup) {
        router.replace('/(auth)/login');
      } else if (isAuth && inAuthGroup) {
        router.replace('/(tabs)/dashboard');
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [isAuth, isHydrated, segments, router]);

  // Push notification click listener
  useEffect(() => {
    const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
    if (isExpoGo) return; // Ignore push listener in Expo Go to avoid SDK 53 warning

  let subscription: any;
  try {
    const Notifications = require('expo-notifications');
    subscription = Notifications.addNotificationResponseReceivedListener((response: any) => {
      const data = response?.notification?.request?.content?.data;
      if (data?.entity_id && isAuth) {
        const groupId = data.entity_id;
        const type = data.type;
        if (type === 'contribution') {
          router.push({ pathname: '/group/[groupId]/contributions', params: { groupId } } as any);
        } else if (type?.startsWith('withdrawal')) {
          router.push({ pathname: '/group/[groupId]/withdrawals', params: { groupId } } as any);
        } else {
          router.push({ pathname: '/group/[groupId]', params: { groupId } } as any);
        }
      }
    });
  } catch {
    // Ignore if Notifications unavailable
  }
  return () => {
    if (subscription?.remove) subscription.remove();
  };
}, [isAuth, router]);

  if (!isHydrated) {
    return <LoadingScreen message="Chargement…" />;
  }

  return (
    <AutoLogoutWrapper>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)"  options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)"  options={{ headerShown: false }} />
          <Stack.Screen name="group"   options={{ headerShown: false }} />
        </Stack>
      </GestureHandlerRootView>
    </AutoLogoutWrapper>
  );
}
