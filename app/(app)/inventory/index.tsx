import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { inventoryApi, InventoryItem } from '../../../services/api';
import { Colors } from '../../../constants/colors';

function stockStatus(current: number, reorder: string) {
  const ro = parseFloat(reorder || '0');
  if (current <= 0) return { label: 'Out of Stock', bg: Colors.errorLight, text: Colors.error };
  if (current <= ro) return { label: 'Low Stock',   bg: Colors.warningLight, text: '#7A5400' };
  return                { label: 'In Stock',       bg: Colors.successLight, text: Colors.success };
}

function fmtPrice(val: string) {
  const n = parseFloat(val || '0');
  if (n === 0) return '—';
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

export default function InventoryScreen() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [total, setTotal] = useState(0);

  const fetchItems = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await inventoryApi.list({ search: search.trim() || undefined, limit: 100 });
      setItems(data.inventory);
      setTotal(data.total);
    } catch { setItems([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(() => fetchItems(), 350);
    return () => clearTimeout(t);
  }, [fetchItems]);

  const onRefresh = () => { setRefreshing(true); fetchItems(true); };

  const renderItem = ({ item }: { item: InventoryItem }) => {
    const ss = stockStatus(item.currentStock, item.reorderLevel);
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/(app)/inventory/${item.id}` as any)}
        activeOpacity={0.75}
      >
        <View style={styles.cardMain}>
          <View style={styles.cardTop}>
            <Text style={styles.itemCode}>{item.itemCode}</Text>
            <View style={[styles.badge, { backgroundColor: ss.bg }]}>
              <Text style={[styles.badgeText, { color: ss.text }]}>{ss.label}</Text>
            </View>
          </View>
          <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
          {item.category ? <Text style={styles.category}>{item.category}</Text> : null}
          <View style={styles.cardMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="layers-outline" size={12} color={Colors.textMuted} />
              <Text style={styles.metaText}>{item.currentStock} {item.unit}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="cash-outline" size={12} color={Colors.textMuted} />
              <Text style={styles.metaText}>{fmtPrice(item.unitPrice)}/{item.unit}</Text>
            </View>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <TouchableOpacity style={styles.ledgerBtn} onPress={() => router.push('/(app)/inventory/stock' as any)} activeOpacity={0.8}>
        <Ionicons name="git-branch-outline" size={14} color={Colors.info} />
        <Text style={styles.ledgerBtnText}>Stock Ledger — all movements</Text>
        <Ionicons name="chevron-forward" size={13} color={Colors.info} style={{ marginLeft: 'auto' } as any} />
      </TouchableOpacity>
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={16} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by code, name, category..."
            placeholderTextColor={Colors.textMuted}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
        <Text style={styles.totalText}>{total} items</Text>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.accent} /></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="cube-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No items found</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  ledgerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.infoLight, borderBottomWidth: 1, borderBottomColor: Colors.border,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  ledgerBtnText: { fontSize: 12, fontWeight: '600', color: Colors.info },
  searchRow: {
    padding: 12, backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.background, borderRadius: 8, borderWidth: 1,
    borderColor: Colors.border, paddingHorizontal: 10, height: 40,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.textPrimary },
  totalText: { fontSize: 12, color: Colors.textMuted, whiteSpace: 'nowrap' } as any,

  listContent: { padding: 12 },
  card: {
    backgroundColor: Colors.surface, borderRadius: 8, borderWidth: 1,
    borderColor: Colors.border, padding: 14, flexDirection: 'row',
    alignItems: 'center', gap: 10,
  },
  cardMain: { flex: 1 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  itemCode: { fontSize: 11, fontWeight: '700', color: Colors.accent },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  itemName: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, lineHeight: 20 },
  category: { fontSize: 11, color: Colors.textSecondary, marginBottom: 6, marginTop: 1 },
  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11, color: Colors.textMuted },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { color: Colors.textSecondary, fontSize: 14 },
});
