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
  hasFeature: (key: string) => boolean;
}

// RBAC feature check. `permissions === undefined` means the backend predates
// RBAC (or data is missing) — never block the UI in that case.
// The server expands parent grants into children ('hr' → 'hr.attendance', …),
// so children match exactly; a parent key also passes when the user holds any
// of its children ('hr.attendance' keeps the HR hub reachable).
export function userHasFeature(user: AuthUser | null, key: string): boolean {
  if (!user) return false;
  if (user.isSuperuser) return true;
  if (user.permissions === undefined) return true;
  if (user.permissions.includes(key)) return true;
  return user.permissions.some((p) => p.startsWith(key + '.'));
}

export const useAuthStore = create<AuthState>((set, get) => ({
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

  hasFeature: (key) => userHasFeature(get().user, key),
}));
