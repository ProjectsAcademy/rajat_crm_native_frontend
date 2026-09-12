import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors } from '../constants/colors';
import { MODULE_HUBS } from '../constants/moduleHubs';

// Slim trail below the top nav, rendered on every module's root (index)
// screen. Same idea as HubBackButton (one tap back to where this screen
// logically belongs) but exposes the whole path at once so a user several
// levels deep — e.g. Customer → Invoices — can jump straight back instead
// of retracing one screen at a time.
//
// The middle crumb is context-aware, matching HubBackButton: when the list
// is filtered by a customer (?customerId=...), that customer takes the
// hub's place in the trail — you're browsing "this customer's invoices",
// not "Finance" — otherwise it falls back to the module's normal hub.
// Rendered directly in each screen's JSX (not via header options) so it
// shows identically on web and native without any per-platform header work.
export default function Breadcrumbs({ moduleKey }: { moduleKey: keyof typeof MODULE_HUBS }) {
  const { customerId, customerName } = useLocalSearchParams<{ customerId?: string; customerName?: string }>();
  const entry = MODULE_HUBS[moduleKey];
  if (!entry) return null;

  const middle = customerId && customerName
    ? { label: customerName, onPress: () => router.push(`/(app)/customers/${customerId}` as any) }
    : { label: entry.hub.label, onPress: () => router.push(entry.hub.route as any) };

  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        <Crumb label="Home" icon="home-outline" onPress={() => router.push('/(app)' as any)} />
        <Sep />
        <Crumb label={middle.label} onPress={middle.onPress} />
        <Sep />
        <Text style={styles.current} numberOfLines={1}>{entry.label}</Text>
      </ScrollView>
    </View>
  );
}

function Crumb({ label, icon, onPress }: { label: string; icon?: React.ComponentProps<typeof Ionicons>['name']; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.crumb} onPress={onPress} hitSlop={6}>
      {icon ? <Ionicons name={icon} size={13} color={Colors.accentDark} style={{ marginRight: 3 }} /> : null}
      <Text style={styles.crumbText} numberOfLines={1}>{label}</Text>
    </TouchableOpacity>
  );
}

function Sep() {
  return <Text style={styles.sep}>›</Text>;
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: Colors.surfaceAlt,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 7 },
  crumb: { flexDirection: 'row', alignItems: 'center' },
  crumbText: { fontSize: 12, fontWeight: '600', color: Colors.accentDark },
  sep: { fontSize: 12, color: Colors.textMuted, marginHorizontal: 6 },
  current: { fontSize: 12, fontWeight: '700', color: Colors.textPrimary },
});
