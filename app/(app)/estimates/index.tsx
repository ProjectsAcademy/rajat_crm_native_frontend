import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { estimatesApi, EstimateSummary } from '../../../services/api';
import { Colors } from '../../../constants/colors';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft:    { bg: Colors.border,       text: Colors.textMuted },
  sent:     { bg: '#E3F2FD',           text: '#1565C0'        },
  accepted: { bg: Colors.successLight, text: Colors.success   },
  rejected: { bg: Colors.errorLight,  text: Colors.error     },
  expired:  { bg: '#F5F5F5',          text: '#757575'        },
};

function fmtAmt(v: string) {
  const n = parseFloat(v || '0');
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
}

const FILTERS = ['All', 'Draft', 'Sent', 'Accepted', 'Rejected'];

export default function EstimatesScreen() {
  const [items, setItems]     = useState<EstimateSummary[]>([]);
  const [search, setSearch]   = useState('');
  const [filter, setFilter]   = useState('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [total, setTotal]     = useState(0);

  const fetchItems = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const params: any = { search: search.trim() || undefined, limit: 100 };
      if (filter !== 'All') params.status = filter.toLowerCase();
      const { data } = await estimatesApi.list(params);
      setItems(data.estimates);
      setTotal(data.total);
    } catch { setItems([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, [search, filter]);

  useEffect(() => { const t = setTimeout(() => fetchItems(), 350); return () => clearTimeout(t); }, [fetchItems]);

  const renderItem = ({ item }: { item: EstimateSummary }) => {
    const sc = STATUS_COLORS[item.status] ?? STATUS_COLORS.draft;
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/(app)/estimates/${item.id}` as any)}
        activeOpacity={0.75}
      >
        <View style={styles.cardMain}>
          <View style={styles.cardTop}>
            <Text style={styles.estNo}>{item.estimateNo}</Text>
            <View style={[styles.badge, { backgroundColor: sc.bg }]}>
              <Text style={[styles.badgeText, { color: sc.text }]}>{item.status.toUpperCase()}</Text>
            </View>
          </View>
          {item.customer && <Text style={styles.name} numberOfLines={1}>{item.customer.customerName}</Text>}
          {item.project && <Text style={styles.sub}>{item.project.projectNo} · {item.project.name}</Text>}
          <View style={styles.meta}>
            <Text style={styles.amount}>{fmtAmt(item.totalAmount)}</Text>
            <Text style={styles.date}>Valid: {fmtDate(item.validUntil)}</Text>
            <Text style={styles.itemCount}>{item._count.items} items</Text>
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
          <TextInput
            style={styles.searchInput} placeholder="Search estimates..."
            placeholderTextColor={Colors.textMuted} value={search}
            onChangeText={setSearch} autoCorrect={false} autoCapitalize="none"
          />
          {search ? <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={16} color={Colors.textMuted} /></TouchableOpacity> : null}
        </View>
        <Text style={styles.totalText}>{total}</Text>
      </View>
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
          data={items} keyExtractor={i => String(i.id)} renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchItems(true); }} tintColor={Colors.accent} />}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="document-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No estimates found</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  searchRow: { padding: 12, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border, flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.background, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 10, height: 40 },
  searchInput: { flex: 1, fontSize: 14, color: Colors.textPrimary },
  totalText: { fontSize: 12, color: Colors.textMuted },
  pills: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  pill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  pillActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  pillText: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary },
  pillTextActive: { color: '#111' },
  list: { padding: 12 },
  card: { backgroundColor: Colors.surface, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardMain: { flex: 1 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  estNo: { fontSize: 12, fontWeight: '700', color: '#E65100' },
  badge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4 },
  badgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.3 },
  name:  { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  sub:   { fontSize: 11, color: Colors.textSecondary, marginTop: 1 },
  meta:  { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 },
  amount: { fontSize: 14, fontWeight: '800', color: Colors.textPrimary },
  date:   { fontSize: 11, color: Colors.textMuted },
  itemCount: { fontSize: 11, color: Colors.textMuted },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { color: Colors.textSecondary, fontSize: 14 },
});
