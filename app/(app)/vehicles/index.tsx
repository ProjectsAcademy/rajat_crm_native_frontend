import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl, Platform,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { vehiclesApi, VehicleSummary } from '../../../services/api';
import { Colors } from '../../../constants/colors';

const TYPE_ICONS: Record<string, any> = {
  truck: 'bus-outline', car: 'car-outline', van: 'car-outline',
  excavator: 'construct-outline', crane: 'construct-outline', other: 'ellipsis-horizontal-circle-outline',
};

function expiryStatus(dateStr: string | null) {
  if (!dateStr) return null;
  const days = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
  if (days < 0) return { label: 'Expired', bg: Colors.errorLight, text: Colors.error };
  if (days <= 30) return { label: `${days}d`, bg: Colors.warningLight, text: '#7A5400' };
  return null;
}

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
}

export default function VehiclesScreen() {
  const [items, setItems] = useState<VehicleSummary[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [total, setTotal] = useState(0);

  const fetchItems = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await vehiclesApi.list({ search: search.trim() || undefined, limit: 100 });
      setItems(data.vehicles);
      setTotal(data.total);
    } catch { setItems([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(() => fetchItems(), 350);
    return () => clearTimeout(t);
  }, [fetchItems]);

  const renderItem = ({ item }: { item: VehicleSummary }) => {
    const ins = expiryStatus(item.insuranceExpiry);
    const per = expiryStatus(item.permitExpiry);
    const fit = expiryStatus(item.fitnessExpiry);
    const hasAlert = ins || per || fit;
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/(app)/vehicles/${item.id}` as any)}
        activeOpacity={0.75}
      >
        <View style={styles.iconBox}>
          <Ionicons name={TYPE_ICONS[item.vehicleType] ?? 'car-outline'} size={20} color={Colors.accent} />
        </View>
        <View style={styles.body}>
          <View style={styles.cardTop}>
            <Text style={styles.vehicleNo}>{item.vehicleNo}</Text>
            <View style={[styles.badge, { backgroundColor: item.isActive ? Colors.successLight : Colors.errorLight }]}>
              <Text style={[styles.badgeText, { color: item.isActive ? Colors.success : Colors.error }]}>
                {item.isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
          <Text style={styles.vehicleName}>
            {[item.make, item.vehicleModel, item.year].filter(Boolean).join(' ') || item.vehicleType}
          </Text>
          {item.driverName ? (
            <View style={styles.metaItem}>
              <Ionicons name="person-outline" size={11} color={Colors.textMuted} />
              <Text style={styles.metaText}>{item.driverName}</Text>
            </View>
          ) : null}
          {hasAlert ? (
            <View style={styles.alertRow}>
              {ins ? <View style={[styles.alertBadge, { backgroundColor: ins.bg }]}><Text style={[styles.alertText, { color: ins.text }]}>INS {ins.label}</Text></View> : null}
              {per ? <View style={[styles.alertBadge, { backgroundColor: per.bg }]}><Text style={[styles.alertText, { color: per.text }]}>PER {per.label}</Text></View> : null}
              {fit ? <View style={[styles.alertBadge, { backgroundColor: fit.bg }]}><Text style={[styles.alertText, { color: fit.text }]}>FIT {fit.label}</Text></View> : null}
            </View>
          ) : (
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Ionicons name="shield-checkmark-outline" size={11} color={Colors.textMuted} />
                <Text style={styles.metaText}>Ins: {fmtDate(item.insuranceExpiry)}</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="document-outline" size={11} color={Colors.textMuted} />
                <Text style={styles.metaText}>{item._count.usages} trips</Text>
              </View>
            </View>
          )}
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
            style={styles.searchInput}
            placeholder="Search by number, make, driver..."
            placeholderTextColor={Colors.textMuted}
            value={search} onChangeText={setSearch}
            autoCorrect={false} autoCapitalize="none"
            autoComplete="new-password" textContentType="none" importantForAutofill="no"
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
        <Text style={styles.totalText}>{total} vehicles</Text>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.accent} /></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={i => String(i.id)}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchItems(true); }} tintColor={Colors.accent} />}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="car-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No vehicles found</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
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
  totalText: { fontSize: 12, color: Colors.textMuted },
  list: { padding: 12 },
  card: {
    backgroundColor: Colors.surface, borderRadius: 8, borderWidth: 1,
    borderColor: Colors.border, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  iconBox: {
    width: 40, height: 40, borderRadius: 10, backgroundColor: Colors.infoLight,
    justifyContent: 'center', alignItems: 'center',
  },
  body: { flex: 1 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  vehicleNo: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  vehicleName: { fontSize: 12, color: Colors.textSecondary, marginBottom: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  metaRow: { flexDirection: 'row', gap: 12, marginTop: 2 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 11, color: Colors.textMuted },
  alertRow: { flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  alertBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  alertText: { fontSize: 10, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { color: Colors.textSecondary, fontSize: 14 },
});
