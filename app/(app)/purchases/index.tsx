import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl, Platform } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { purchasesApi, PurchaseSummary } from '../../../services/api';
import { Colors } from '../../../constants/colors';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft:     { bg: Colors.border,        text: Colors.textMuted  },
  ordered:   { bg: '#E3F2FD',            text: '#1565C0'         },
  received:  { bg: Colors.successLight,  text: Colors.success    },
  partial:   { bg: '#FFF3E0',            text: '#E65100'         },
  cancelled: { bg: Colors.errorLight,    text: Colors.error      },
};
const PAY_COLORS: Record<string, { text: string }> = {
  pending: { text: Colors.error   },
  partial: { text: '#E65100'      },
  paid:    { text: Colors.success },
};

function fmtAmt(v: string) { const n=parseFloat(v||'0'); if(n>=100000) return `₹${(n/100000).toFixed(2)}L`; return `₹${n.toLocaleString('en-IN',{maximumFractionDigits:0})}`; }
function fmtDate(d: string) { return new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'2-digit'}); }

export default function PurchasesScreen() {
  const [items, setItems]     = useState<PurchaseSummary[]>([]);
  const [search, setSearch]   = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [total, setTotal]     = useState(0);

  const fetchItems = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await purchasesApi.list({ search: search.trim() || undefined, limit: 100 });
      setItems(data.purchases);
      setTotal(data.total);
    } catch { setItems([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, [search]);

  useEffect(() => { const t = setTimeout(() => fetchItems(), 350); return () => clearTimeout(t); }, [fetchItems]);

  const renderItem = ({ item }: { item: PurchaseSummary }) => {
    const sc = STATUS_COLORS[item.status] ?? STATUS_COLORS.draft;
    const pc = PAY_COLORS[item.paymentStatus] ?? PAY_COLORS.pending;
    const balance = parseFloat(item.totalAmount) - parseFloat(item.paidAmount);
    return (
      <TouchableOpacity style={styles.card} onPress={() => router.push(`/(app)/purchases/${item.id}` as any)} activeOpacity={0.75}>
        <View style={styles.cardMain}>
          <View style={styles.cardTop}>
            <Text style={styles.purchaseNo}>{item.purchaseNo}</Text>
            <View style={[styles.badge, { backgroundColor: sc.bg }]}>
              <Text style={[styles.badgeText, { color: sc.text }]}>{item.status.toUpperCase()}</Text>
            </View>
          </View>
          <Text style={styles.vendorName} numberOfLines={1}>{item.vendor?.name ?? '—'}</Text>
          <View style={styles.meta}>
            <Text style={styles.amount}>{fmtAmt(item.totalAmount)}</Text>
            {balance > 0 && <Text style={styles.balance}>Bal: {fmtAmt(balance.toString())}</Text>}
            <Text style={[styles.payStatus, { color: pc.text }]}>{item.paymentStatus.toUpperCase()}</Text>
            <Text style={styles.date}>{fmtDate(item.purchaseDate)}</Text>
          </View>
          {item.isGst && <Text style={styles.gstTag}>GST</Text>}
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
          <TextInput style={styles.searchInput} placeholder="Search purchases, vendors..." placeholderTextColor={Colors.textMuted}
            value={search} onChangeText={setSearch} autoCorrect={false} autoCapitalize="none"
            autoComplete="new-password" textContentType="none" importantForAutofill="no" />
          {search ? <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={16} color={Colors.textMuted} /></TouchableOpacity> : null}
        </View>
        <Text style={styles.totalText}>{total} purchases</Text>
      </View>
      {loading ? <View style={styles.center}><ActivityIndicator size="large" color={Colors.accent} /></View> : (
        <FlatList data={items} keyExtractor={i => String(i.id)} renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchItems(true); }} tintColor={Colors.accent} />}
          contentContainerStyle={styles.list} ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListEmptyComponent={<View style={styles.center}><Ionicons name="cart-outline" size={48} color={Colors.textMuted} /><Text style={styles.emptyText}>No purchases found</Text></View>}
        />
      )}
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
  purchaseNo: { fontSize: 12, fontWeight: '700', color: '#2E7D32' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  badgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.3 },
  vendorName: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  amount:    { fontSize: 14, fontWeight: '800', color: Colors.textPrimary },
  balance:   { fontSize: 11, color: Colors.error, fontWeight: '600' },
  payStatus: { fontSize: 10, fontWeight: '700' },
  date:      { fontSize: 11, color: Colors.textMuted, marginLeft: 'auto' },
  gstTag:    { marginTop: 4, alignSelf: 'flex-start', fontSize: 9, fontWeight: '800', color: '#1565C0', backgroundColor: '#E3F2FD', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { color: Colors.textSecondary, fontSize: 14 },
});
