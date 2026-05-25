import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { projectsApi, ProjectSummary } from '../../../services/api';
import { Colors } from '../../../constants/colors';

const STATUS_FILTERS = [
  { label: 'All', value: undefined },
  { label: 'Planning', value: 'planning' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'On Hold', value: 'on_hold' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
];

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  planning:    { bg: Colors.infoLight,    text: Colors.info,    dot: Colors.info },
  in_progress: { bg: Colors.warningLight, text: '#7A5400',      dot: Colors.accent },
  on_hold:     { bg: '#F3F4F6',           text: '#374151',      dot: '#9CA3AF' },
  completed:   { bg: Colors.successLight, text: Colors.success, dot: Colors.success },
  cancelled:   { bg: Colors.errorLight,   text: Colors.error,   dot: Colors.error },
};

function formatBudget(val: string) {
  const n = parseFloat(val || '0');
  if (n === 0) return '—';
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
  if (n >= 100000)   return `₹${(n / 100000).toFixed(2)}L`;
  return `₹${n.toLocaleString('en-IN')}`;
}

export default function ProjectsScreen() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [total, setTotal] = useState(0);

  const fetchProjects = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await projectsApi.list({ search: search.trim() || undefined, status: statusFilter, limit: 100 });
      setProjects(data.projects);
      setTotal(data.total);
    } catch { setProjects([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, [search, statusFilter]);

  useEffect(() => {
    const t = setTimeout(() => fetchProjects(), 350);
    return () => clearTimeout(t);
  }, [fetchProjects]);

  const onRefresh = () => { setRefreshing(true); fetchProjects(true); };

  const renderItem = ({ item }: { item: ProjectSummary }) => {
    const sc = STATUS_COLORS[item.status] ?? STATUS_COLORS.planning;
    return (
      <TouchableOpacity style={styles.card} onPress={() => router.push(`/(app)/projects/${item.id}` as any)} activeOpacity={0.75}>
        <View style={[styles.statusDot, { backgroundColor: sc.dot }]} />
        <View style={styles.cardBody}>
          <View style={styles.cardTop}>
            <Text style={styles.projectNo}>{item.projectNo}</Text>
            <View style={[styles.badge, { backgroundColor: sc.bg }]}>
              <Text style={[styles.badgeText, { color: sc.text }]}>{item.status.replace('_', ' ')}</Text>
            </View>
          </View>
          <Text style={styles.projectName} numberOfLines={2}>{item.name}</Text>
          <View style={styles.cardMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="cash-outline" size={12} color={Colors.textMuted} />
              <Text style={styles.metaText}>{formatBudget(item.budget)}</Text>
            </View>
            {item.tender && (
              <View style={styles.metaItem}>
                <Ionicons name="document-text-outline" size={12} color={Colors.textMuted} />
                <Text style={styles.metaText}>{item.tender.tenderNo}</Text>
              </View>
            )}
            {item.startDate && (
              <View style={styles.metaItem}>
                <Ionicons name="calendar-outline" size={12} color={Colors.textMuted} />
                <Text style={styles.metaText}>{new Date(item.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
              </View>
            )}
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
            placeholder="Search by number or name..."
            placeholderTextColor={Colors.textMuted}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {search ? <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={16} color={Colors.textMuted} /></TouchableOpacity> : null}
        </View>
      </View>

      <View style={styles.filterRow}>
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
          data={projects}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="construct-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No projects found</Text>
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
  statusDot: { width: 8, height: 8, borderRadius: 4, alignSelf: 'flex-start', marginTop: 5 },
  cardBody: { flex: 1 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  projectNo: { fontSize: 11, fontWeight: '700', color: Colors.accent },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  projectName: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, lineHeight: 20, marginBottom: 8 },
  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11, color: Colors.textMuted },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { color: Colors.textSecondary, fontSize: 14 },
});
