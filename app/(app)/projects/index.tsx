import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl, Platform,
} from 'react-native';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Breadcrumbs from '../../../components/Breadcrumbs';
import { projectsApi, ProjectSummary } from '../../../services/api';
import { Colors } from '../../../constants/colors';
import ProjectFormSheet from '../../../components/ProjectFormSheet';

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

function fmtShortDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Web table sorting ─────────────────────────────────────────────────────────

type SortKey = 'projectNo' | 'name' | 'status' | 'budget' | 'startDate' | 'endDate' | 'tender';

const TABLE_COLUMNS: { key: SortKey; label: string; flex: number }[] = [
  { key: 'projectNo', label: 'Project #',  flex: 1.2 },
  { key: 'name',      label: 'Name',       flex: 2.5 },
  { key: 'status',    label: 'Status',     flex: 1   },
  { key: 'budget',    label: 'Budget',     flex: 1   },
  { key: 'startDate', label: 'Start Date', flex: 1   },
  { key: 'endDate',   label: 'End Date',   flex: 1   },
  { key: 'tender',    label: 'Tender',     flex: 1.2 },
];

// Nulls always sort last regardless of direction
function compareProjects(a: ProjectSummary, b: ProjectSummary, key: SortKey, dir: 'asc' | 'desc'): number {
  const mul = dir === 'asc' ? 1 : -1;
  if (key === 'budget') {
    return (parseFloat(a.budget || '0') - parseFloat(b.budget || '0')) * mul;
  }
  if (key === 'startDate' || key === 'endDate') {
    const av = a[key]; const bv = b[key];
    if (!av && !bv) return 0;
    if (!av) return 1;
    if (!bv) return -1;
    return av.localeCompare(bv) * mul;
  }
  if (key === 'tender') {
    const av = a.tender?.tenderNo ?? ''; const bv = b.tender?.tenderNo ?? '';
    if (!av && !bv) return 0;
    if (!av) return 1;
    if (!bv) return -1;
    return av.toLowerCase().localeCompare(bv.toLowerCase()) * mul;
  }
  return a[key].toLowerCase().localeCompare(b[key].toLowerCase()) * mul;
}

export default function ProjectsScreen() {
  const isWeb = Platform.OS === 'web';

  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [total, setTotal] = useState(0);
  const [showForm, setShowForm] = useState(false);

  // Web table sort state — null keeps server order (createdAt desc)
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

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

  // Silent refresh whenever this screen regains focus (e.g. after editing/deleting a project in detail view)
  useFocusEffect(useCallback(() => { fetchProjects(true); }, [fetchProjects]));

  const onRefresh = () => { setRefreshing(true); fetchProjects(true); };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sorted = useMemo(() => {
    if (!sortKey) return projects;
    return [...projects].sort((a, b) => compareProjects(a, b, sortKey, sortDir));
  }, [projects, sortKey, sortDir]);

  const onSaved = (newId?: number) => {
    if (newId) {
      router.push(`/(app)/projects/${newId}` as any);
    } else {
      fetchProjects(true);
    }
  };

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
                <Text style={styles.metaText}>{fmtShortDate(item.startDate)}</Text>
              </View>
            )}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
      </TouchableOpacity>
    );
  };

  const renderTableRow = ({ item, index }: { item: ProjectSummary; index: number }) => {
    const sc = STATUS_COLORS[item.status] ?? STATUS_COLORS.planning;
    return (
      <TouchableOpacity
        style={[styles.tr, index % 2 === 1 && styles.trAlt]}
        onPress={() => router.push(`/(app)/projects/${item.id}` as any)}
        activeOpacity={0.7}
      >
        <Text style={[styles.td, styles.tdProjectNo, { flex: 1.2 }]} numberOfLines={1}>{item.projectNo}</Text>
        <Text style={[styles.td, styles.tdName, { flex: 2.5 }]} numberOfLines={1}>{item.name}</Text>
        <View style={[styles.tdWrap, { flex: 1 }]}>
          <View style={[styles.badge, { backgroundColor: sc.bg, alignSelf: 'flex-start' }]}>
            <Text style={[styles.badgeText, { color: sc.text }]}>{item.status.replace('_', ' ')}</Text>
          </View>
        </View>
        <Text style={[styles.td, { flex: 1 }]} numberOfLines={1}>{formatBudget(item.budget)}</Text>
        <Text style={[styles.td, { flex: 1 }]} numberOfLines={1}>{fmtShortDate(item.startDate)}</Text>
        <Text style={[styles.td, { flex: 1 }]} numberOfLines={1}>{fmtShortDate(item.endDate)}</Text>
        <Text style={[styles.td, { flex: 1.2 }]} numberOfLines={1}>{item.tender?.tenderNo ?? '—'}</Text>
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
      <Breadcrumbs moduleKey="projects" />
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
            autoComplete="new-password" textContentType="none" importantForAutofill="no"
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
                <Ionicons name="construct-outline" size={48} color={Colors.textMuted} />
                <Text style={styles.emptyText}>No projects found</Text>
              </View>
            }
          />
        </View>
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

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowForm(true)} activeOpacity={0.85}>
        <Ionicons name="add" size={26} color="#111" />
      </TouchableOpacity>

      <ProjectFormSheet
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
  tdProjectNo: { fontWeight: '700', color: Colors.accent },
  tdName: { fontWeight: '600' },

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
