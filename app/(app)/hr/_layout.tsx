import { Stack } from 'expo-router';
import { Colors } from '../../../constants/colors';

export default function HRLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700', fontSize: 17 },
        headerBackTitle: 'Back',
      }}
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
