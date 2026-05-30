import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl, Platform,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { vendorsApi, VendorSummary } from '../../../services/api';
import { Colors } from '../../../constants/colors';

const ACTIVE_FILTERS = [
  { label: 'All',      value: undefined },
  { label: 'Active',   value: 'true' },
  { label: 'Inactive', value: 'false' },
];

export default function VendorsScreen() {
  const [vendors, setVendors] = useState<VendorSummary[]>([]);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [total, setTotal] = useState(0);

  const fetchVendors = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const params: any = { search: search.trim() || undefined, limit: 100 };
      if (activeFilter !== undefined) params.active = activeFilter;
      const { data } = await vendorsApi.list(params);
      setVendors(data.vendors);
      setTotal(data.total);
    } catch { setVendors([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, [search, activeFilter]);

  useEffect(() => {
    const t = setTimeout(() => fetchVendors(), 350);
    return () => clearTimeout(t);
  }, [fetchVendors]);

  const onRefresh = () => { setRefreshing(true); fetchVendors(true); };

  const renderItem = ({ item }: { item: VendorSummary }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/(app)/vendors/${item.id}` as any)}
      activeOpacity={0.75}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <Text style={styles.vendorCode}>{item.vendorCode}</Text>
          <View style={[styles.badge, { backgroundColor: item.isActive ? Colors.successLight : Colors.errorLight }]}>
            <Text style={[styles.badgeText, { color: item.isActive ? Colors.success : Colors.error }]}>
              {item.isActive ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>
        <Text style={styles.vendorName} numberOfLines={1}>{item.name}</Text>
        {item.contactPerson ? (
          <Text style={styles.contactPerson} numberOfLines={1}>{item.contactPerson}</Text>
        ) : null}
        <View style={styles.cardMeta}>
          {item.phone ? (
            <View style={styles.metaItem}>
              <Ionicons name="call-outline" size={12} color={Colors.textMuted} />
              <Text style={styles.metaText}>{item.phone}</Text>
            </View>
          ) : null}
          {item.gstin ? (
            <View style={styles.metaItem}>
              <Ionicons name="receipt-outline" size={12} color={Colors.textMuted} />
              <Text style={styles.metaText}>{item.gstin}</Text>
            </View>
          ) : null}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={16} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by code, name, contact..."
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
      </View>

      <View style={styles.filterRow}>
        {ACTIVE_FILTERS.map((f) => (
          <TouchableOpacity
            key={String(f.value)}
            style={[styles.pill, activeFilter === f.value && styles.pillActive]}
            onPress={() => setActiveFilter(f.value)}
          >
            <Text style={[styles.pillText, activeFilter === f.value && styles.pillTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
        <Text style={styles.totalText}>{total} total</Text>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.accent} /></View>
      ) : (
        <FlatList
          data={vendors}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="storefront-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No vendors found</Text>
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
  searchInput: { flex: 1, fontSize: 14, color: Colors.textPrimary, ...Platform.select({ web: { outlineStyle: 'none' } }) },
  filterRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap',
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  pill: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
    backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border,
  },
  pillActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  pillText: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary },
  pillTextActive: { color: '#111' },
  totalText: { marginLeft: 'auto', fontSize: 12, color: Colors.textMuted },

  listContent: { padding: 12 },
  card: {
    backgroundColor: Colors.surface, borderRadius: 8, borderWidth: 1,
    borderColor: Colors.border, padding: 14, flexDirection: 'row',
    alignItems: 'center', gap: 12,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.accentLight, justifyContent: 'center',
    alignItems: 'center', borderWidth: 1, borderColor: Colors.accent,
  },
  avatarText: { fontSize: 18, fontWeight: '800', color: Colors.accent },
  cardBody: { flex: 1 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  vendorCode: { fontSize: 11, fontWeight: '700', color: Colors.accent },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  vendorName: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, lineHeight: 20 },
  contactPerson: { fontSize: 12, color: Colors.textSecondary, marginBottom: 6, marginTop: 1 },
  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11, color: Colors.textMuted },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { color: Colors.textSecondary, fontSize: 14 },
});
