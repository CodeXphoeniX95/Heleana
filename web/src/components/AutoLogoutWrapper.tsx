import React, { useEffect, useRef } from 'react';
import { useAuthStore } from '../stores/auth.store';

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes d'inactivité (au lieu de 75 secondes)

interface AutoLogoutWrapperProps {
  children: React.ReactNode;
}

export const AutoLogoutWrapper: React.FC<AutoLogoutWrapperProps> = ({ children }) => {
  const token = useAuthStore((state) => state.token);
  const logout = useAuthStore((state) => state.logout);
  const timerRef = useRef<number | null>(null);

  const resetTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    if (token) {
      timerRef.current = window.setTimeout(() => {
        console.warn('Déconnexion automatique : 75 secondes d\'inactivité.');
        logout();
      }, INACTIVITY_TIMEOUT_MS);
    }
  };

  useEffect(() => {
    if (!token) return;

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];

    const handleUserActivity = () => {
      resetTimer();
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        resetTimer();
      }
    };

    events.forEach((event) => {
      window.addEventListener(event, handleUserActivity, { passive: true });
    });

    document.addEventListener('visibilitychange', handleVisibilityChange);

    resetTimer();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach((event) => {
        window.removeEventListener(event, handleUserActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [token, logout]);

  return <>{children}</>;
};
