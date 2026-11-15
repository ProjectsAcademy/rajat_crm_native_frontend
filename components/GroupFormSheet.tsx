import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Switch, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { adminApi, AdminGroup, AdminRole, AdminUser } from '../services/api';
import { Colors } from '../constants/colors';
import LedgerSheetFrame from './LedgerSheetFrame';

// Group = a set of users with roles assigned (docs/shared/PERMISSIONS_PLAN.md
// §4): every member gets every permission of the group's active roles.

interface Props {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  group?: AdminGroup | null;
}

export default function GroupFormSheet({ visible, onClose, onSaved, group }: Props) {
  const isEdit = !!group;
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [roleIds, setRoleIds] = useState<number[]>([]);
  const [userIds, setUserIds] = useState<number[]>([]);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (!visible) return;
    setName(group?.name ?? '');
    setDescription(group?.description ?? '');
    setIsActive(group?.isActive ?? true);
    setRoleIds(group?.roles.map((r) => r.id) ?? []);
    setUserIds(group?.members.map((m) => m.id) ?? []);
    setUserSearch('');
    setSaveError('');
    setLoading(true);
    Promise.all([adminApi.roles.list(), adminApi.users.list()])
      .then(([r, u]) => { setRoles(r.data.roles); setUsers(u.data.users); })
      .catch(() => setSaveError('Could not load roles and users.'))
      .finally(() => setLoading(false));
  }, [visible, group]);

  const toggle = (list: number[], set: (v: number[]) => void, id: number) =>
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  const handleSave = async () => {
    setSaveError('');
    if (!name.trim()) { setSaveError('Group name is required.'); return; }
    setSaving(true);
    try {
      if (isEdit && group) {
        await adminApi.groups.update(group.id, { name: name.trim(), description, isActive });
        await adminApi.groups.setRoles(group.id, roleIds);
        await adminApi.groups.setMembers(group.id, userIds);
      } else {
        await adminApi.groups.create({ name: name.trim(), description, roleIds, userIds });
      }
      onSaved();
      onClose();
    } catch (e: any) {
      setSaveError(e?.response?.data?.error ?? 'Failed to save group.');
    } finally {
      setSaving(false);
    }
  };

  const q = userSearch.trim().toLowerCase();
  const shownUsers = users.filter((u) => !q || u.username.toLowerCase().includes(q) || `${u.firstName} ${u.lastName}`.toLowerCase().includes(q));

  const Check = ({ checked, label, sub, onPress, muted }: { checked: boolean; label: string; sub?: string; onPress: () => void; muted?: boolean }) => (
    <TouchableOpacity style={[st.checkRow, muted && { opacity: 0.6 }]} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name={checked ? 'checkbox' : 'square-outline'} size={20} color={checked ? Colors.accent : Colors.textMuted} />
      <View style={{ flex: 1 }}>
        <Text style={st.checkLabel}>{label}</Text>
        {!!sub && <Text style={st.checkSub}>{sub}</Text>}
      </View>
    </TouchableOpacity>
  );

  return (
    <LedgerSheetFrame
      visible={visible}
      title={isEdit ? 'Edit Group' : 'New Group'}
      subtitle={isEdit ? group?.name : undefined}
      icon="people-circle-outline"
      saving={saving}
      saveLabel={isEdit ? 'Update Group' : 'Create Group'}
      onSave={handleSave}
      onClose={onClose}
    >
      {!!saveError && (
        <View style={st.errorBanner}>
          <Ionicons name="alert-circle" size={18} color={Colors.error} />
          <Text style={st.errorText}>{saveError}</Text>
        </View>
      )}

      <Text style={st.label}>Group Name <Text style={{ color: Colors.error }}>*</Text></Text>
      <TextInput style={st.input} value={name} onChangeText={setName} placeholder="e.g. Office staff" placeholderTextColor={Colors.textMuted} />
      <Text style={st.label}>Description <Text style={st.opt}>(optional)</Text></Text>
      <TextInput style={st.input} value={description} onChangeText={setDescription} placeholder="Who is in this group?" placeholderTextColor={Colors.textMuted} />
      {isEdit && (
        <View style={st.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={st.label}>Group Active</Text>
            <Text style={st.checkSub}>An inactive group gives its members nothing.</Text>
          </View>
          <Switch value={isActive} onValueChange={setIsActive} trackColor={{ true: Colors.accent, false: Colors.border }} thumbColor="#fff" />
        </View>
      )}

      <Text style={st.label}>Roles</Text>
      <Text style={st.hint}>Members get every permission of these roles. Build roles under Admin → Roles.</Text>
      {loading ? <ActivityIndicator color={Colors.accent} style={{ alignSelf: 'flex-start', marginVertical: 8 }} /> : roles.length === 0 ? (
        <Text style={st.hint}>No roles yet — create one under Admin → Roles.</Text>
      ) : roles.map((r) => (
        <Check
          key={r.id}
          checked={roleIds.includes(r.id)}
          label={r.name + (r.isActive ? '' : ' (inactive)')}
          sub={r.description || `${r.permissions.length} permission(s)`}
          muted={!r.isActive}
          onPress={() => toggle(roleIds, setRoleIds, r.id)}
        />
      ))}

      <Text style={[st.label, { marginTop: 10 }]}>Members ({userIds.length})</Text>
      {users.length > 6 && (
        <TextInput style={st.input} value={userSearch} onChangeText={setUserSearch} placeholder="Search users" placeholderTextColor={Colors.textMuted} />
      )}
      {!loading && shownUsers.map((u) => (
        <Check
          key={u.id}
          checked={userIds.includes(u.id)}
          label={u.username + (u.isActive ? '' : ' (disabled)')}
          sub={`${u.firstName} ${u.lastName}`.trim() || undefined}
          muted={!u.isActive}
          onPress={() => toggle(userIds, setUserIds, u.id)}
        />
      ))}
    </LedgerSheetFrame>
  );
}

const WEB_NO_OUTLINE: any = Platform.select({ web: { outlineStyle: 'none' } });

const st = StyleSheet.create({
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.errorLight, borderWidth: 1, borderColor: Colors.error + '40', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 14 },
  errorText:   { flex: 1, fontSize: 13, color: Colors.error, fontWeight: '600' },
  label:   { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, marginBottom: 5, marginTop: 2 },
  opt:     { fontWeight: '400', color: Colors.textMuted },
  hint:    { fontSize: 12, color: Colors.textMuted, marginBottom: 8 },
  input:   { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, color: Colors.textPrimary, marginBottom: 12, ...WEB_NO_OUTLINE },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 },
  checkRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8 },
  checkLabel: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  checkSub:   { fontSize: 12, color: Colors.textMuted, marginTop: 1 },
});
