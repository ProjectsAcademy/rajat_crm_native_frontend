import { create } from 'zustand';
import { authApi, AuthUser } from '../services/api';
import { storage } from '../utils/storage';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isInitialized: boolean;

  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: false,
  isInitialized: false,

  initialize: async () => {
    try {
      const token = await storage.get('auth_token');
      if (token) {
        const { data } = await authApi.me();
        set({ user: data.user, token, isInitialized: true });
      } else {
        set({ isInitialized: true });
      }
    } catch {
      await storage.delete('auth_token');
      set({ user: null, token: null, isInitialized: true });
    }
  },

  login: async (username, password) => {
    set({ isLoading: true });
    try {
      const { data } = await authApi.login(username, password);
      await storage.set('auth_token', data.token);
      set({ user: data.user, token: data.token, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    try {
      await authApi.logout();
    } catch {}
    await storage.delete('auth_token');
    set({ user: null, token: null });
  },
}));
