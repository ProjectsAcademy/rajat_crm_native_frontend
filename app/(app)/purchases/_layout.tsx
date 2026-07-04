import { Stack } from 'expo-router';
import { STACK_SCREEN_OPTIONS } from '../../../constants/stackOptions';

export default function PurchasesLayout() {
  return (
    <Stack screenOptions={STACK_SCREEN_OPTIONS}>
      <Stack.Screen name="index" options={{ title: 'Purchases' }} />
      <Stack.Screen name="[id]"  options={{ title: 'Purchase Details' }} />
    </Stack>
  );
}
