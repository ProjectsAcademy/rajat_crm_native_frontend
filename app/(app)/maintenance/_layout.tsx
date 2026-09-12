import { Stack } from 'expo-router';
import { STACK_SCREEN_OPTIONS } from '../../../constants/stackOptions';
import { useFeatureGuard } from '../../../hooks/useFeatureGuard';
import HubBackButton from '../../../components/HubBackButton';

export default function MaintenanceLayout() {
  useFeatureGuard('maintenance');
  return (
    <Stack screenOptions={STACK_SCREEN_OPTIONS}>
      <Stack.Screen name="index" options={{ title: 'Maintenance & FD Alerts', headerLeft: () => <HubBackButton hub="/(app)/work" /> }} />
    </Stack>
  );
}
