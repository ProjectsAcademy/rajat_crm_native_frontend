import { TouchableOpacity, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// Header-left back chevron for a module's root (index) screen.
//
// These modules (orders, invoices, customers, ...) are each their own Stack
// navigator nested in a hidden Tab (see app/(app)/_layout.tsx). Arriving at
// one — via its hub screen (Work/People/Finance), a customer's "Related
// Records" row, or a direct link — always lands on that Stack's root, which
// never gets an automatic back button: there's nothing to pop to within
// that Stack, even though where the user actually came from is one tap
// away. Only used on `index` screens — `[id]` detail screens already get a
// working native back button to their own list.
//
// The destination is context-aware rather than a fixed hub: when the list
// was opened filtered by a customer (?customerId=...), going back must
// return to that customer, not discard the filter context and strand the
// user at the hub — otherwise reaching this same screen again means
// re-navigating People → Customer → Related record from scratch. `hub` is
// only the fallback for when no such context is present.
export default function HubBackButton({ hub }: { hub: string }) {
  const { customerId } = useLocalSearchParams<{ customerId?: string }>();
  const target = customerId ? `/(app)/customers/${customerId}` : hub;
  return (
    <TouchableOpacity
      onPress={() => router.push(target as any)}
      hitSlop={12}
      style={styles.btn}
    >
      <Ionicons name="chevron-back" size={26} color="#fff" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: { paddingHorizontal: 4, paddingVertical: 4, marginLeft: -4 },
});
