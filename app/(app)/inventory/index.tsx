import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl, Platform, Image,
} from 'react-native';
import { useState, useEffect, useCallback, useRef } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { inventoryApi, InventoryItem, api } from '../../../services/api';
import { Colors } from '../../../constants/colors';
import InventoryFormSheet from '../../../components/InventoryFormSheet';

const isWeb = Platform.OS === 'web';

function stockStatus(current: number, reorder: string) {
  const ro = parseFloat(reorder || '0');
  if (current <= 0) return { label: 'Out of Stock', bg: Colors.errorLight,   text: Colors.error };
  if (current <= ro) return { label: 'Low Stock',    bg: Colors.warningLight, text: '#7A5400' };
  return                { label: 'In Stock',        bg: Colors.successLight, text: Colors.success };
}

function fmtPrice(val: string) {
  const n = parseFloat(val || '0');
  if (n === 0) return '—';
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

// ─── Item thumbnail with lazy presign ─────────────────────────────────────────

function ItemThumb({ item }: { item: InventoryItem }) {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [imgErr, setImgErr] = useState(false);

  useEffect(() => {
    if (!item.primaryImage) return;
    let cancelled = false;
    api.get(`/api/media/presign/inventory/${item.primaryImage.id}`)
      .then(({ data }) => { if (!cancelled) setImgUrl(data.url); })
      .catch(() => { if (!cancelled) setImgErr(true); });
    return () => { cancelled = true; };
  }, [item.primaryImage?.id]);

  if (item.primaryImage && imgUrl && !imgErr) {
    return (
      <Image
        source={{ uri: imgUrl }}
        style={styles.thumb}
        resizeMode="cover"
        onError={() => setImgErr(true)}
      />
    );
  }

  // Letter avatar fallback
  return (
    <View style={styles.avatar}>
      <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function InventoryScreen() {
  const [items, setItems]         = useState<InventoryItem[]>([]);
  const [search, setSearch]       = useState('');
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [total, setTotal]         = useState(0);
  const [showForm, setShowForm]   = useState(false);

  const fetchItems = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await inventoryApi.list({ search: search.trim() || undefined, limit: 100 });
      setItems(data.inventory);
      setTotal(data.total);
    } catch { setItems([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, [search]);

  const fetchRef = useRef(fetchItems);
  useEffect(() => { fetchRef.current = fetchItems; }, [fetchItems]);

  useFocusEffect(
    useCallback(() => { fetchRef.current(true); }, [])
  );

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
        {/* Thumbnail / avatar */}
        <ItemThumb item={item} />

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
    <View style={isWeb ? styles.webWrap : styles.flex1}>
      {isWeb ? (
        /* Desktop: page header row with actions instead of banner + FAB */
        <View style={styles.webHeader}>
          <View>
            <Text style={styles.webTitle}>Inventory</Text>
            <Text style={styles.webSubtitle}>Item catalog & stock levels</Text>
          </View>
          <View style={{ flex: 1 }} />
          <TouchableOpacity style={styles.webLedgerBtn} onPress={() => router.push('/(app)/inventory/stock' as any)} activeOpacity={0.75}>
            <Ionicons name="git-branch-outline" size={14} color={Colors.info} />
            <Text style={styles.webLedgerText}>Stock Ledger</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.webAddBtn} onPress={() => setShowForm(true)} activeOpacity={0.85}>
            <Ionicons name="add" size={16} color="#111" />
            <Text style={styles.webAddText}>Add Item</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.ledgerBtn} onPress={() => router.push('/(app)/inventory/stock' as any)} activeOpacity={0.8}>
          <Ionicons name="git-branch-outline" size={14} color={Colors.info} />
          <Text style={styles.ledgerBtnText}>Stock Ledger — all movements</Text>
          <Ionicons name="chevron-forward" size={13} color={Colors.info} style={{ marginLeft: 'auto' } as any} />
        </TouchableOpacity>
      )}

      <View style={[styles.searchRow, isWeb && styles.searchRowWeb]}>
        <View style={[styles.searchBox, isWeb && styles.searchBoxWeb]}>
          <Ionicons name="search-outline" size={16} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by code, name, category..."
            placeholderTextColor={Colors.textMuted}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
            autoCapitalize="none"
            autoComplete="new-password" textContentType="none" importantForAutofill="no"
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
          contentContainerStyle={[styles.listContent, isWeb && styles.listContentWeb]}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="cube-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No items found</Text>
            </View>
          }
        />
      )}

      {/* FAB — mobile only; web has the header Add Item button */}
      {!isWeb && (
        <TouchableOpacity style={styles.fab} onPress={() => setShowForm(true)} activeOpacity={0.85}>
          <Ionicons name="add" size={26} color="#111" />
        </TouchableOpacity>
      )}

      <InventoryFormSheet
        visible={showForm}
        onClose={() => setShowForm(false)}
        onSaved={(newId) => {
          setShowForm(false);
          if (newId) router.push(`/(app)/inventory/${newId}` as any);
          else fetchItems(true);
        }}
      />
    </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex1: { flex: 1 },

  // ── Desktop web layout ──
  webWrap:     { flex: 1, width: '100%', maxWidth: 1240, alignSelf: 'center', paddingHorizontal: 32 },
  webHeader:   { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 26, paddingBottom: 4 },
  webTitle:    { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  webSubtitle: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  webLedgerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface,
  },
  webLedgerText: { fontSize: 12, fontWeight: '600', color: Colors.info },
  webAddBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6,
    backgroundColor: Colors.accent,
  },
  webAddText: { fontSize: 13, fontWeight: '700', color: '#111' },
  searchRowWeb:   { backgroundColor: 'transparent', borderBottomWidth: 0, paddingHorizontal: 0, paddingVertical: 14 },
  searchBoxWeb:   { maxWidth: 480, backgroundColor: Colors.surface },
  listContentWeb: { paddingHorizontal: 0, paddingTop: 0, paddingBottom: 40 },

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
  searchInput: { flex: 1, fontSize: 14, color: Colors.textPrimary, ...Platform.select({ web: { outlineStyle: 'none' } }) },
  totalText: { fontSize: 12, color: Colors.textMuted, whiteSpace: 'nowrap' } as any,

  listContent: { padding: 12, paddingBottom: 100 },

  card: {
    backgroundColor: Colors.surface, borderRadius: 8, borderWidth: 1,
    borderColor: Colors.border,
    padding: Platform.OS === 'web' ? 12 : 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Platform.OS === 'web' ? 12 : 10,
  },

  // ── Image thumbnail ──
  thumb: {
    ...Platform.select({
      web:     { width: 52, height: 52, borderRadius: 8 },
      default: { width: 68, height: 68, borderRadius: 10 },
    }),
    backgroundColor: Colors.background,
    borderWidth: 1, borderColor: Colors.border,
    overflow: 'hidden',
  },
  // ── Letter avatar (fallback) ──
  avatar: {
    ...Platform.select({
      web:     { width: 52, height: 52, borderRadius: 8 },
      default: { width: 68, height: 68, borderRadius: 10 },
    }),
    backgroundColor: Colors.accentLight,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,153,0,0.3)',
  },
  avatarText: {
    fontSize: Platform.OS === 'web' ? 20 : 26,
    fontWeight: '800', color: Colors.accent,
  },

  cardMain: { flex: 1 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  itemCode: { fontSize: 11, fontWeight: '700', color: Colors.accent },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  itemName: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, lineHeight: 20 },
  category: { fontSize: 11, color: Colors.textSecondary, marginBottom: 4, marginTop: 1 },
  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11, color: Colors.textMuted },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { color: Colors.textSecondary, fontSize: 14 },

  fab: {
    position: 'absolute', bottom: 24, right: 20,
    width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.accent,
    justifyContent: 'center', alignItems: 'center',
    ...Platform.select({
      web: { boxShadow: '0 4px 12px rgba(255,153,0,0.45)' },
      default: { elevation: 6, shadowColor: Colors.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.45, shadowRadius: 12 },
    }),
  },
});
