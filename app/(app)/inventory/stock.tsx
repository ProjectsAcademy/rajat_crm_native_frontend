import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { stockApi, StockMovement, StockSummary } from '../../../services/api';
import { Colors } from '../../../constants/colors';

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
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [filter, setFilter]       = useState('All');
  const [summary, setSummary]     = useState<StockSummary>({ in: 0, out: 0, adjustment: 0 });
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const params: any = { limit: 100 };
      if (filter !== 'All') params.transactionType = filter.toLowerCase();
      const { data } = await stockApi.list(params);
      setMovements(data.movements);
      setTotal(data.total);
      setSummary(data.summary);
    } catch { setMovements([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, [filter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const renderItem = ({ item }: { item: StockMovement }) => {
    const tc = TX[item.transactionType as keyof typeof TX] ?? TX.adjustment;
    return (
      <TouchableOpacity
        style={styles.card}
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
          <Text style={styles.date}>{fmtDate(item.createdAt)}</Text>
        </View>
        {item.inventory && <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
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

  pills: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  pill:         { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  pillActive:   { backgroundColor: Colors.accent, borderColor: Colors.accent },
  pillText:     { fontSize: 11, fontWeight: '600', color: Colors.textSecondary },
  pillTextActive: { color: '#111' },
  totalText:    { marginLeft: 'auto', fontSize: 11, color: Colors.textMuted },

  list: { padding: 12 },
  card: {
    backgroundColor: Colors.surface, borderRadius: 8, borderWidth: 1,
    borderColor: Colors.border, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  iconBox: { width: 34, height: 34, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  body:    { flex: 1 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  txType:  { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  qty:     { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  itemName:{ fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  ref:     { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  date:    { fontSize: 11, color: Colors.textMuted, marginTop: 2 },

  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { color: Colors.textSecondary, fontSize: 14 },
});
