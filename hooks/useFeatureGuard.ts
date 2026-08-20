import { useEffect, useCallback } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { useAuthStore, userHasFeature } from '../store/auth';
import { useRecentsStore } from '../store/recents';

// Redirects to Home when the user lacks every listed feature (deep links,
// stale entry points). UI-level convenience only — the backend 403 is the
// real enforcement. A null user is left alone: the root auth gate owns that.
// Also records the module (first feature key) as recently visited on focus.
export function useFeatureGuard(...features: string[]): boolean {
  const user = useAuthStore((s) => s.user);
  const allowed = !user || features.some((f) => userHasFeature(user, f));
  const primary = features[0];

  useEffect(() => {
    if (!allowed) router.replace('/(app)' as any);
  }, [allowed]);

  useFocusEffect(
    useCallback(() => {
      // Recents track top-level modules only — 'hr.attendance' records 'hr'
      if (user && allowed && primary) useRecentsStore.getState().record(primary.split('.')[0]);
    }, [user, allowed, primary])
  );

  return allowed;
}
