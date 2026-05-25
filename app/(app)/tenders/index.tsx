import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { tendersApi, TenderSummary } from '../../../services/api';
import { Colors } from '../../../constants/colors';

const STATUS_FILTERS = [
  { label: 'All', value: undefined },
  { label: 'Draft', value: 'draft' },
  { label: 'Published', value: 'published' },
  { label: 'Closed', value: 'closed' },
  { label: 'Awarded', value: 'awarded' },
];

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft:     { bg: '#F3F4F6', text: '#374151' },
  published: { bg: Colors.infoLight, text: Colors.info },
  closed:    { bg: Colors.errorLight, text: Colors.error },
  awarded:   { bg: Colors.successLight, text: Colors.success },
};

function formatCurrency(val: string | null) {
  if (!val) return '—';
  const n = parseFloat(val);
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
  if (n >= 100000)   return `₹${(n / 100000).toFixed(2)}L`;
  return `₹${n.toLocaleString('en-IN')}`;
}

export default function TendersScreen() {
  const [tenders, setTenders] = useState<TenderSummary[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [total, setTotal] = useState(0);

  const fetchTenders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await tendersApi.list({ search: search.trim() || undefined, status: statusFilter, limit: 100 });
      setTenders(data.tenders);
      setTotal(data.total);
    } catch { setTenders([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, [search, statusFilter]);

  useEffect(() => {
    const t = setTimeout(() => fetchTenders(), 350);
    return () => clearTimeout(t);
  }, [fetchTenders]);

  const onRefresh = () => { setRefreshing(true); fetchTenders(true); };

  const renderItem = ({ item }: { item: TenderSummary }) => {
    const sc = STATUS_COLORS[item.status] ?? STATUS_COLORS.draft;
    return (
      <TouchableOpacity style={styles.card} onPress={() => router.push(`/(app)/tenders/${item.id}` as any)} activeOpacity={0.75}>
        <View style={styles.cardTop}>
          <Text style={styles.tenderNo}>{item.tenderNo}</Text>
          <View style={[styles.badge, { backgroundColor: sc.bg }]}>
            <Text style={[styles.badgeText, { color: sc.text }]}>{item.status.charAt(0).toUpperCase() + item.status.slice(1)}</Text>
          </View>
        </View>
        <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
        <View style={styles.cardMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={12} color={Colors.textMuted} />
            <Text style={styles.metaText}>Closes: {new Date(item.closingDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="cash-outline" size={12} color={Colors.textMuted} />
            <Text style={styles.metaText}>{formatCurrency(item.tenderAmount)}</Text>
          </View>
          {item._count.projects > 0 && (
            <View style={styles.metaItem}>
              <Ionicons name="construct-outline" size={12} color={Colors.textMuted} />
              <Text style={styles.metaText}>{item._count.projects} project{item._count.projects > 1 ? 's' : ''}</Text>
            </View>
          )}
        </View>
        <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} style={styles.chevron} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={16} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by number, title..."
            placeholderTextColor={Colors.textMuted}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {search ? <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={16} color={Colors.textMuted} /></TouchableOpacity> : null}
        </View>
      </View>

      <View style={styles.filterScroll}>
        {STATUS_FILTERS.map((f) => (
          <TouchableOpacity
            key={String(f.value)}
            style={[styles.pill, statusFilter === f.value && styles.pillActive]}
            onPress={() => setStatusFilter(f.value)}
          >
            <Text style={[styles.pillText, statusFilter === f.value && styles.pillTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
        <Text style={styles.totalText}>{total} total</Text>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.accent} /></View>
      ) : (
        <FlatList
          data={tenders}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="document-text-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No tenders found</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  searchRow: { padding: 12, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.background, borderRadius: 8, borderWidth: 1,
    borderColor: Colors.border, paddingHorizontal: 10, height: 40,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.textPrimary },
  filterScroll: {
    flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap',
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  pill: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
    backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border,
  },
  pillActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  pillText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  pillTextActive: { color: '#111' },
  totalText: { marginLeft: 'auto', fontSize: 12, color: Colors.textMuted },

  listContent: { padding: 12 },
  card: {
    backgroundColor: Colors.surface, borderRadius: 8, borderWidth: 1,
    borderColor: Colors.border, padding: 14, position: 'relative',
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  tenderNo: { fontSize: 12, fontWeight: '700', color: Colors.accent, letterSpacing: 0.3 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  title: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, lineHeight: 20, marginBottom: 10 },
  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11, color: Colors.textMuted },
  chevron: { position: 'absolute', right: 12, top: '50%' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { color: Colors.textSecondary, fontSize: 14 },
});
