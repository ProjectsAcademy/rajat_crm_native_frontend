import { Stack } from 'expo-router';
import { Colors } from '../../../constants/colors';

export default function GstLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700', fontSize: 17 },
        headerBackTitle: 'Back',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'GST Records' }} />
      <Stack.Screen name="[id]" options={{ title: 'GST Details' }} />
    </Stack>
  );
}
