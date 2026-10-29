import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Switch, Modal, Platform,
} from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { adminApi, AdminRole, FeatureDef, PermissionConditions, RolePermission } from '../services/api';
import { Colors } from '../constants/colors';
import LedgerSheetFrame from './LedgerSheetFrame';

// Role editor (docs/shared/PERMISSIONS_PLAN.md §7): every module of the
// permission catalog as a row with View · Create · Edit · Delete and, under
// "More", its other actions and hidden fields. A cell cycles not set → Allow
// → Deny. A setting on the module ("All") covers every cell below it unless
// a cell is set itself; a Deny anywhere wins over every Allow the user gets
// from other roles.

interface Props {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  role?: AdminRole | null;
}

type Effect = 'allow' | 'deny';
type Grants = Record<string, { effect: Effect; conditions?: PermissionConditions | null }>;

const HUBS: [string, string][] = [['work', 'Work'], ['people', 'People'], ['finance', 'Finance'], ['inventory', 'Inventory']];
const STANDARD = ['view', 'create', 'edit', 'delete'];
const COND_LABEL: Record<string, string> = {
  own: 'Only records they created', maxAmount: 'Up to an amount', withinDays: 'Within N days of creation', statusIn: 'Only while the status is',
};

// The effect a key gets from its nearest set ancestor (shown as "inherited").
function inheritedEffect(grants: Grants, key: string): Effect | null {
  for (let i = key.lastIndexOf('.'); i > 0; i = key.lastIndexOf('.', i - 1)) {
    const g = grants[key.slice(0, i)];
    if (g) return g.effect;
  }
  return null;
}

function conditionSummary(c?: PermissionConditions | null): string {
  if (!c) return '';
  const parts: string[] = [];
  if (c.own) parts.push('own records');
  if (c.withinDays != null) parts.push(`${c.withinDays} day(s)`);
  if (c.maxAmount != null) parts.push(`up to Rs. ${c.maxAmount}`);
  if (c.statusIn?.length) parts.push(c.statusIn.join(' / '));
  return parts.join(' · ');
}

