import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { AppState, AppStateStatus, PanResponder, View } from 'react-native';
import { useAuthStore, selectIsAuth } from '@/stores/auth.store';

const INACTIVITY_TIMEOUT_MS = 30_000; // 30 secondes d'inactivité

export function AutoLogoutWrapper({ children }: { children: React.ReactNode }) {
  const isAuth = useAuthStore(selectIsAuth);
  const logout = useAuthStore((s) => s.logout);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backgroundTimeRef = useRef<number | null>(null);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!isAuth) return;

    timerRef.current = setTimeout(() => {
      if (useAuthStore.getState().token) {
        useAuthStore.getState().logout();
      }
    }, INACTIVITY_TIMEOUT_MS);
  }, [isAuth]);

  // Écouteur tactile via PanResponder pour réinitialiser le timer à chaque interaction
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponderCapture: () => {
          resetTimer();
          return false;
        },
        onMoveShouldSetPanResponderCapture: () => {
          resetTimer();
          return false;
        },
      }),
    [resetTimer]
  );

  // Écouteur d'état de l'application (passage en arrière-plan / verrouillage écran)
  useEffect(() => {
    if (!isAuth) return;
    resetTimer();

    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        backgroundTimeRef.current = Date.now();
      } else if (nextAppState === 'active') {
        if (backgroundTimeRef.current) {
          const elapsed = Date.now() - backgroundTimeRef.current;
          if (elapsed >= INACTIVITY_TIMEOUT_MS) {
            logout();
            return;
          }
        }
        resetTimer();
      }
    });

    return () => {
      subscription.remove();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isAuth, logout, resetTimer]);

  return (
    <View style={{ flex: 1 }} {...(isAuth ? panResponder.panHandlers : {})}>
      {children}
    </View>
  );
}
