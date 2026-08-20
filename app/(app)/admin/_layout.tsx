import { Stack, router } from 'expo-router';
import { useEffect } from 'react';
import { STACK_SCREEN_OPTIONS } from '../../../constants/stackOptions';
import { useAuthStore } from '../../../store/auth';

export default function AdminLayout() {
  const user = useAuthStore((s) => s.user);
  // Only super admins may enter; a null user is handled by the root auth gate.
  const allowed = !user || user.isSuperuser;

  useEffect(() => {
    if (!allowed) router.replace('/(app)' as any);
  }, [allowed]);

  return (
    <Stack screenOptions={STACK_SCREEN_OPTIONS}>
      <Stack.Screen name="index" options={{ title: 'Admin' }} />
      <Stack.Screen name="users" options={{ title: 'Users' }} />
      <Stack.Screen name="groups" options={{ title: 'Groups & Permissions' }} />
    </Stack>
  );
}
