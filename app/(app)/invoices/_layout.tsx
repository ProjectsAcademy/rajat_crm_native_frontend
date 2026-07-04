import { Stack } from 'expo-router';
import { STACK_SCREEN_OPTIONS } from '../../../constants/stackOptions';
import { useFeatureGuard } from '../../../hooks/useFeatureGuard';

export default function InvoicesLayout() {
  useFeatureGuard('invoices');
  return (
    <Stack screenOptions={STACK_SCREEN_OPTIONS}>
      <Stack.Screen name="index" options={{ title: 'Invoices' }} />
      <Stack.Screen name="[id]"  options={{ title: 'Invoice Details' }} />
    </Stack>
  );
}
