import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { dashboardApi } from '../../services/api';
import { Colors } from '../../constants/colors';

const CARDS = [
  { key: 'orders',    label: 'Orders',    icon: 'receipt-outline'       as const, route: '/(app)/orders',           color: '#1565C0' },
  { key: 'invoices',  label: 'Invoices',  icon: 'document-text-outline' as const, route: '/(app)/invoices',         color: '#6A1B9A' },
  { key: 'purchases', label: 'Purchases', icon: 'cart-outline'          as const, route: '/(app)/purchases',        color: '#2E7D32' },
  { key: 'estimates', label: 'Estimates', icon: 'document-outline'      as const, route: '/(app)/estimates',        color: '#E65100' },
  { key: 'gstRecords',label: 'GST',       icon: 'shield-half-outline'   as const, route: '/(app)/gst',              color: '#006064' },
  { key: 'stockMovements', label: 'Stock', icon: 'layers-outline'        as const, route: '/(app)/inventory/stock',  color: '#00695C' },
];

export default function FinanceScreen() {
  const insets = useSafeAreaInsets();
  const [kpis, setKpis] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const { data } = await dashboardApi.getSummary();
      setKpis(data.kpis);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <View style={styles.safe}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>Finance</Text>
        <Text style={styles.headerSub}>Orders · Invoices · Purchases</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator color={Colors.accent} size="large" style={{ marginTop: 60 }} />
        ) : (
          CARDS.map((c) => {
            const kpi = kpis[c.key];
            const total  = kpi?.total  ?? 0;
            const active = kpi?.active ?? null;
            return (
              <TouchableOpacity
                key={c.key}
                style={styles.card}
                onPress={() => router.push(c.route as any)}
                activeOpacity={0.75}
              >
                <View style={[styles.iconBox, { backgroundColor: c.color + '18' }]}>
                  <Ionicons name={c.icon} size={28} color={c.color} />
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardLabel}>{c.label}</Text>
                  <Text style={[styles.cardCount, { color: c.color }]}>{total}</Text>
                  {active !== null && (
                    <Text style={styles.cardSub}>{active} active</Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: Colors.primary },
  header:  { backgroundColor: Colors.primary, paddingHorizontal: 20, paddingBottom: 18, borderBottomWidth: 3, borderBottomColor: Colors.accent },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  headerSub:   { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },

  scroll:  { flex: 1, backgroundColor: Colors.background },
  content: { padding: 14, gap: 10 },
  card: {
    backgroundColor: Colors.surface, borderRadius: 10, borderWidth: 1,
    borderColor: Colors.border, padding: 18,
    flexDirection: 'row', alignItems: 'center', gap: 16,
  },
  iconBox:   { width: 52, height: 52, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  cardBody:  { flex: 1 },
  cardLabel: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  cardCount: { fontSize: 26, fontWeight: '800', marginTop: 2 },
  cardSub:   { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
});
