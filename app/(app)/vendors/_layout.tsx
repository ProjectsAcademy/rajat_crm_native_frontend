import { Stack } from 'expo-router';
import { STACK_SCREEN_OPTIONS } from '../../../constants/stackOptions';
import { useFeatureGuard } from '../../../hooks/useFeatureGuard';
import HubBackButton from '../../../components/HubBackButton';

export default function VendorsLayout() {
  useFeatureGuard('vendors');
  return (
    <Stack
      screenOptions={STACK_SCREEN_OPTIONS}
    >
      <Stack.Screen name="index" options={{ title: 'Vendors', headerLeft: () => <HubBackButton hub="/(app)/people" /> }} />
      <Stack.Screen name="[id]" options={{ title: 'Vendor Details' }} />
    </Stack>
  );
}
