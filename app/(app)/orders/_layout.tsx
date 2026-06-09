import { Stack } from 'expo-router';
import { STACK_SCREEN_OPTIONS } from '../../../constants/stackOptions';

export default function OrdersLayout() {
  return (
    <Stack screenOptions={STACK_SCREEN_OPTIONS}>
      <Stack.Screen name="index" options={{ title: 'Orders' }} />
      <Stack.Screen name="[id]"  options={{ title: 'Order Details' }} />
    </Stack>
  );
}
