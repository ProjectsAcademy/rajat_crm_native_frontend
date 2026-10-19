import { Stack, router } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { STACK_SCREEN_OPTIONS } from '../../../constants/stackOptions';
import { useFeatureGuard } from '../../../hooks/useFeatureGuard';
import HubBackButton from '../../../components/HubBackButton';

export default function LedgerLayout() {
  useFeatureGuard('ledger');
  return (
    <Stack screenOptions={STACK_SCREEN_OPTIONS}>
      <Stack.Screen name="index" options={{ title: 'Receivables', headerLeft: () => <HubBackButton hub="/(app)/finance" /> }} />
      <Stack.Screen
        name="[id]"
        options={({ navigation, route }) => ({
          title: 'Customer Ledger',
          // Opened straight from a customer's profile, this is the stack's
          // first screen and gets no back button — send it back there.
          headerLeft: navigation.canGoBack() ? undefined : () => (
            <TouchableOpacity
              onPress={() => router.push(`/(app)/customers/${(route.params as { id?: string })?.id ?? ''}` as any)}
              hitSlop={12}
              style={{ paddingHorizontal: 4, paddingVertical: 4, marginLeft: -4 }}
            >
              <Ionicons name="chevron-back" size={26} color="#fff" />
            </TouchableOpacity>
          ),
        })}
      />
    </Stack>
  );
}
