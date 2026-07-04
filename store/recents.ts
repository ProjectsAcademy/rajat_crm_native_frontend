import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

// Recently-visited module feature keys, newest first. Persisted locally per
// device (not a secret — plain AsyncStorage, localStorage on web). Recorded
// by useFeatureGuard whenever a module stack gains focus.

const STORAGE_KEY = 'recent_modules';
const MAX_RECENTS = 6;

interface RecentsState {
  recents: string[];
  loaded: boolean;
  load: () => Promise<void>;
  record: (key: string) => Promise<void>;
}

export const useRecentsStore = create<RecentsState>((set, get) => ({
  recents: [],
  loaded: false,

  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      set({ recents: raw ? JSON.parse(raw) : [], loaded: true });
    } catch {
      set({ loaded: true });
    }
  },

  record: async (key) => {
    // Ensure persisted history is in memory first, otherwise a record fired
    // before load() (e.g. deep link straight into a module) would wipe it
    if (!get().loaded) await get().load();
    const next = [key, ...get().recents.filter((k) => k !== key)].slice(0, MAX_RECENTS);
    set({ recents: next });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  },
}));
