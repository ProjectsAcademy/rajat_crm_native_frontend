import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl, Platform } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { gstApi, GstRecord } from '../../../services/api';
import { Colors } from '../../../constants/colors';
import CustomerFilterBanner from '../../../components/CustomerFilterBanner';
import GstFormSheet from '../../../components/GstFormSheet';

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  sales:    { bg: '#E8F5E9', text: '#2E7D32' },
  purchase: { bg: '#FFF3E0', text: '#E65100' },
  expense:  { bg: '#E3F2FD', text: '#1565C0' },
};

function fmtAmt(v: string | null) {
  if (!v) return '₹0';
  const n = parseFloat(v);
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
}

const FILTERS = ['All', 'Sales', 'Purchase', 'Unfiled'];

export default function GstScreen() {
  const { customerId, customerName } = useLocalSearchParams<{ customerId?: string; customerName?: string }>();
  const [records, setRecords] = useState<GstRecord[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [filter, setFilter]   = useState('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [total, setTotal]     = useState(0);
  const [showForm, setShowForm] = useState(false);

  const fetchItems = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const params: any = { limit: 100, customerId: customerId ? parseInt(customerId) : undefined };
      if (filter === 'Unfiled') params.isFiled = false;
      else if (filter !== 'All') params.transactionType = filter.toLowerCase();
      const { data } = await gstApi.list(params);
      setRecords(data.records);
      setTotal(data.total);
      setSummary(data.summary);
    } catch { setRecords([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, [filter, customerId]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const renderItem = ({ item }: { item: GstRecord }) => {
    const tc = TYPE_COLORS[item.transactionType] ?? TYPE_COLORS.sales;
    const party = item.customer?.customerName ?? item.vendor?.name ?? '—';
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/(app)/gst/${item.id}` as any)}
        activeOpacity={0.75}
      >
        <View style={styles.cardMain}>
          <View style={styles.cardTop}>
            <View style={styles.topLeft}>
              <View style={[styles.badge, { backgroundColor: tc.bg }]}>
                <Text style={[styles.badgeText, { color: tc.text }]}>{item.transactionType.toUpperCase()}</Text>
              </View>
              {item.gstNo ? <Text style={styles.gstNo}>{item.gstNo}</Text> : null}
            </View>
            <View style={[styles.filedBadge, { backgroundColor: item.isFiled ? Colors.successLight : Colors.warningLight }]}>
              <Text style={[styles.filedText, { color: item.isFiled ? Colors.success : '#7A5400' }]}>
                {item.isFiled ? 'Filed' : 'Pending'}
              </Text>
            </View>
          </View>
          <Text style={styles.party} numberOfLines={1}>{party}</Text>
          {item.invoiceNo ? <Text style={styles.invoiceNo}>Invoice: {item.invoiceNo}</Text> : null}
          <View style={styles.meta}>
            <Text style={styles.amount}>{fmtAmt(item.totalAmount)}</Text>
            <Text style={styles.gstAmt}>GST: {fmtAmt(item.totalGst)}</Text>
            <Text style={styles.date}>{fmtDate(item.transactionDate)}</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {customerId && customerName ? (
        <CustomerFilterBanner
          name={customerName}
          onClear={() => router.setParams({ customerId: undefined, customerName: undefined })}
        />
      ) : null}
      {/* Summary bar */}
      {summary && !loading && (
        <View style={styles.summaryBar}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Taxable</Text>
            <Text style={styles.summaryValue}>{fmtAmt(summary.taxableAmount)}</Text>
          </View>
          <View style={[styles.summaryItem, styles.summaryBorder]}>
            <Text style={styles.summaryLabel}>Total GST</Text>
            <Text style={[styles.summaryValue, { color: '#1565C0' }]}>{fmtAmt(summary.totalGst)}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>{total} records</Text>
            <Text style={styles.summaryValue}>{fmtAmt(summary.totalAmount)}</Text>
          </View>
        </View>
      )}

      <View style={styles.pills}>
        {FILTERS.map(f => (
          <TouchableOpacity key={f} style={[styles.pill, filter === f && styles.pillActive]} onPress={() => setFilter(f)}>
            <Text style={[styles.pillText, filter === f && styles.pillTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.accent} /></View>
      ) : (
        <FlatList
          data={records} keyExtractor={i => String(i.id)} renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchItems(true); }} tintColor={Colors.accent} />}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="receipt-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No GST records found</Text>
            </View>
          }
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => setShowForm(true)} activeOpacity={0.85}>
        <Ionicons name="add" size={26} color="#111" />
      </TouchableOpacity>

      <GstFormSheet
        visible={showForm}
        onClose={() => setShowForm(false)}
        onSaved={(newId) => {
          if (newId) {
            router.push(`/(app)/gst/${newId}` as any);
          } else {
            fetchItems(true);
          }
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  summaryBar: { flexDirection: 'row', backgroundColor: Colors.primary, paddingVertical: 10 },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryBorder: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  summaryLabel: { fontSize: 10, color: 'rgba(255,255,255,0.6)', marginBottom: 2 },
  summaryValue: { fontSize: 13, fontWeight: '800', color: '#fff' },
  pills: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  pill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  pillActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  pillText: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary },
  pillTextActive: { color: '#111' },
  list: { padding: 12 },
  fab: {
    position: 'absolute', right: 20, bottom: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.accent, justifyContent: 'center', alignItems: 'center',
    elevation: 6,
    ...Platform.select({
      web: { boxShadow: '0 4px 12px rgba(0,0,0,0.25)' },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12 },
    }),
  },
  card: { backgroundColor: Colors.surface, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardMain: { flex: 1 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  topLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4 },
  badgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.3 },
  gstNo: { fontSize: 11, color: Colors.textMuted, fontFamily: 'monospace' },
  filedBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  filedText: { fontSize: 10, fontWeight: '700' },
  party: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  invoiceNo: { fontSize: 11, color: Colors.textSecondary, marginTop: 1 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 },
  amount: { fontSize: 14, fontWeight: '800', color: Colors.textPrimary },
  gstAmt: { fontSize: 12, fontWeight: '600', color: '#1565C0' },
  date:   { fontSize: 11, color: Colors.textMuted },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { color: Colors.textSecondary, fontSize: 14 },
});
