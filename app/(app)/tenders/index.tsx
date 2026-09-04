import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl, Platform,
} from 'react-native';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Breadcrumbs from '../../../components/Breadcrumbs';
import { tendersApi, TenderSummary } from '../../../services/api';
import { Colors } from '../../../constants/colors';
import TenderFormSheet from '../../../components/TenderFormSheet';

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

function fmtShortDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Web table sorting ─────────────────────────────────────────────────────────

type SortKey = 'tenderNo' | 'title' | 'status' | 'tenderAmount' | 'tenderDate' | 'closingDate' | 'projects';

const TABLE_COLUMNS: { key: SortKey; label: string; flex: number }[] = [
  { key: 'tenderNo',     label: 'Tender #',     flex: 1.2 },
  { key: 'title',        label: 'Title',        flex: 2.5 },
  { key: 'status',       label: 'Status',       flex: 1   },
  { key: 'tenderAmount', label: 'Amount',       flex: 1   },
  { key: 'tenderDate',   label: 'Tender Date',  flex: 1   },
  { key: 'closingDate',  label: 'Closing Date', flex: 1   },
  { key: 'projects',     label: 'Projects',     flex: 0.8 },
];

// Nulls always sort last regardless of direction
function compareTenders(a: TenderSummary, b: TenderSummary, key: SortKey, dir: 'asc' | 'desc'): number {
  const mul = dir === 'asc' ? 1 : -1;
  if (key === 'tenderAmount') {
    const av = a.tenderAmount; const bv = b.tenderAmount;
    if (av === null && bv === null) return 0;
    if (av === null) return 1;
    if (bv === null) return -1;
    return (parseFloat(av) - parseFloat(bv)) * mul;
  }
  if (key === 'projects') {
    return (a._count.projects - b._count.projects) * mul;
  }
  if (key === 'tenderDate' || key === 'closingDate') {
    return a[key].localeCompare(b[key]) * mul;
  }
  return a[key].toLowerCase().localeCompare(b[key].toLowerCase()) * mul;
}

export default function TendersScreen() {
  const isWeb = Platform.OS === 'web';

  const [tenders, setTenders] = useState<TenderSummary[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [total, setTotal] = useState(0);
  const [showForm, setShowForm] = useState(false);

  // Web table sort state — null keeps server order (createdAt desc)
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

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

  // Silent refresh whenever this screen regains focus (e.g. after editing/deleting a tender in detail view)
  useFocusEffect(useCallback(() => { fetchTenders(true); }, [fetchTenders]));

  const onRefresh = () => { setRefreshing(true); fetchTenders(true); };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sorted = useMemo(() => {
    if (!sortKey) return tenders;
    return [...tenders].sort((a, b) => compareTenders(a, b, sortKey, sortDir));
  }, [tenders, sortKey, sortDir]);

  const onSaved = (newId?: number) => {
    if (newId) {
      router.push(`/(app)/tenders/${newId}` as any);
    } else {
      fetchTenders(true);
    }
  };

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
            <Text style={styles.metaText}>Closes: {fmtShortDate(item.closingDate)}</Text>
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

  const renderTableRow = ({ item, index }: { item: TenderSummary; index: number }) => {
    const sc = STATUS_COLORS[item.status] ?? STATUS_COLORS.draft;
    return (
      <TouchableOpacity
        style={[styles.tr, index % 2 === 1 && styles.trAlt]}
        onPress={() => router.push(`/(app)/tenders/${item.id}` as any)}
        activeOpacity={0.7}
      >
        <Text style={[styles.td, styles.tdTenderNo, { flex: 1.2 }]} numberOfLines={1}>{item.tenderNo}</Text>
        <Text style={[styles.td, styles.tdTitle, { flex: 2.5 }]} numberOfLines={1}>{item.title}</Text>
        <View style={[styles.tdWrap, { flex: 1 }]}>
          <View style={[styles.badge, { backgroundColor: sc.bg, alignSelf: 'flex-start' }]}>
            <Text style={[styles.badgeText, { color: sc.text }]}>{item.status.charAt(0).toUpperCase() + item.status.slice(1)}</Text>
          </View>
        </View>
        <Text style={[styles.td, { flex: 1 }]} numberOfLines={1}>{formatCurrency(item.tenderAmount)}</Text>
        <Text style={[styles.td, { flex: 1 }]} numberOfLines={1}>{fmtShortDate(item.tenderDate)}</Text>
        <Text style={[styles.td, { flex: 1 }]} numberOfLines={1}>{fmtShortDate(item.closingDate)}</Text>
        <Text style={[styles.td, { flex: 0.8 }]} numberOfLines={1}>{item._count.projects || '—'}</Text>
      </TouchableOpacity>
    );
  };

  const tableHeader = (
    <View style={styles.thRow}>
      {TABLE_COLUMNS.map(col => (
        <TouchableOpacity key={col.key} style={[styles.thCell, { flex: col.flex }]} onPress={() => handleSort(col.key)} activeOpacity={0.7}>
          <Text style={styles.thText}>{col.label}</Text>
          {sortKey === col.key && (
            <Ionicons name={sortDir === 'asc' ? 'arrow-up' : 'arrow-down'} size={11} color={Colors.accent} />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Breadcrumbs moduleKey="tenders" />
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
            autoComplete="new-password" textContentType="none" importantForAutofill="no"
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
      ) : isWeb ? (
        <View style={styles.tableWrap}>
          {tableHeader}
          <FlatList
            data={sorted}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderTableRow}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
            ListEmptyComponent={
              <View style={styles.center}>
                <Ionicons name="document-text-outline" size={48} color={Colors.textMuted} />
                <Text style={styles.emptyText}>No tenders found</Text>
              </View>
            }
          />
        </View>
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

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowForm(true)} activeOpacity={0.85}>
        <Ionicons name="add" size={26} color="#111" />
      </TouchableOpacity>

      <TenderFormSheet
        visible={showForm}
        onClose={() => setShowForm(false)}
        onSaved={onSaved}
      />
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
  searchInput: { flex: 1, fontSize: 14, color: Colors.textPrimary, ...Platform.select({ web: { outlineStyle: 'none' } }) },
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

  // Web table
  tableWrap: {
    flex: 1, margin: 12,
    backgroundColor: Colors.surface, borderRadius: 8,
    borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
  },
  thRow: { flexDirection: 'row', backgroundColor: Colors.primary },
  thCell: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 11,
  },
  thText: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: 0.4 },
  tr: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: Colors.border },
  trAlt: { backgroundColor: '#FAFBFB' },
  td: { fontSize: 13, color: Colors.textPrimary, paddingHorizontal: 10, paddingVertical: 11 },
  tdWrap: { paddingHorizontal: 10, paddingVertical: 8, justifyContent: 'center' },
  tdTenderNo: { fontWeight: '700', color: Colors.accent },
  tdTitle: { fontWeight: '600' },

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

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { color: Colors.textSecondary, fontSize: 14 },
});
