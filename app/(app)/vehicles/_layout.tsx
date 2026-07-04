import { Stack } from 'expo-router';
import { STACK_SCREEN_OPTIONS } from '../../../constants/stackOptions';

export default function VehiclesLayout() {
  return (
    <Stack screenOptions={STACK_SCREEN_OPTIONS}>
      <Stack.Screen name="index" options={{ title: 'Vehicles' }} />
      <Stack.Screen name="[id]" options={{ title: 'Vehicle Details' }} />
    </Stack>
  );
}
