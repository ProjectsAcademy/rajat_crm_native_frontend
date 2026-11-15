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
  // Re-reads the user's permissions (the app calls it when it comes back to
  // the foreground, so role changes apply without logging in again).
  refresh: () => Promise<void>;
  hasFeature: (key: string) => boolean;
}

// Permission check (docs/shared/PERMISSIONS_PLAN.md). `permissions ===
// undefined` means the backend predates RBAC (or data is missing) — never
// block the UI in that case.
// The server expands parent grants into children ('invoices' → 'invoices.view',
// 'invoices.delete', ...) and leaves denied keys out, so an action matches
// exactly; a module key also passes when the user holds anything below it
// ('hr' while they hold 'hr.attendance.view'). Older servers
// (permissionModel absent) send module keys only — there a held parent covers
// its children.
export function userHasFeature(user: AuthUser | null, key: string): boolean {
  if (!user) return false;
  if (user.isSuperuser) return true;
  if (user.permissions === undefined) return true;
  if (user.permissions.includes(key)) return true;
  if (user.permissions.some((p) => p.startsWith(key + '.'))) return true;
  return user.permissionModel !== 2 && user.permissions.some((p) => key.startsWith(p + '.'));
}

// The same check, named for actions: can(user, 'invoices.whatsapp').
export const can = userHasFeature;

// can() for the signed-in user, as a hook: const may = useCan();
// {may('orders.create') && <NewButton />}.
export function useCan(): (key: string) => boolean {
  const user = useAuthStore((s) => s.user);
  return (key: string) => userHasFeature(user, key);
}

// Modules with no actions of their own (calendar tiers, the revenue chart).
const NO_ACTIONS = new Set(['calendar', 'calendar-write', 'calendar-manage', 'revenue']);

// May open a module (menus, hub cards, guards): its 'view' action
// ('orders.view'); for a parent such as 'hr', the view of any sub-module.
export function canOpen(user: AuthUser | null, module: string): boolean {
  if (!user) return false;
  if (user.isSuperuser || user.permissions === undefined) return true;
  if (user.permissionModel !== 2 || NO_ACTIONS.has(module)) return userHasFeature(user, module);
  return user.permissions.some((p) => p === `${module}.view` || (p.startsWith(`${module}.`) && p.endsWith('.view')));
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

  refresh: async () => {
    if (!get().token) return;
    try {
      const { data } = await authApi.me();
      set({ user: data.user });
    } catch {}
  },

  hasFeature: (key) => userHasFeature(get().user, key),
}));
