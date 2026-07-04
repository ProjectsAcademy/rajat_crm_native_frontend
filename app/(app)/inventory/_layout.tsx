import { Stack } from 'expo-router';
import { STACK_SCREEN_OPTIONS } from '../../../constants/stackOptions';
import { useFeatureGuard } from '../../../hooks/useFeatureGuard';

export default function InventoryLayout() {
  useFeatureGuard('inventory', 'stock');
  return (
    <Stack
      screenOptions={STACK_SCREEN_OPTIONS}
    >
      <Stack.Screen name="index" options={{ title: 'Inventory' }} />
      <Stack.Screen name="[id]" options={{ title: 'Item Details' }} />
      <Stack.Screen name="stock" options={{ title: 'Stock Ledger' }} />
    </Stack>
  );
}
