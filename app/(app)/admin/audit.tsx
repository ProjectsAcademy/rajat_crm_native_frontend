import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, FlatList, Switch } from 'react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { adminApi, AdminUser, AuditEntry, FeatureDef } from '../../../services/api';
import { Colors } from '../../../constants/colors';
import SearchPickerModal from '../../../components/SearchPickerModal';

// Activity log (docs/shared/PERMISSIONS_PLAN.md §6): every login and every
// change made through the app, newest first, refused attempts included.

const PAGE = 50;

function when(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function AdminAuditScreen() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [catalog, setCatalog] = useState<FeatureDef[]>([]);
  const [userId, setUserId] = useState<number | null>(null);
  const [module, setModule] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);
  const [pick, setPick] = useState<'user' | 'module' | null>(null);

  useEffect(() => {
    adminApi.users.list().then(({ data }) => setUsers(data.users)).catch(() => {});
    adminApi.features().then(({ data }) => setCatalog(data.features)).catch(() => {});
  }, []);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    setError('');
    try {
      const { data } = await adminApi.audit({ page: p, limit: PAGE, ...(userId ? { userId } : {}), ...(module ? { module } : {}), ...(denied ? { denied: true } : {}) });
      setEntries((prev) => (p === 1 ? data.entries : [...prev, ...data.entries]));
      setTotal(data.total);
      setPage(p);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Could not load the activity log.');
    } finally {
      setLoading(false);
    }
  }, [userId, module, denied]);

  useEffect(() => { load(1); }, [load]);

  const labels = useMemo(() => {
    const m = new Map(catalog.map((f) => [f.key, f]));
    const verb: Record<string, string> = { POST: 'create', PUT: 'change', PATCH: 'change', DELETE: 'delete' };
    return (action: string, method = '') => {
      const f = m.get(action);
      if (action === 'auth.login') return 'Login';
      if (action.startsWith('admin.')) return `Admin: ${action.slice(6)}${verb[method] ? ` (${verb[method]})` : ''}`;
      if (!f) return action;
      const parent = f.parent ? m.get(f.parent)?.label : undefined;
      return parent ? `${parent}: ${f.label}` : f.label;
    };
  }, [catalog]);
  const modules = [
    { key: 'auth', label: 'Logins' }, { key: 'admin', label: 'Admin' },
    ...catalog.filter((f) => f.kind === 'module' && !f.parent).map((f) => ({ key: f.key, label: f.label })),
  ];

  const renderEntry = ({ item }: { item: AuditEntry }) => {
    const refused = item.status === 401 || item.status === 403;
    const failed = item.status >= 400 && !refused;
    return (
      <View style={styles.card}>
        <View style={styles.cardHead}>
          <Text style={styles.action} numberOfLines={1}>{labels(item.action, item.method)}</Text>
          <View style={[styles.badge, refused ? styles.badgeDenied : failed ? styles.badgeFailed : styles.badgeOk]}>
            <Text style={[styles.badgeText, { color: refused ? Colors.error : failed ? '#7A5400' : Colors.success }]}>
              {refused ? 'Refused' : failed ? `Error ${item.status}` : 'Done'}
            </Text>
          </View>
        </View>
        <Text style={styles.meta}>{when(item.createdAt)} · {item.username || 'unknown user'}{item.entityId ? ` · #${item.entityId}` : ''}</Text>
        {!!item.summary && <Text style={styles.summary} numberOfLines={3}>{item.summary}</Text>}
        <Text style={styles.path} numberOfLines={1}>{item.method} {item.path}</Text>
      </View>
    );
  };

  const userName = users.find((u) => u.id === userId)?.username;
  const moduleName = modules.find((m) => m.key === module)?.label;

  return (
    <View style={styles.safe}>
      <View style={styles.filters}>
        <TouchableOpacity style={styles.filter} onPress={() => setPick('user')}>
          <Ionicons name="person-outline" size={14} color={Colors.textSecondary} />
          <Text style={styles.filterText}>{userName ?? 'All users'}</Text>
          {userId && <Ionicons name="close" size={14} color={Colors.textMuted} onPress={() => setUserId(null)} />}
        </TouchableOpacity>
        <TouchableOpacity style={styles.filter} onPress={() => setPick('module')}>
          <Ionicons name="apps-outline" size={14} color={Colors.textSecondary} />
          <Text style={styles.filterText}>{moduleName ?? 'All modules'}</Text>
          {module && <Ionicons name="close" size={14} color={Colors.textMuted} onPress={() => setModule(null)} />}
        </TouchableOpacity>
        <View style={styles.deniedRow}>
          <Text style={styles.filterText}>Refused only</Text>
          <Switch value={denied} onValueChange={setDenied} trackColor={{ true: Colors.accent, false: Colors.border }} thumbColor="#fff" />
        </View>
      </View>
      {!!error && <Text style={styles.error}>{error}</Text>}
      <FlatList
        data={entries}
        keyExtractor={(e) => String(e.id)}
        renderItem={renderEntry}
        contentContainerStyle={styles.list}
        ListEmptyComponent={loading ? null : <Text style={styles.empty}>Nothing recorded for these filters.</Text>}
        ListFooterComponent={
          loading ? <ActivityIndicator color={Colors.accent} style={{ margin: 16 }} /> : entries.length < total ? (
            <TouchableOpacity style={styles.more} onPress={() => load(page + 1)}>
              <Text style={styles.moreText}>Load more ({total - entries.length} left)</Text>
            </TouchableOpacity>
          ) : null
        }
      />
      <SearchPickerModal
        visible={pick === 'user'}
        title="Filter by user"
        loading={users.length === 0}
        items={users.map((u) => ({ id: u.id, label: u.username }))}
        onSelect={(item) => { setPick(null); if (item) setUserId(item.id); }}
      />
      <SearchPickerModal
        visible={pick === 'module'}
        title="Filter by module"
        loading={catalog.length === 0}
        items={modules.map((m, i) => ({ id: i, label: m.label }))}
        onSelect={(item) => { setPick(null); if (item) setModule(modules[item.id].key); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: Colors.background },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 14, paddingBottom: 4, alignItems: 'center' },
  filter:  { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  filterText: { fontSize: 13, color: Colors.textPrimary, fontWeight: '600' },
  deniedRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  error:   { color: Colors.error, fontSize: 13, paddingHorizontal: 14 },
  list:    { padding: 14, gap: 8, paddingBottom: 60 },
  empty:   { textAlign: 'center', color: Colors.textMuted, marginTop: 30 },
  card:    { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, padding: 12, gap: 3 },
  cardHead:{ flexDirection: 'row', alignItems: 'center', gap: 8 },
  action:  { flex: 1, fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  badge:   { borderRadius: 4, paddingHorizontal: 7, paddingVertical: 2 },
  badgeOk: { backgroundColor: Colors.successLight },
  badgeDenied: { backgroundColor: Colors.errorLight },
  badgeFailed: { backgroundColor: Colors.warningLight },
  badgeText: { fontSize: 10, fontWeight: '800' },
  meta:    { fontSize: 12, color: Colors.textSecondary },
  summary: { fontSize: 12, color: Colors.textPrimary },
  path:    { fontSize: 11, color: Colors.textMuted },
  more:    { alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 6, borderWidth: 1, borderColor: Colors.border, marginTop: 6 },
  moreText:{ fontSize: 13, fontWeight: '600', color: Colors.info },
});
