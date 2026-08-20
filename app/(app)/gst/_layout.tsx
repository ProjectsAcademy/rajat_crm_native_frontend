import { Stack } from 'expo-router';
import { STACK_SCREEN_OPTIONS } from '../../../constants/stackOptions';
import { useFeatureGuard } from '../../../hooks/useFeatureGuard';

export default function GstLayout() {
  useFeatureGuard('gst');
  return (
    <Stack
      screenOptions={STACK_SCREEN_OPTIONS}
    >
      <Stack.Screen name="index" options={{ title: 'GST Records' }} />
      <Stack.Screen name="[id]" options={{ title: 'GST Details' }} />
    </Stack>
  );
}
