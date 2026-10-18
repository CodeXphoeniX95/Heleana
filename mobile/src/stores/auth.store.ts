import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { authApi, UserProfile, TOKEN_KEY } from '@/lib/api';

// ── State type ────────────────────────────────────────────────────────────────

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  isHydrated: boolean;

  // Actions
  hydrate: () => Promise<void>;
  login: (credentials: { email?: string; phone?: string; password: string }) => Promise<void>;
  register: (data: { name: string; email?: string; phone?: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (data: { name?: string; phone?: string; avatar_url?: string }) => Promise<void>;
  refreshUser: () => Promise<void>;
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: false,
  isHydrated: false,

  /**
   * Rehydrate from SecureStore on app start.
   * Validates the stored token by fetching /auth/me.
   */
  hydrate: async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (!token) {
        set({ isHydrated: true });
        return;
      }
      // Token exists — verify it's still valid
      const user = await authApi.me();
      set({ token, user, isHydrated: true });
    } catch {
      // Token expired or invalid — clear it
      await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
      set({ token: null, user: null, isHydrated: true });
    }
  },

  login: async (credentials) => {
    set({ isLoading: true });
    try {
      const { token, user } = await authApi.login(credentials);
      // SecureStore peut échouer sur web — on ignore l'erreur de stockage
      try { await SecureStore.setItemAsync(TOKEN_KEY, token); } catch { /* web */ }
      set({ token, user, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  register: async (data) => {
    set({ isLoading: true });
    try {
      const { token, user } = await authApi.register(data);
      try { await SecureStore.setItemAsync(TOKEN_KEY, token); } catch { /* web */ }
      set({ token, user, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
    set({ token: null, user: null });
  },

  updateUser: async (data) => {
    set({ isLoading: true });
    try {
      const user = await authApi.updateMe(data);
      set({ user, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  refreshUser: async () => {
    try {
      const user = await authApi.me();
      set({ user });
    } catch {
      // ignore silently
    }
  },
}));

// ── Selectors ─────────────────────────────────────────────────────────────────

export const selectUser      = (s: AuthState) => s.user;
export const selectIsAuth    = (s: AuthState) => s.token !== null && s.user !== null;
export const selectIsLoading = (s: AuthState) => s.isLoading;
export const selectIsHydrated= (s: AuthState) => s.isHydrated;
