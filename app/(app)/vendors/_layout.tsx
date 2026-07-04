import { Stack } from 'expo-router';
import { STACK_SCREEN_OPTIONS } from '../../../constants/stackOptions';

export default function VendorsLayout() {
  return (
    <Stack
      screenOptions={STACK_SCREEN_OPTIONS}
    >
      <Stack.Screen name="index" options={{ title: 'Vendors' }} />
      <Stack.Screen name="[id]" options={{ title: 'Vendor Details' }} />
    </Stack>
  );
}
