import { Stack } from 'expo-router';
import { STACK_SCREEN_OPTIONS } from '../../../constants/stackOptions';
import { useFeatureGuard } from '../../../hooks/useFeatureGuard';

export default function HRLayout() {
  useFeatureGuard('hr');
  return (
    <Stack
      screenOptions={STACK_SCREEN_OPTIONS}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="attendance" options={{ title: 'Attendance' }} />
      <Stack.Screen name="salary-payments" options={{ title: 'Salary Payments' }} />
      <Stack.Screen name="salary-components" options={{ title: 'Salary Components' }} />
      <Stack.Screen name="incentives" options={{ title: 'Incentives' }} />
      <Stack.Screen name="epf-esic" options={{ title: 'EPF / ESIC' }} />
    </Stack>
  );
}
