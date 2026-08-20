import { Stack } from 'expo-router';
import { STACK_SCREEN_OPTIONS } from '../../../constants/stackOptions';
import { useFeatureGuard } from '../../../hooks/useFeatureGuard';

export default function EmployeesLayout() {
  useFeatureGuard('employees');
  return (
    <Stack
      screenOptions={STACK_SCREEN_OPTIONS}
    >
      <Stack.Screen name="index" options={{ title: 'Employees' }} />
      <Stack.Screen name="[id]" options={{ title: 'Employee Details' }} />
    </Stack>
  );
}
