import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl, Platform,
} from 'react-native';
import { useState, useEffect, useCallback, useRef } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { employeesApi, EmployeeSummary } from '../../../services/api';
import { Colors } from '../../../constants/colors';
import EmployeeFormSheet from '../../../components/EmployeeFormSheet';

const SKILL_FILTERS = [
  { label: 'All',        value: undefined },
  { label: 'Unskilled',  value: 'unskilled' },
  { label: 'Semi-Skilled', value: 'semi_skilled' },
  { label: 'Skilled',    value: 'skilled' },
  { label: 'Supervisor', value: 'supervisor' },
];

const SKILL_COLORS: Record<string, { bg: string; text: string }> = {
  unskilled:   { bg: '#F3F4F6',           text: '#374151' },
  semi_skilled: { bg: Colors.infoLight,   text: Colors.info },
  skilled:     { bg: Colors.warningLight, text: '#7A5400' },
  supervisor:  { bg: Colors.successLight, text: Colors.success },
};

function formatWage(val: string) {
  const n = parseFloat(val || '0');
  if (n === 0) return '—';
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export default function EmployeesScreen() {
  const [employees, setEmployees] = useState<EmployeeSummary[]>([]);
  const [search, setSearch] = useState('');
  const [skillFilter, setSkillFilter] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [total, setTotal] = useState(0);
  const [showForm, setShowForm] = useState(false);

  const fetchEmployees = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await employeesApi.list({
        search: search.trim() || undefined,
        skillType: skillFilter,
        limit: 100,
      });
      setEmployees(data.employees);
      setTotal(data.total);
    } catch { setEmployees([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, [search, skillFilter]);

  const fetchRef = useRef(fetchEmployees);
  useEffect(() => { fetchRef.current = fetchEmployees; }, [fetchEmployees]);

  useFocusEffect(
    useCallback(() => { fetchRef.current(true); }, [])
  );

  useEffect(() => {
    const t = setTimeout(() => fetchEmployees(), 350);
    return () => clearTimeout(t);
  }, [fetchEmployees]);

  const onRefresh = () => { setRefreshing(true); fetchEmployees(true); };

  const renderItem = ({ item }: { item: EmployeeSummary }) => {
    const sc = SKILL_COLORS[item.skillType] ?? SKILL_COLORS.unskilled;
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/(app)/employees/${item.id}` as any)}
        activeOpacity={0.75}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.cardBody}>
          <View style={styles.cardTop}>
            <Text style={styles.empCode}>{item.employeeCode}</Text>
            <View style={[styles.badge, { backgroundColor: sc.bg }]}>
              <Text style={[styles.badgeText, { color: sc.text }]}>
                {item.skillType.replace('_', '-')}
              </Text>
            </View>
          </View>
          <Text style={styles.empName} numberOfLines={1}>{item.name}</Text>
          <View style={styles.cardMeta}>
            {item.phone ? (
              <View style={styles.metaItem}>
                <Ionicons name="call-outline" size={12} color={Colors.textMuted} />
                <Text style={styles.metaText}>{item.phone}</Text>
              </View>
            ) : null}
            <View style={styles.metaItem}>
              <Ionicons name="cash-outline" size={12} color={Colors.textMuted} />
              <Text style={styles.metaText}>{formatWage(item.dailyWage)}/day</Text>
            </View>
            <View style={[styles.activeDot, { backgroundColor: item.isActive ? Colors.success : Colors.error }]} />
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
            style={styles.searchInput}
            placeholder="Search by code, name, phone..."
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
        {SKILL_FILTERS.map((f) => (
          <TouchableOpacity
            key={String(f.value)}
            style={[styles.pill, skillFilter === f.value && styles.pillActive]}
            onPress={() => setSkillFilter(f.value)}
          >
            <Text style={[styles.pillText, skillFilter === f.value && styles.pillTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
        <Text style={styles.totalText}>{total} total</Text>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.accent} /></View>
      ) : (
        <FlatList
          data={employees}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="people-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No employees found</Text>
            </View>
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowForm(true)} activeOpacity={0.85}>
        <Ionicons name="add" size={26} color="#111" />
      </TouchableOpacity>

      <EmployeeFormSheet
        visible={showForm}
        onClose={() => setShowForm(false)}
        onSaved={(newId) => {
          setShowForm(false);
          if (newId) router.push(`/(app)/employees/${newId}` as any);
          else fetchEmployees(true);
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
  empCode: { fontSize: 11, fontWeight: '700', color: Colors.accent },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  badgeText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  empName: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, lineHeight: 20 },
  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4, alignItems: 'center' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11, color: Colors.textMuted },
  activeDot: { width: 7, height: 7, borderRadius: 4 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { color: Colors.textSecondary, fontSize: 14 },

  fab: {
    position: 'absolute', bottom: 24, right: 20,
    width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.accent,
    justifyContent: 'center', alignItems: 'center',
    ...Platform.select({
      web:     { boxShadow: '0 4px 12px rgba(255,153,0,0.45)' },
      default: { elevation: 6, shadowColor: Colors.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.45, shadowRadius: 12 },
    }),
  },
});
