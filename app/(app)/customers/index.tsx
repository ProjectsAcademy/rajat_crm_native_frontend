import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl, Platform, Alert,
} from 'react-native';
import { useState, useEffect, useCallback, useRef } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { customersApi, Customer } from '../../../services/api';
import { Colors } from '../../../constants/colors';
import CustomerFormSheet from '../../../components/CustomerFormSheet';

const ACTIVE_FILTERS = [
  { label: 'All', value: undefined },
  { label: 'Active', value: true },
  { label: 'Inactive', value: false },
];

export default function CustomersScreen() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<boolean | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [total, setTotal] = useState(0);
  const [showForm, setShowForm] = useState(false);

  const fetchCustomers = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await customersApi.list({
        search: search.trim() || undefined,
        active: activeFilter,
        limit: 100,
      });
      setCustomers(data.customers);
      setTotal(data.total);
    } catch {
      setCustomers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, activeFilter]);

  // Keep a stable ref that always points to the latest fetchCustomers.
  // useFocusEffect uses this ref so its callback is stable ([] deps)
  // and never causes search-filter debounce to re-trigger.
  const fetchRef = useRef(fetchCustomers);
  useEffect(() => { fetchRef.current = fetchCustomers; }, [fetchCustomers]);

  // Re-fetch silently whenever screen gains focus:
  // covers back-navigation after delete, edit, or any detail screen action.
  useFocusEffect(
    useCallback(() => {
      fetchRef.current(true); // silent = no loading spinner, just updates list
    }, []) // stable — never re-runs due to search/filter changes
  );

  // Debounced re-fetch on search or filter change (existing behaviour unchanged)
  useEffect(() => {
    const t = setTimeout(() => fetchCustomers(), 350);
    return () => clearTimeout(t);
  }, [fetchCustomers]);

  const onRefresh = () => { setRefreshing(true); fetchCustomers(true); };

  const renderItem = ({ item }: { item: Customer }) => (
    <TouchableOpacity style={styles.card} onPress={() => router.push(`/(app)/customers/${item.id}` as any)} activeOpacity={0.75}>
      <View style={styles.cardLeft}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.customerName.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardName} numberOfLines={1}>{item.customerName}</Text>
          {item.businessName ? <Text style={styles.cardBiz} numberOfLines={1}>{item.businessName}</Text> : null}
          <Text style={styles.cardCode}>{item.customerCode}</Text>
          {item.phone ? (
            <View style={styles.phoneRow}>
              <Ionicons name="call-outline" size={11} color={Colors.textMuted} />
              <Text style={styles.cardPhone}>{item.phone}</Text>
            </View>
          ) : null}
        </View>
      </View>
      <View style={styles.cardRight}>
        <View style={[styles.badge, { backgroundColor: item.isActive ? Colors.successLight : Colors.errorLight }]}>
          <Text style={[styles.badgeText, { color: item.isActive ? Colors.success : Colors.error }]}>
            {item.isActive ? 'Active' : 'Inactive'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} style={{ marginTop: 8 }} />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={16} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, code, phone..."
            placeholderTextColor={Colors.textMuted}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="none"
            importantForAutofill="no"
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Filter pills */}
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
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.accent} />
        </View>
      ) : (
        <FlatList
          data={customers}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="people-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No customers found</Text>
            </View>
          }
        />
      )}

      {/* FAB — Add Customer */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowForm(true)} activeOpacity={0.85}>
        <Ionicons name="add" size={26} color="#111" />
      </TouchableOpacity>

      {/* Create form sheet */}
      <CustomerFormSheet
        visible={showForm}
        onClose={() => setShowForm(false)}
        onSaved={(newId) => {
          setShowForm(false);
          if (newId) {
            // Navigate directly to the new customer's detail page
            router.push(`/(app)/customers/${newId}` as any);
          } else {
            fetchCustomers(true);
          }
        }}
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
  filterRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
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

  listContent: { paddingVertical: 8, paddingHorizontal: 12, paddingBottom: 100 },
  separator: { height: 8 },
  card: {
    backgroundColor: Colors.surface, borderRadius: 8, borderWidth: 1,
    borderColor: Colors.border, padding: 14, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between',
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  avatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: Colors.accentLight, justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 17, fontWeight: '700', color: Colors.accent },
  cardBody: { flex: 1 },
  cardName: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  cardBiz: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  cardCode: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
  cardPhone: { fontSize: 11, color: Colors.textMuted },
  cardRight: { alignItems: 'flex-end' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  badgeText: { fontSize: 10, fontWeight: '700' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { color: Colors.textSecondary, fontSize: 14 },

  fab: {
    position: 'absolute', bottom: 24, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.accent,
    justifyContent: 'center', alignItems: 'center',
    ...Platform.select({
      web: { boxShadow: '0 4px 12px rgba(255,153,0,0.45)' },
      default: { elevation: 6, shadowColor: Colors.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.45, shadowRadius: 12 },
    }),
  },
});
