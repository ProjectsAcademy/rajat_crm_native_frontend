import { useEffect } from 'react';
import { router } from 'expo-router';
import { useAuthStore, userHasFeature } from '../store/auth';

// Redirects to Home when the user lacks every listed feature (deep links,
// stale entry points). UI-level convenience only — the backend 403 is the
// real enforcement. A null user is left alone: the root auth gate owns that.
export function useFeatureGuard(...features: string[]): boolean {
  const user = useAuthStore((s) => s.user);
  const allowed = !user || features.some((f) => userHasFeature(user, f));

  useEffect(() => {
    if (!allowed) router.replace('/(app)' as any);
  }, [allowed]);

  return allowed;
}
