import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

// Shown on a list screen (orders/invoices/estimates/gst) when it was opened
// from a customer's detail screen — makes the active filter visible and
// gives a way back to the unfiltered list without navigating away.
export default function CustomerFilterBanner({ name, onClear }: { name: string; onClear: () => void }) {
  return (
    <View style={styles.banner}>
      <Ionicons name="person-circle-outline" size={16} color={Colors.accent} />
      <Text style={styles.text} numberOfLines={1}>
        Filtered by customer: <Text style={styles.name}>{name}</Text>
      </Text>
      <TouchableOpacity onPress={onClear} hitSlop={8}>
        <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.accentLight, paddingHorizontal: 14, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  text: { flex: 1, fontSize: 12, color: Colors.textSecondary },
  name: { fontWeight: '700', color: Colors.textPrimary },
});