export default function RoleFormSheet({ visible, onClose, onSaved, role }: Props) {
  const isEdit = !!role;
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [grants, setGrants] = useState<Grants>({});
  const [catalog, setCatalog] = useState<FeatureDef[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [condFor, setCondFor] = useState<FeatureDef | null>(null);

  useEffect(() => {
    if (!visible) return;
    setName(role?.name ?? '');
    setDescription(role?.description ?? '');
    setIsActive(role?.isActive ?? true);
    const g: Grants = {};
    for (const p of role?.permissions ?? []) g[p.key] = { effect: p.effect, conditions: p.conditions ?? null };
    setGrants(g);
    setSaveError('');
    setSearch('');
    setOpen({});
    setLoading(true);
    adminApi.features()
      .then(({ data }) => setCatalog(data.features))
      .catch(() => setSaveError('Could not load the permission list.'))
      .finally(() => setLoading(false));
  }, [visible, role]);

  const byKey = useMemo(() => new Map(catalog.map((f) => [f.key, f])), [catalog]);
  const modules = catalog.filter((f) => f.kind === 'module');
  const childrenOf = (key: string) => catalog.filter((f) => f.parent === key && f.kind !== 'module');
  const subModules = (key: string) => modules.filter((m) => m.parent === key);

  const cycle = (key: string) => {
    setGrants((prev) => {
      const next = { ...prev };
      const cur = prev[key]?.effect;
      if (!cur) next[key] = { effect: 'allow' };
      else if (cur === 'allow') next[key] = { effect: 'deny' };
      else delete next[key];
      return next;
    });
  };

  const matches = (m: FeatureDef) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const own = [m, ...childrenOf(m.key), ...subModules(m.key).flatMap((sm) => [sm, ...childrenOf(sm.key)])];
    return own.some((f) => f.label.toLowerCase().includes(q) || f.key.includes(q));
  };

  const handleSave = async () => {
    setSaveError('');
    if (!name.trim()) { setSaveError('Role name is required.'); return; }
    const permissions: RolePermission[] = Object.entries(grants).map(([key, g]) => ({
      key, effect: g.effect, ...(g.effect === 'allow' && g.conditions ? { conditions: g.conditions } : {}),
    }));
    setSaving(true);
    try {
      if (isEdit && role) {
        await adminApi.roles.update(role.id, { name: name.trim(), description, isActive });
        await adminApi.roles.setPermissions(role.id, permissions);
      } else {
        await adminApi.roles.create({ name: name.trim(), description, permissions });
      }
      onSaved();
      onClose();
    } catch (e: any) {
      setSaveError(e?.response?.data?.error ?? 'Failed to save role.');
    } finally {
      setSaving(false);
    }
  };

  // One permission cell: not set / Allow / Deny, or inherited from the module.
  const Cell = ({ f, label }: { f: FeatureDef; label: string }) => {
    const g = grants[f.key];
    const inh = g ? null : inheritedEffect(grants, f.key);
    const state = g?.effect ?? null;
    const cond = g?.effect === 'allow' && g.conditions ? conditionSummary(g.conditions) : '';
    return (
      <View style={st.cellWrap}>
        <TouchableOpacity
          style={[
            st.cell,
            state === 'allow' && st.cellAllow, state === 'deny' && st.cellDeny,
            !state && inh === 'allow' && st.cellInhAllow, !state && inh === 'deny' && st.cellInhDeny,
          ]}
          onPress={() => cycle(f.key)}
          activeOpacity={0.7}
          accessibilityLabel={`${label}: ${state ?? (inh ? `${inh} (inherited)` : 'not set')}`}
        >
          <Ionicons
            name={state === 'allow' || (!state && inh === 'allow') ? 'checkmark' : state === 'deny' || (!state && inh === 'deny') ? 'close' : 'remove'}
            size={13}
            color={state === 'allow' ? '#fff' : state === 'deny' ? '#fff' : inh === 'allow' ? Colors.success : inh === 'deny' ? Colors.error : Colors.textMuted}
          />
          <Text style={[st.cellText, (state === 'allow' || state === 'deny') && { color: '#fff' }]} numberOfLines={1}>{label}</Text>
        </TouchableOpacity>
        {state === 'allow' && !!f.conditions?.length && (
          <TouchableOpacity style={st.condBtn} onPress={() => setCondFor(f)} hitSlop={6} accessibilityLabel={`Conditions: ${f.label}`}>
            <Ionicons name="options-outline" size={14} color={cond ? Colors.accent : Colors.textMuted} />
            {!!cond && <Text style={st.condText} numberOfLines={1}>{cond}</Text>}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const ModuleRow = ({ m, indent = false }: { m: FeatureDef; indent?: boolean }) => {
    const kids = childrenOf(m.key);
    const standard = STANDARD.map((a) => byKey.get(`${m.key}.${a}`)).filter((f): f is FeatureDef => !!f);
    const more = kids.filter((f) => !standard.includes(f));
    const isOpen = !!open[m.key] || !!search.trim();
    const setCount = kids.filter((f) => grants[f.key]).length;
    return (
      <View style={[st.moduleRow, indent && st.moduleIndent]}>
        <View style={st.moduleHead}>
          <Text style={st.moduleLabel}>{m.label}</Text>
          <Cell f={m} label="All" />
        </View>
        {standard.length > 0 && (
          <View style={st.cells}>
            {standard.map((f) => <Cell key={f.key} f={f} label={f.label} />)}
          </View>
        )}
        {more.length > 0 && (
          <>
            <TouchableOpacity style={st.moreBtn} onPress={() => setOpen((o) => ({ ...o, [m.key]: !o[m.key] }))}>
              <Ionicons name={isOpen ? 'chevron-down' : 'chevron-forward'} size={14} color={Colors.info} />
              <Text style={st.moreText}>More ({more.length}){setCount ? ` · ${setCount} set` : ''}</Text>
            </TouchableOpacity>
            {isOpen && (
              <View style={st.moreList}>
                {more.map((f) => (
                  <View key={f.key} style={st.moreRow}>
                    <Text style={st.moreLabel}>
                      {f.kind === 'field' ? 'Field · ' : ''}{f.label}{f.appOnly ? ' (app only)' : ''}
                    </Text>
                    <Cell f={f} label={grants[f.key]?.effect === 'allow' ? 'Allow' : grants[f.key]?.effect === 'deny' ? 'Deny' : 'Not set'} />
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </View>
    );
  };

  return (
    <LedgerSheetFrame
      visible={visible}
      title={isEdit ? 'Edit Role' : 'New Role'}
      subtitle={isEdit ? role?.name : undefined}
      icon="key-outline"
      saving={saving}
      saveLabel={isEdit ? 'Update Role' : 'Create Role'}
      onSave={handleSave}
      onClose={onClose}
      maxWidth={860}
    >
      {!!saveError && (
        <View style={st.errorBanner}>
          <Ionicons name="alert-circle" size={18} color={Colors.error} />
          <Text style={st.errorText}>{saveError}</Text>
        </View>
      )}

      <Text style={st.label}>Role Name <Text style={{ color: Colors.error }}>*</Text></Text>
      <TextInput style={st.input} value={name} onChangeText={setName} placeholder="e.g. Invoice clerk" placeholderTextColor={Colors.textMuted} />
      <Text style={st.label}>Description <Text style={st.opt}>(optional)</Text></Text>
      <TextInput style={st.input} value={description} onChangeText={setDescription} placeholder="What may this role do?" placeholderTextColor={Colors.textMuted} />
      {isEdit && (
        <View style={st.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={st.label}>Role Active</Text>
            <Text style={st.hint}>An inactive role gives nothing to its groups and users.</Text>
          </View>
          <Switch value={isActive} onValueChange={setIsActive} trackColor={{ true: Colors.accent, false: Colors.border }} thumbColor="#fff" />
        </View>
      )}

      <Text style={st.label}>Permissions</Text>
      <Text style={st.hint}>
        Tap a cell: not set → Allow → Deny. "All" sets the whole module; cells set on their own override it.
        A Deny wins over every Allow, from any role. ⚙ on an allowed cell adds conditions.
      </Text>
      <View style={st.legend}>
        <View style={[st.legendDot, { backgroundColor: Colors.success }]} /><Text style={st.legendText}>Allow</Text>
        <View style={[st.legendDot, { backgroundColor: Colors.error }]} /><Text style={st.legendText}>Deny</Text>
        <View style={[st.legendDot, st.cellInhAllow]} /><Text style={st.legendText}>from "All"</Text>
      </View>
      <TextInput
        style={st.input}
        value={search}
        onChangeText={setSearch}
        placeholder="Search a module or action (e.g. WhatsApp)"
        placeholderTextColor={Colors.textMuted}
      />

      {loading ? <ActivityIndicator color={Colors.accent} style={{ marginVertical: 16 }} /> : HUBS.map(([hub, hubLabel]) => {
        const rows = modules.filter((m) => m.hub === hub && !m.parent && matches(m));
        if (!rows.length) return null;
        return (
          <View key={hub}>
            <Text style={st.hubLabel}>{hubLabel}</Text>
            {rows.map((m) => (
              <View key={m.key}>
                <ModuleRow m={m} />
                {subModules(m.key).filter(matches).map((sm) => <ModuleRow key={sm.key} m={sm} indent />)}
              </View>
            ))}
          </View>
        );
      })}

      <ConditionsModal
        feature={condFor}
        value={condFor ? grants[condFor.key]?.conditions ?? null : null}
        onClose={() => setCondFor(null)}
        onSave={(c) => {
          if (condFor) setGrants((prev) => ({ ...prev, [condFor.key]: { effect: 'allow', conditions: c } }));
          setCondFor(null);
        }}
      />
    </LedgerSheetFrame>
  );
}

// Conditions on one allowed action — only the ones the catalog offers for it.
function ConditionsModal({ feature, value, onClose, onSave }: {
  feature: FeatureDef | null;
  value: PermissionConditions | null;
  onClose: () => void;
  onSave: (c: PermissionConditions | null) => void;
}) {
  const [own, setOwn] = useState(false);
  const [days, setDays] = useState('');
  const [amount, setAmount] = useState('');
  const [statuses, setStatuses] = useState<string[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    setOwn(!!value?.own);
    setDays(value?.withinDays != null ? String(value.withinDays) : '');
    setAmount(value?.maxAmount != null ? String(value.maxAmount) : '');
    setStatuses(value?.statusIn ?? []);
    setError('');
  }, [feature, value]);
  if (!feature) return null;
  const offered = new Set(feature.conditions ?? []);

  const save = () => {
    const c: PermissionConditions = {};
    if (offered.has('own') && own) c.own = true;
    if (offered.has('withinDays') && days.trim()) {
      const n = Number(days);
      if (!Number.isInteger(n) || n < 1) { setError('Days must be a whole number, 1 or more.'); return; }
      c.withinDays = n;
    }
    if (offered.has('maxAmount') && amount.trim()) {
      const n = Number(amount);
      if (!Number.isFinite(n) || n < 0) { setError('Amount must be 0 or more.'); return; }
      c.maxAmount = n;
    }
    if (offered.has('statusIn') && statuses.length) c.statusIn = statuses;
    onSave(Object.keys(c).length ? c : null);
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={st.condBackdrop}>
        <View style={st.condDialog}>
          <Text style={st.condTitle}>Conditions — {feature.label}</Text>
          <Text style={st.hint}>Allowed only when every condition set here is true. Leave all empty for no conditions.</Text>
          {!!error && <Text style={[st.hint, { color: Colors.error }]}>{error}</Text>}
          {offered.has('own') && (
            <View style={st.switchRow}>
              <Text style={[st.label, { flex: 1 }]}>{COND_LABEL.own}</Text>
              <Switch value={own} onValueChange={setOwn} trackColor={{ true: Colors.accent, false: Colors.border }} thumbColor="#fff" />
            </View>
          )}
          {offered.has('withinDays') && (
            <>
              <Text style={st.label}>{COND_LABEL.withinDays}</Text>
              <TextInput style={st.input} value={days} onChangeText={setDays} keyboardType="number-pad" placeholder="e.g. 7 (empty = no limit)" placeholderTextColor={Colors.textMuted} />
            </>
          )}
          {offered.has('maxAmount') && (
            <>
              <Text style={st.label}>{COND_LABEL.maxAmount} (Rs.)</Text>
              <TextInput style={st.input} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="e.g. 2000 (empty = no limit)" placeholderTextColor={Colors.textMuted} />
            </>
          )}
          {offered.has('statusIn') && (
            <>
              <Text style={st.label}>{COND_LABEL.statusIn}</Text>
              <View style={st.cells}>
                {(feature.statuses ?? []).map((sv) => {
                  const on = statuses.includes(sv);
                  return (
                    <TouchableOpacity key={sv} style={[st.cell, on && st.cellAllow]} onPress={() => setStatuses((p) => (on ? p.filter((x) => x !== sv) : [...p, sv]))}>
                      <Text style={[st.cellText, on && { color: '#fff' }]}>{sv.replace('_', ' ')}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}
          <View style={st.condActions}>
            <TouchableOpacity style={st.condCancel} onPress={onClose}><Text style={st.condCancelText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={st.condSave} onPress={save}><Text style={st.condSaveText}>Apply</Text></TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Web-only style kept out of the typed StyleSheet (RN's TextStyle has no
// outlineStyle — the known tsc baseline, KNOWN_ISSUES C).
const WEB_NO_OUTLINE: any = Platform.select({ web: { outlineStyle: 'none' } });

const st = StyleSheet.create({
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.errorLight, borderWidth: 1, borderColor: Colors.error + '40', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 14 },
  errorText:   { flex: 1, fontSize: 13, color: Colors.error, fontWeight: '600' },
  label:   { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, marginBottom: 5, marginTop: 2 },
  opt:     { fontWeight: '400', color: Colors.textMuted },
  hint:    { fontSize: 12, color: Colors.textMuted, marginBottom: 8, lineHeight: 17 },
  input:   { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, color: Colors.textPrimary, marginBottom: 12, ...WEB_NO_OUTLINE },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 },

  legend:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10, flexWrap: 'wrap' },
  legendDot:  { width: 12, height: 12, borderRadius: 3 },
  legendText: { fontSize: 11, color: Colors.textSecondary, marginRight: 8 },

  hubLabel:    { fontSize: 11, fontWeight: '800', color: Colors.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginTop: 14, marginBottom: 6 },
  moduleRow:   { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, padding: 10, marginBottom: 8 },
  moduleIndent:{ marginLeft: 18 },
  moduleHead:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 6 },
  moduleLabel: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, flexShrink: 1 },
  cells:       { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  cellWrap:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cell:        { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: Colors.border, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: Colors.background },
  cellAllow:   { backgroundColor: Colors.success, borderColor: Colors.success },
  cellDeny:    { backgroundColor: Colors.error, borderColor: Colors.error },
  cellInhAllow:{ borderColor: Colors.success, backgroundColor: Colors.successLight },
  cellInhDeny: { borderColor: Colors.error, backgroundColor: Colors.errorLight },
  cellText:    { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  condBtn:     { flexDirection: 'row', alignItems: 'center', gap: 3, maxWidth: 180 },
  condText:    { fontSize: 11, color: Colors.accent, fontWeight: '600', flexShrink: 1 },
  moreBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, alignSelf: 'flex-start' },
  moreText:    { fontSize: 12, fontWeight: '700', color: Colors.info },
  moreList:    { marginTop: 6, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 6, gap: 6 },
  moreRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' },
  moreLabel:   { fontSize: 13, color: Colors.textPrimary, flexShrink: 1, flexGrow: 1, flexBasis: 160 },

  condBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  condDialog:   { width: '100%', maxWidth: 420, backgroundColor: Colors.background, borderRadius: 12, padding: 18 },
  condTitle:    { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 6 },
  condActions:  { flexDirection: 'row', gap: 10, marginTop: 14 },
  condCancel:   { flex: 1, paddingVertical: 11, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  condCancelText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  condSave:     { flex: 1, paddingVertical: 11, borderRadius: 8, backgroundColor: Colors.accent, alignItems: 'center' },
  condSaveText: { fontSize: 14, fontWeight: '700', color: '#111' },
});
