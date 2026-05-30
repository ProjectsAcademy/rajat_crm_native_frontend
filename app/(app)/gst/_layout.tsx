import { Stack } from 'expo-router';
import { STACK_SCREEN_OPTIONS } from '../../../constants/stackOptions';

export default function GstLayout() {
  return (
    <Stack
      screenOptions={STACK_SCREEN_OPTIONS}
    >
      <Stack.Screen name="index" options={{ title: 'GST Records' }} />
      <Stack.Screen name="[id]" options={{ title: 'GST Details' }} />
    </Stack>
  );
}
