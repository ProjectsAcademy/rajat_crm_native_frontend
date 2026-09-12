import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl, Alert, Platform, TextInput } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Breadcrumbs from '../../../components/Breadcrumbs';
import { stockApi, StockMovement, StockSummary } from '../../../services/api';
import { Colors } from '../../../constants/colors';
import StockEntryFormSheet from '../../../components/StockEntryFormSheet';

const TX = {
  in:         { bg: Colors.successLight, text: Colors.success,  icon: 'arrow-down-circle-outline' as const },
  out:        { bg: Colors.errorLight,   text: Colors.error,    icon: 'arrow-up-circle-outline'   as const },
  adjustment: { bg: Colors.infoLight,   text: Colors.info,     icon: 'swap-horizontal-outline'   as const },
};

const FILTERS = ['All', 'In', 'Out', 'Adjustment'];

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
}

export default function StockLedgerScreen() {
  const [movements,   setMovements]   = useState<StockMovement[]>([]);
  const [filter,      setFilter]      = useState('All');
  const [search,      setSearch]      = useState('');
  const [summary,     setSummary]     = useState<StockSummary>({ in: 0, out: 0, adjustment: 0 });
  const [total,       setTotal]       = useState(0);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [showAdd,     setShowAdd]     = useState(false);
  const [editingEntry, setEditingEntry] = useState<StockMovement | null>(null);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const params: any = { limit: 100 };
      if (filter !== 'All') params.transactionType = filter.toLowerCase();
      if (search.trim())    params.search           = search.trim();
      const { data } = await stockApi.list(params);
      setMovements(data.movements);
      setTotal(data.total);
      setSummary(data.summary);
    } catch { setMovements([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, [filter, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = (item: StockMovement) => {
    const doDelete = async () => {
      try {
        await stockApi.remove(item.id);
        fetchData(true);
      } catch (e: any) {
        const msg = e?.response?.data?.error ?? 'Could not delete entry.';
        if (Platform.OS === 'web') { window.alert(msg); } else { Alert.alert('Error', msg); }
      }
    };
    const msg = `Remove this ${item.transactionType} entry (${parseFloat(item.quantity).toFixed(2)} ${item.inventory?.unit ?? 'units'} of ${item.inventory?.name ?? 'item'})?`;
    if (Platform.OS === 'web') { if (window.confirm(msg)) doDelete(); return; }
    Alert.alert('Remove Entry', msg, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: doDelete },
    ]);
  };

  const renderItem = ({ item }: { item: StockMovement }) => {
    const tc = TX[item.transactionType as keyof typeof TX] ?? TX.adjustment;
    return (
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.cardMain}
          onPress={() => item.inventory && router.push(`/(app)/inventory/${item.inventory.id}` as any)}
          activeOpacity={0.75}
        >
          <View style={[styles.iconBox, { backgroundColor: tc.bg }]}>
            <Ionicons name={tc.icon} size={16} color={tc.text} />
          </View>
          <View style={styles.body}>
            <View style={styles.cardTop}>
              <Text style={[styles.txType, { color: tc.text }]}>{item.transactionType.toUpperCase()}</Text>
              <Text style={styles.qty}>{parseFloat(item.quantity).toFixed(2)} {item.inventory?.unit ?? ''}</Text>
            </View>
            <Text style={styles.itemName} numberOfLines={1}>{item.inventory?.name ?? '—'}</Text>
            {item.reference ? <Text style={styles.ref} numberOfLines={1}>{item.reference}</Text> : null}
            {item.location  ? <Text style={styles.ref} numberOfLines={1}>{item.location}</Text>  : null}
            <Text style={styles.date}>{fmtDate(item.createdAt)}</Text>
          </View>
        </TouchableOpacity>

        {/* Edit / Delete actions — only for manual entries */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setEditingEntry(item)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="create-outline" size={16} color={Colors.accent} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleDelete(item)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="trash-outline" size={16} color={Colors.error} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Breadcrumbs moduleKey="stock" />
      {/* Summary bar */}
      <View style={styles.summaryBar}>
        <View style={styles.sumItem}>
          <Text style={[styles.sumLabel, { color: Colors.success }]}>IN</Text>
          <Text style={[styles.sumValue, { color: Colors.success }]}>{summary.in}</Text>
        </View>
        <View style={[styles.sumItem, styles.sumBorder]}>
          <Text style={[styles.sumLabel, { color: Colors.error }]}>OUT</Text>
          <Text style={[styles.sumValue, { color: Colors.error }]}>{summary.out}</Text>
        </View>
        <View style={styles.sumItem}>
          <Text style={[styles.sumLabel, { color: Colors.info }]}>ADJ</Text>
          <Text style={[styles.sumValue, { color: Colors.info }]}>{summary.adjustment}</Text>
        </View>
      </View>

      {/* Search bar */}
      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={16} color={Colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by item name…"
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          autoCorrect={false}
          autoComplete="off"
          textContentType="none"
          {...(Platform.OS === 'web' ? { style: [styles.searchInput, { outlineStyle: 'none' } as any] } : {})}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter pills */}
      <View style={styles.pills}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.pill, filter === f && styles.pillActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.pillText, filter === f && styles.pillTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
        <Text style={styles.totalText}>{total} movements</Text>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.accent} /></View>
      ) : (
        <FlatList
          data={movements}
          keyExtractor={i => String(i.id)}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(true); }} tintColor={Colors.accent} />}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="git-branch-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No stock movements</Text>
            </View>
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowAdd(true)} activeOpacity={0.85}>
        <Ionicons name="add" size={26} color="#111" />
      </TouchableOpacity>

      <StockEntryFormSheet
        visible={showAdd || !!editingEntry}
        onClose={() => { setShowAdd(false); setEditingEntry(null); }}
        onSaved={() => { setShowAdd(false); setEditingEntry(null); fetchData(true); }}
        movement={editingEntry}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },

  summaryBar: { flexDirection: 'row', backgroundColor: Colors.primary, paddingVertical: 10 },
  sumItem:    { flex: 1, alignItems: 'center' },
  sumBorder:  { borderLeftWidth: 1, borderRightWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  sumLabel:   { fontSize: 10, fontWeight: '700', marginBottom: 2 },
  sumValue:   { fontSize: 20, fontWeight: '800' },

  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  searchIcon:  { marginLeft: 2 },
  searchInput: {
    flex: 1, fontSize: 13, color: Colors.textPrimary,
    paddingVertical: 6,
  },

  pills: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  pill:           { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  pillActive:     { backgroundColor: Colors.accent, borderColor: Colors.accent },
  pillText:       { fontSize: 11, fontWeight: '600', color: Colors.textSecondary },
  pillTextActive: { color: '#111' },
  totalText:      { marginLeft: 'auto', fontSize: 11, color: Colors.textMuted },

  list: { padding: 12, paddingBottom: 90 },
  card: {
    backgroundColor: Colors.surface, borderRadius: 8, borderWidth: 1,
    borderColor: Colors.border, flexDirection: 'row', alignItems: 'center',
  },
  cardMain:  { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  iconBox:   { width: 34, height: 34, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  body:      { flex: 1 },
  cardTop:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  txType:    { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  qty:       { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  itemName:  { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  ref:       { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  date:      { fontSize: 11, color: Colors.textMuted, marginTop: 2 },

  actions:    { flexDirection: 'column', gap: 4, paddingRight: 10, paddingVertical: 10 },
  actionBtn:  { padding: 6 },

  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { color: Colors.textSecondary, fontSize: 14 },

  fab: {
    position: 'absolute', bottom: 24, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.accent, justifyContent: 'center', alignItems: 'center',
    ...Platform.select({
      web: { boxShadow: '0 4px 16px rgba(255,153,0,0.5)' },
      default: { shadowColor: Colors.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 8, elevation: 8 },
    }),
  },
});
