import { Stack } from 'expo-router';
import { STACK_SCREEN_OPTIONS } from '../../../constants/stackOptions';
import { useFeatureGuard } from '../../../hooks/useFeatureGuard';
import HubBackButton from '../../../components/HubBackButton';

export default function InventoryLayout() {
  useFeatureGuard('inventory', 'stock');
  return (
    <Stack
      screenOptions={STACK_SCREEN_OPTIONS}
    >
      <Stack.Screen name="index" options={{ title: 'Inventory' }} />
      <Stack.Screen name="[id]" options={{ title: 'Item Details' }} />
      {/* Reached directly from the Finance hub's "Stock" card, bypassing
          index — so like the other module roots it needs an explicit way
          back rather than relying on a back-to-index that never happened. */}
      <Stack.Screen name="stock" options={{ title: 'Stock Ledger', headerLeft: () => <HubBackButton hub="/(app)/finance" /> }} />
    </Stack>
  );
}
