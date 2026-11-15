import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, TextInput, Switch, Platform } from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { adminApi, AdminUser, EffectiveAccess, FeatureDef, AccessSource } from '../../../services/api';
import { Colors } from '../../../constants/colors';
import SearchPickerModal from '../../../components/SearchPickerModal';

// "Effective access" and "Can X do Y?" (docs/shared/PERMISSIONS_PLAN.md §7):
// what one user can do in every module after all their roles, groups,
// denies and conditions, with where each answer comes from.

const HUBS: [string, string][] = [['work', 'Work'], ['people', 'People'], ['finance', 'Finance'], ['inventory', 'Inventory']];

function sourceText(s: AccessSource, key: string): string {
  const where = s.via ? `group ${s.via}` : 'assigned directly';
  const inherited = s.grantedOn !== key ? ` (from "${s.grantedOn}")` : '';
  const cond = s.conditions ? ` · conditions: ${Object.entries(s.conditions).map(([k, v]) => `${k} ${Array.isArray(v) ? v.join('/') : v}`).join(', ')}` : '';
  return `${s.effect === 'deny' ? 'Denied' : 'Allowed'} by role "${s.role}" — ${where}${inherited}${cond}`;
}

export default function AdminAccessScreen() {
  const params = useLocalSearchParams<{ userId?: string }>();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [catalog, setCatalog] = useState<FeatureDef[]>([]);
  const [userId, setUserId] = useState<number | null>(params.userId ? Number(params.userId) : null);
  const [access, setAccess] = useState<EffectiveAccess | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [onlyAllowed, setOnlyAllowed] = useState(false);
  const [pickUser, setPickUser] = useState(false);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    adminApi.users.list().then(({ data }) => setUsers(data.users)).catch(() => {});
    adminApi.features().then(({ data }) => setCatalog(data.features)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    setError('');
    adminApi.users.access(userId)
      .then(({ data }) => setAccess(data))
      .catch((e) => setError(e?.response?.data?.error ?? 'Could not load access.'))
      .finally(() => setLoading(false));
  }, [userId]);

  const rows = useMemo(() => new Map((access?.access ?? []).map((a) => [a.key, a])), [access]);
  const modules = catalog.filter((f) => f.kind === 'module');
  const childrenOf = (key: string) => catalog.filter((f) => f.parent === key && f.kind !== 'module');

  const Line = ({ f }: { f: FeatureDef }) => {
    const r = rows.get(f.key);
    if (!r) return null;
    if (onlyAllowed && !r.allowed) return null;
    const denied = !r.allowed && r.sources.some((s) => s.effect === 'deny');
    const icon = r.allowed ? (r.conditional ? 'ellipse-outline' : 'checkmark-circle') : denied ? 'close-circle' : 'remove-circle-outline';
    const color = r.allowed ? (r.conditional ? Colors.warning : Colors.success) : denied ? Colors.error : Colors.textMuted;
    return (
      <View style={styles.line}>
        <Ionicons name={icon as any} size={16} color={color} />
        <View style={{ flex: 1 }}>
          <Text style={styles.lineLabel}>{f.kind === 'module' ? 'The whole module (granted as one)' : f.label}{f.kind === 'field' ? ' (field)' : ''}</Text>
          <Text style={styles.lineSub}>
            {r.allowed ? (r.conditional ? 'Allowed with conditions' : 'Allowed') : 'Not allowed'} — {r.reason}
          </Text>
          {r.sources.map((s, i) => <Text key={i} style={styles.lineSource}>{sourceText(s, f.key)}</Text>)}
        </View>
      </View>
    );
  };

  const user = users.find((u) => u.id === userId);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <TouchableOpacity style={styles.picker} onPress={() => setPickUser(true)} activeOpacity={0.8}>
        <Ionicons name="person-outline" size={18} color={Colors.accent} />
        <Text style={styles.pickerText}>{user ? `${user.username}${user.firstName ? ` — ${user.firstName} ${user.lastName}` : ''}` : 'Choose a user'}</Text>
        <Ionicons name="chevron-down" size={16} color={Colors.textMuted} />
      </TouchableOpacity>

      {loading && <ActivityIndicator color={Colors.accent} style={{ marginVertical: 20 }} />}
      {!!error && <Text style={styles.error}>{error}</Text>}

      {access && !loading && (
        <>
          <View style={styles.flags}>
            {access.isSuperuser && <Text style={styles.flag}>Super admin — can do everything, cannot be limited.</Text>}
            {!access.isActive && <Text style={[styles.flag, { color: Colors.error }]}>Account disabled — can do nothing.</Text>}
            {access.isLegacyAccess && (
              <Text style={styles.flag}>
                Legacy access — {access.strict ? 'switched off on this server (strict mode).' : 'full access except explicit denies.'}
              </Text>
            )}
            <Text style={styles.flagMuted}>
              {access.enforced ? 'Enforced on this server.' : 'Shadow mode on this server: refusals are only logged, nothing is blocked yet.'}
            </Text>
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchText}>Only what they can do</Text>
            <Switch value={onlyAllowed} onValueChange={setOnlyAllowed} trackColor={{ true: Colors.accent, false: Colors.border }} thumbColor="#fff" />
          </View>

          {HUBS.map(([hub, hubLabel]) => {
            const list = modules.filter((m) => m.hub === hub);
            if (!list.length) return null;
            return (
              <View key={hub}>
                <Text style={styles.hub}>{hubLabel}</Text>
                {list.map((m) => {
                  const keys = [m, ...childrenOf(m.key)];
                  const can = keys.filter((k) => rows.get(k.key)?.allowed).length;
                  if (onlyAllowed && !can) return null;
                  const isOpen = !!open[m.key];
                  return (
                    <View key={m.key} style={styles.module}>
                      <TouchableOpacity style={styles.moduleHead} onPress={() => setOpen((o) => ({ ...o, [m.key]: !o[m.key] }))}>
                        <Ionicons name={isOpen ? 'chevron-down' : 'chevron-forward'} size={14} color={Colors.textMuted} />
                        <Text style={styles.moduleLabel}>{m.label}</Text>
                        <Text style={[styles.count, { color: can ? Colors.success : Colors.textMuted }]}>{can}/{keys.length}</Text>
                      </TouchableOpacity>
                      {isOpen && keys.map((f) => <Line key={f.key} f={f} />)}
                    </View>
                  );
                })}
              </View>
            );
          })}

          <CheckTester userId={access.user.id} catalog={catalog} />
        </>
      )}

      <SearchPickerModal
        visible={pickUser}
        title="Choose a user"
        loading={users.length === 0}
        items={users.map((u) => ({ id: u.id, label: u.username, sub: `${u.firstName} ${u.lastName}`.trim() || undefined }))}
        onSelect={(item) => { setPickUser(false); if (item) { setOpen({}); setUserId(item.id); } }}
      />
    </ScrollView>
  );
}

