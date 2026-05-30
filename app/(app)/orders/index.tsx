import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl, Platform } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ordersApi, OrderSummary } from '../../../services/api';
import { Colors } from '../../../constants/colors';
import OrderFormSheet from '../../../components/OrderFormSheet';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending:     { bg: '#FFF8E1', text: '#F57F17' },
  confirmed:   { bg: '#E3F2FD', text: '#1565C0' },
  in_progress: { bg: '#E8EAF6', text: '#283593' },
  ready:       { bg: '#FFF3E0', text: '#E65100' },
  delivered:   { bg: Colors.successLight, text: Colors.success },
  cancelled:   { bg: Colors.errorLight,   text: Colors.error   },
};
const PAY_COLORS: Record<string, { text: string }> = {
  pending: { text: Colors.error },
  partial: { text: '#E65100' },
  paid:    { text: Colors.success },
};

function fmtAmount(val: string) {
  const n = parseFloat(val || '0');
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
}

export default function OrdersScreen() {
  const [items, setItems]         = useState<OrderSummary[]>([]);
  const [search, setSearch]       = useState('');
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [total, setTotal]         = useState(0);
  const [showForm, setShowForm]   = useState(false);

  const fetchItems = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await ordersApi.list({ search: search.trim() || undefined, limit: 100 });
      setItems(data.orders);
      setTotal(data.total);
    } catch { setItems([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, [search]);

  useEffect(() => { const t = setTimeout(() => fetchItems(), 350); return () => clearTimeout(t); }, [fetchItems]);

  // Silent refresh whenever this screen regains focus (e.g. after deleting an order in detail view)
  useFocusEffect(useCallback(() => { fetchItems(true); }, [fetchItems]));

  const renderItem = ({ item }: { item: OrderSummary }) => {
    const sc = STATUS_COLORS[item.status] ?? STATUS_COLORS.pending;
    const pc = PAY_COLORS[item.paymentStatus] ?? PAY_COLORS.pending;
    return (
      <TouchableOpacity style={styles.card} onPress={() => router.push(`/(app)/orders/${item.id}` as any)} activeOpacity={0.75}>
        <View style={styles.cardMain}>
          <View style={styles.cardTop}>
            <Text style={styles.orderNo}>{item.orderNo}</Text>
            <View style={[styles.badge, { backgroundColor: sc.bg }]}>
              <Text style={[styles.badgeText, { color: sc.text }]}>{item.status.replace('_', ' ').toUpperCase()}</Text>
            </View>
          </View>
          {item.customer && <Text style={styles.name} numberOfLines={1}>{item.customer.customerName}</Text>}
          {item.project  && <Text style={styles.sub}  numberOfLines={1}>{item.project.projectNo} · {item.project.name}</Text>}
          <View style={styles.meta}>
            <Text style={styles.amount}>{fmtAmount(item.totalAmount)}</Text>
            <Text style={[styles.payBadge, { color: pc.text }]}>{item.paymentStatus.toUpperCase()}</Text>
            <Text style={styles.date}>{fmtDate(item.orderDate)}</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={16} color={Colors.textMuted} />
          <TextInput style={styles.searchInput} placeholder="Search orders, customers..." placeholderTextColor={Colors.textMuted}
            value={search} onChangeText={setSearch} autoCorrect={false} autoCapitalize="none"
            autoComplete="new-password" textContentType="none" importantForAutofill="no" />
          {search ? <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={16} color={Colors.textMuted} /></TouchableOpacity> : null}
        </View>
        <Text style={styles.totalText}>{total} orders</Text>
      </View>

      {loading ? <View style={styles.center}><ActivityIndicator size="large" color={Colors.accent} /></View> : (
        <FlatList data={items} keyExtractor={i => String(i.id)} renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchItems(true); }} tintColor={Colors.accent} />}
          contentContainerStyle={styles.list} ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListEmptyComponent={<View style={styles.center}><Ionicons name="receipt-outline" size={48} color={Colors.textMuted} /><Text style={styles.emptyText}>No orders found</Text></View>}
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowForm(true)} activeOpacity={0.85}>
        <Ionicons name="add" size={26} color="#111" />
      </TouchableOpacity>

      <OrderFormSheet
        visible={showForm}
        onClose={() => setShowForm(false)}
        onSaved={(newId) => {
          if (newId) {
            router.push(`/(app)/orders/${newId}` as any);
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
  searchRow: { padding: 12, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border, flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.background, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 10, height: 40 },
  searchInput: { flex: 1, fontSize: 14, color: Colors.textPrimary, ...Platform.select({ web: { outlineStyle: 'none' } }) },
  totalText: { fontSize: 12, color: Colors.textMuted },
  list: { padding: 12 },
  card: { backgroundColor: Colors.surface, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardMain: { flex: 1 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  orderNo: { fontSize: 12, fontWeight: '700', color: Colors.accent },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  badgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.3 },
  name: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  sub:  { fontSize: 11, color: Colors.textSecondary, marginTop: 1, marginBottom: 4 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  amount: { fontSize: 14, fontWeight: '800', color: Colors.textPrimary },
  payBadge: { fontSize: 10, fontWeight: '700' },
  date: { fontSize: 11, color: Colors.textMuted, marginLeft: 'auto' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { color: Colors.textSecondary, fontSize: 14 },
  fab: {
    position: 'absolute', bottom: 24, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.accent,
    justifyContent: 'center', alignItems: 'center',
    elevation: 8,
    ...Platform.select({
      web: { boxShadow: '0 4px 8px rgba(0,0,0,0.25)' },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8 },
    }),
  },
});
