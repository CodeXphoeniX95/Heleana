import { create } from 'zustand';
import { authApi, TOKEN_KEY } from '../lib/api';
import type { UserProfile } from '../lib/api';

const PERSONAL_MODE_KEY = 'heleana_personal_mode';

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  isHydrated: boolean;
  isPersonalMode: boolean;

  hydrate: () => Promise<void>;
  login: (credentials: { email?: string; phone?: string; password: string }) => Promise<void>;
  register: (data: { name: string; email?: string; phone?: string; password: string }) => Promise<void>;
  logout: () => void;
  updateUser: (data: { name?: string; phone?: string; avatar_url?: string }) => Promise<void>;
  refreshUser: () => Promise<void>;
  togglePersonalMode: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: false,
  isHydrated: false,
  isPersonalMode: localStorage.getItem(PERSONAL_MODE_KEY) === 'true',

  hydrate: async () => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) {
        set({ isHydrated: true });
        return;
      }
      const user = await authApi.me();
      set({ token, user, isHydrated: true });
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      set({ token: null, user: null, isHydrated: true });
    }
  },

  login: async (credentials) => {
    set({ isLoading: true });
    try {
      const { token, user } = await authApi.login(credentials);
      localStorage.setItem(TOKEN_KEY, token);
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
      localStorage.setItem(TOKEN_KEY, token);
      set({ token, user, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
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
      // ignore
    }
  },

  togglePersonalMode: () =>
    set((state) => {
      const next = !state.isPersonalMode;
      localStorage.setItem(PERSONAL_MODE_KEY, String(next));
      return { isPersonalMode: next };
    }),
}));

export const selectUser = (s: AuthState) => s.user;
export const selectIsAuth = (s: AuthState) => s.token !== null && s.user !== null;
export const selectIsLoading = (s: AuthState) => s.isLoading;
export const selectIsHydrated = (s: AuthState) => s.isHydrated;
export const selectIsPersonalMode = (s: AuthState) => s.isPersonalMode;