// "Can X do Y?" — one action, optionally with record facts to test conditions.
function CheckTester({ userId, catalog }: { userId: number; catalog: FeatureDef[] }) {
  const actions = catalog.filter((f) => f.kind !== 'module');
  const label = (f: FeatureDef) => `${catalog.find((m) => m.key === f.parent)?.label ?? ''}: ${f.label}`;
  const [pick, setPick] = useState(false);
  const [action, setAction] = useState<FeatureDef | null>(null);
  const [own, setOwn] = useState<'any' | 'yes' | 'no'>('any');
  const [days, setDays] = useState('');
  const [status, setStatus] = useState('');
  const [amount, setAmount] = useState('');
  const [result, setResult] = useState<{ allowed: boolean; conditional: boolean; reason: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!action) return;
    setBusy(true);
    try {
      const record = {
        ...(own !== 'any' ? { ownerIsUser: own === 'yes' } : {}),
        ...(days.trim() ? { ageDays: Number(days) } : {}),
        ...(status.trim() ? { status: status.trim() } : {}),
        ...(amount.trim() ? { amount: Number(amount) } : {}),
      };
      const { data } = await adminApi.check({ userId, action: action.key, ...(Object.keys(record).length ? { record } : {}) });
      setResult(data);
    } catch (e: any) {
      setResult({ allowed: false, conditional: false, reason: e?.response?.data?.error ?? 'Check failed' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.tester}>
      <Text style={styles.testerTitle}>Can this user do…?</Text>
      <TouchableOpacity style={styles.picker} onPress={() => setPick(true)}>
        <Ionicons name="search-outline" size={16} color={Colors.textMuted} />
        <Text style={styles.pickerText}>{action ? label(action) : 'Choose an action'}</Text>
      </TouchableOpacity>
      {!!action?.conditions?.length && (
        <>
          <Text style={styles.lineSub}>Optional — a record to test this action's conditions:</Text>
          {action.conditions.includes('own') && (
            <View style={styles.ownRow}>
              <Text style={styles.switchText}>Created by this user?</Text>
              {(['any', 'yes', 'no'] as const).map((v) => (
                <TouchableOpacity key={v} style={[styles.ownChip, own === v && styles.ownChipOn]} onPress={() => setOwn(v)}>
                  <Text style={[styles.ownChipText, own === v && { color: '#fff' }]}>{v === 'any' ? 'skip' : v}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {action.conditions.includes('withinDays') && (
            <TextInput style={styles.input} value={days} onChangeText={setDays} keyboardType="number-pad" placeholder="Record age in days" placeholderTextColor={Colors.textMuted} />
          )}
          {action.conditions.includes('statusIn') && (
            <TextInput style={styles.input} value={status} onChangeText={setStatus} placeholder={`Status (${(action.statuses ?? []).join(', ')})`} placeholderTextColor={Colors.textMuted} autoCapitalize="none" />
          )}
          {action.conditions.includes('maxAmount') && (
            <TextInput style={styles.input} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="Amount (Rs.)" placeholderTextColor={Colors.textMuted} />
          )}
        </>
      )}
      <TouchableOpacity style={[styles.checkBtn, (!action || busy) && { opacity: 0.6 }]} onPress={run} disabled={!action || busy}>
        {busy ? <ActivityIndicator size="small" color="#111" /> : <Text style={styles.checkText}>Check</Text>}
      </TouchableOpacity>
      {result && (
        <Text style={[styles.result, { color: result.allowed ? (result.conditional ? Colors.warning : Colors.success) : Colors.error }]}>
          {result.allowed ? (result.conditional ? 'Allowed, if the record meets the conditions' : 'Allowed') : 'Not allowed'} — {result.reason}
        </Text>
      )}
      <SearchPickerModal
        visible={pick}
        title="Choose an action"
        loading={actions.length === 0}
        items={actions.map((f, i) => ({ id: i, label: label(f), sub: f.key }))}
        onSelect={(item) => { setPick(false); if (item) { setAction(actions[item.id]); setResult(null); } }}
      />
    </View>
  );
}

const WEB_NO_OUTLINE: any = Platform.select({ web: { outlineStyle: 'none' } });

const styles = StyleSheet.create({
  scroll:  { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 60, gap: 10 },
  picker:  { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 11 },
  pickerText: { flex: 1, fontSize: 14, color: Colors.textPrimary, fontWeight: '600' },
  error:   { color: Colors.error, fontSize: 13 },
  flags:   { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, padding: 12, gap: 4 },
  flag:    { fontSize: 13, color: Colors.textPrimary, fontWeight: '600' },
  flagMuted: { fontSize: 12, color: Colors.textMuted },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  switchText: { flex: 1, fontSize: 13, color: Colors.textSecondary },
  hub:     { fontSize: 11, fontWeight: '800', color: Colors.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginTop: 8 },
  module:  { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  moduleHead:  { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  moduleLabel: { flex: 1, fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  count:   { fontSize: 12, fontWeight: '700' },
  line:    { flexDirection: 'row', gap: 8, paddingVertical: 6, borderTopWidth: 1, borderTopColor: Colors.border, alignItems: 'flex-start' },
  lineLabel:  { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  lineSub:    { fontSize: 12, color: Colors.textSecondary },
  lineSource: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  tester:  { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, padding: 12, gap: 8, marginTop: 10 },
  testerTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  ownRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  ownChip: { borderWidth: 1, borderColor: Colors.border, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  ownChipOn: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  ownChipText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  input:   { backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, color: Colors.textPrimary, ...WEB_NO_OUTLINE },
  checkBtn: { backgroundColor: Colors.accent, borderRadius: 8, paddingVertical: 11, alignItems: 'center' },
  checkText: { fontSize: 14, fontWeight: '700', color: '#111' },
  result:  { fontSize: 13, fontWeight: '700' },
});
