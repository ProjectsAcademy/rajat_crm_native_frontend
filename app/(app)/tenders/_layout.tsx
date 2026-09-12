import { Stack } from 'expo-router';
import { STACK_SCREEN_OPTIONS } from '../../../constants/stackOptions';
import { useFeatureGuard } from '../../../hooks/useFeatureGuard';
import HubBackButton from '../../../components/HubBackButton';

export default function TendersLayout() {
  useFeatureGuard('tenders');
  return (
    <Stack
      screenOptions={STACK_SCREEN_OPTIONS}
    >
      <Stack.Screen name="index" options={{ title: 'Tenders', headerLeft: () => <HubBackButton hub="/(app)/work" /> }} />
      <Stack.Screen name="[id]" options={{ title: 'Tender Detail' }} />
    </Stack>
  );
}
