import { create } from 'zustand';
import type { UserProfile } from '../lib/api';

interface AuthState {
  token: string | null;
  user: UserProfile | null;
  isHydrated: boolean;
  setAuth: (token: string, user: UserProfile) => void;
  logout: () => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('admin_token'),
  user: localStorage.getItem('admin_user')
    ? JSON.parse(localStorage.getItem('admin_user') || '{}')
    : null,
  isHydrated: false,

  setAuth: (token, user) => {
    localStorage.setItem('admin_token', token);
    localStorage.setItem('admin_user', JSON.stringify(user));
    set({ token, user });
  },

  logout: () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    set({ token: null, user: null });
  },

  hydrate: () => {
    const token = localStorage.getItem('admin_token') || localStorage.getItem('token');
    const userStr = localStorage.getItem('admin_user') || localStorage.getItem('user');
    let user = null;
    if (userStr) {
      try {
        user = JSON.parse(userStr);
      } catch (e) {}
    }
    set({ token, user, isHydrated: true });
  },
}));
