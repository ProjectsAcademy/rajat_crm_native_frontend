import { Stack } from 'expo-router';
import { STACK_SCREEN_OPTIONS } from '../../../constants/stackOptions';
import { useFeatureGuard } from '../../../hooks/useFeatureGuard';

export default function EstimatesLayout() {
  useFeatureGuard('estimates');
  return (
    <Stack
      screenOptions={STACK_SCREEN_OPTIONS}
    >
      <Stack.Screen name="index" options={{ title: 'Estimates' }} />
      <Stack.Screen name="[id]" options={{ title: 'Estimate Details' }} />
    </Stack>
  );
}
