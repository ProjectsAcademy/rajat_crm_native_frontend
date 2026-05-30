import { Stack } from 'expo-router';
import { STACK_SCREEN_OPTIONS } from '../../../constants/stackOptions';

export default function TendersLayout() {
  return (
    <Stack
      screenOptions={STACK_SCREEN_OPTIONS}
    >
      <Stack.Screen name="index" options={{ title: 'Tenders' }} />
      <Stack.Screen name="[id]" options={{ title: 'Tender Detail' }} />
    </Stack>
  );
}
