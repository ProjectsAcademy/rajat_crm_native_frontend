import { Stack } from 'expo-router';
import { STACK_SCREEN_OPTIONS } from '../../../constants/stackOptions';
import { useFeatureGuard } from '../../../hooks/useFeatureGuard';
import HubBackButton from '../../../components/HubBackButton';

export default function EstimatesLayout() {
  useFeatureGuard('estimates');
  return (
    <Stack
      screenOptions={STACK_SCREEN_OPTIONS}
    >
      <Stack.Screen name="index" options={{ title: 'Estimates', headerLeft: () => <HubBackButton hub="/(app)/finance" /> }} />
      <Stack.Screen name="[id]" options={{ title: 'Estimate Details' }} />
    </Stack>
  );
}
