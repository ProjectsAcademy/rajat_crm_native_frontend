import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, FlatList, RefreshControl,
  Platform, Modal, TextInput, Switch, Share,
} from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { adminApi, AdminRole } from '../../../services/api';
import { Colors } from '../../../constants/colors';
import { confirmAsync, notify } from '../../../utils/dialogs';
import RoleFormSheet from '../../../components/RoleFormSheet';

// Roles = permission sets the client builds (docs/shared/PERMISSIONS_PLAN.md
// §4, §7). Export / import copy roles and groups between dev and production.

export default function AdminRolesScreen() {
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editRole, setEditRole] = useState<AdminRole | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [showImport, setShowImport] = useState(false);

  const fetchRoles = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const { data } = await adminApi.roles.list();
      setRoles(data.roles);
      return data.roles;
    } catch {
      setError('Could not load roles.');
      return [];
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchRoles(true); }, [fetchRoles]));

  const handleDelete = async (role: AdminRole) => {
    if (!(await confirmAsync('Delete role', `Delete "${role.name}" permanently?`, 'Delete', true))) return;
    setBusyId(role.id);
    try {
      try {
        await adminApi.roles.remove(role.id);
      } catch (e: any) {
        const msg = e?.response?.data?.error ?? 'Failed to delete role.';
        if (e?.response?.status === 400 && msg.includes('assigned')) {
          if (!(await confirmAsync('Role is in use', `${msg.replace(' Pass ?force=true to delete anyway.', '')}\nThey lose its permissions. Delete anyway?`, 'Delete', true))) return;
          await adminApi.roles.remove(role.id, true);
        } else throw e;
      }
      fetchRoles(true);
    } catch (e: any) {
      notify('Could not delete role', e?.response?.data?.error ?? 'Something went wrong.');
    } finally {
      setBusyId(null);
    }
  };

  // A copy named "<name> copy" (2, 3, ...), opened for editing.
  const handleCopy = async (role: AdminRole) => {
    const names = new Set(roles.map((r) => r.name));
    let name = `${role.name} copy`;
    for (let n = 2; names.has(name); n++) name = `${role.name} copy ${n}`;
    setBusyId(role.id);
    try {
      const { data } = await adminApi.roles.copy(role.id, name);
      await fetchRoles(true);
      setEditRole(data.role);
      setShowForm(true);
    } catch (e: any) {
      notify('Could not copy role', e?.response?.data?.error ?? 'Something went wrong.');
    } finally {
      setBusyId(null);
    }
  };

  const handleExport = async () => {
    try {
      const { data } = await adminApi.exportAll();
      const json = JSON.stringify(data, null, 2);
      if (Platform.OS === 'web') {
        const blob = new Blob([json], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `roles-and-groups-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
      } else {
        await Share.share({ message: json, title: 'Roles and groups' });
      }
    } catch (e: any) {
      notify('Export failed', e?.response?.data?.error ?? 'Something went wrong.');
    }
  };

  const renderRole = ({ item }: { item: AdminRole }) => {
    const allows = item.permissions.filter((p) => p.effect === 'allow').length;
    const denies = item.permissions.length - allows;
    const usedBy = [
      ...item.groups.map((g) => `group ${g.name}`),
      ...item.users.map((u) => `user ${u.username}`),
    ];
    return (
      <TouchableOpacity style={styles.card} onPress={() => { setEditRole(item); setShowForm(true); }} activeOpacity={0.75}>
        <View style={styles.iconBox}>
          <Ionicons name="key-outline" size={20} color={Colors.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{item.name}{item.isActive ? '' : ' (inactive)'}</Text>
          {!!item.description && <Text style={styles.sub}>{item.description}</Text>}
          <Text style={styles.meta}>
            {allows} allowed · {denies} denied · {usedBy.length ? `used by ${usedBy.join(', ')}` : 'not assigned yet'}
          </Text>
        </View>
        {busyId === item.id ? <ActivityIndicator size="small" color={Colors.accent} /> : (
          <>
            <TouchableOpacity style={styles.iconBtn} onPress={(e) => { e.stopPropagation(); handleCopy(item); }} hitSlop={8} accessibilityLabel="Copy role">
              <Ionicons name="copy-outline" size={17} color={Colors.info} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.iconBtn, styles.deleteBtn]} onPress={(e) => { e.stopPropagation(); handleDelete(item); }} hitSlop={8} accessibilityLabel="Delete role">
              <Ionicons name="trash-outline" size={17} color={Colors.error} />
            </TouchableOpacity>
          </>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.safe}>
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.accent} /></View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={36} color={Colors.textMuted} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchRoles()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={roles}
          keyExtractor={(r) => String(r.id)}
          renderItem={renderRole}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View style={styles.toolbar}>
              <Text style={styles.intro}>A role is a set of permissions. Give roles to groups (Admin → Groups) or to one user.</Text>
              <View style={styles.toolbarBtns}>
                <TouchableOpacity style={styles.toolBtn} onPress={handleExport}>
                  <Ionicons name="download-outline" size={15} color={Colors.info} />
                  <Text style={styles.toolText}>Export</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.toolBtn} onPress={() => setShowImport(true)}>
                  <Ionicons name="cloud-upload-outline" size={15} color={Colors.info} />
                  <Text style={styles.toolText}>Import</Text>
                </TouchableOpacity>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="key-outline" size={40} color={Colors.textMuted} />
              <Text style={styles.errorText}>No roles yet. Tap + to build the first one.</Text>
            </View>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchRoles(true); }} tintColor={Colors.accent} />
          }
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => { setEditRole(null); setShowForm(true); }} activeOpacity={0.85} accessibilityLabel="New role">
        <Ionicons name="add" size={28} color="#111" />
      </TouchableOpacity>

      <RoleFormSheet visible={showForm} onClose={() => setShowForm(false)} onSaved={() => fetchRoles(true)} role={editRole} />
      <ImportModal visible={showImport} onClose={() => setShowImport(false)} onDone={() => fetchRoles(true)} />
    </View>
  );
}

// Paste an export (from dev, for example) and import it: roles and groups are
// matched by name and replaced; members only when asked.
function ImportModal({ visible, onClose, onDone }: { visible: boolean; onClose: () => void; onDone: () => void }) {
  const [text, setText] = useState('');
  const [members, setMembers] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async () => {
    setError('');
    let data: any;
    try { data = JSON.parse(text); } catch { setError('That is not valid JSON — paste the whole export.'); return; }
    if (!Array.isArray(data?.roles) || !Array.isArray(data?.groups)) { setError('The export needs "roles" and "groups" lists.'); return; }
    setBusy(true);
    try {
      const { data: r } = await adminApi.importAll({ ...data, includeMembers: members });
      onDone();
      onClose();
      setText('');
      notify('Imported', `${r.roles} role(s) and ${r.groups} group(s) imported.${r.skippedMembers.length ? `\nUsers not found here (skipped): ${r.skippedMembers.join(', ')}` : ''}`);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Import failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>Import roles and groups</Text>
          <Text style={styles.modalHint}>
            Paste an export. Roles and groups with the same name are replaced; nothing is deleted.
          </Text>
          {!!error && <Text style={[styles.modalHint, { color: Colors.error }]}>{error}</Text>}
          <TextInput
            style={styles.importBox}
            value={text}
            onChangeText={setText}
            multiline
            placeholder='{ "version": 1, "roles": [...], "groups": [...] }'
            placeholderTextColor={Colors.textMuted}
          />
          <View style={styles.switchRow}>
            <Text style={{ flex: 1, fontSize: 13, color: Colors.textPrimary }}>Also set group members (by username)</Text>
            <Switch value={members} onValueChange={setMembers} trackColor={{ true: Colors.accent, false: Colors.border }} thumbColor="#fff" />
          </View>
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={busy}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.saveBtn, busy && { opacity: 0.6 }]} onPress={run} disabled={busy}>
              {busy ? <ActivityIndicator size="small" color="#111" /> : <Text style={styles.saveText}>Import</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const WEB_NO_OUTLINE: any = Platform.select({ web: { outlineStyle: 'none' } });

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 32 },
  errorText: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center' },
  retryBtn:  { marginTop: 6, backgroundColor: Colors.accent, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 6 },
  retryText: { color: '#111', fontWeight: '700', fontSize: 14 },

  list: { padding: 14, gap: 10, paddingBottom: 90, flexGrow: 1 },
  toolbar:     { gap: 8, marginBottom: 4 },
  intro:       { fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },
  toolbarBtns: { flexDirection: 'row', gap: 8 },
  toolBtn:     { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 7 },
  toolText:    { fontSize: 13, fontWeight: '600', color: Colors.info },
  card: {
    backgroundColor: Colors.surface, borderRadius: 10, borderWidth: 1,
    borderColor: Colors.border, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  iconBox: { width: 42, height: 42, borderRadius: 10, backgroundColor: Colors.accentLight, justifyContent: 'center', alignItems: 'center' },
  name: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  sub:  { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  meta: { fontSize: 11, color: Colors.textMuted, marginTop: 4 },
  iconBtn: { width: 34, height: 34, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, justifyContent: 'center', alignItems: 'center' },
  deleteBtn: { borderColor: Colors.error + '40', backgroundColor: Colors.errorLight },

  fab: {
    position: 'absolute', right: 20, bottom: 24, width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.accent, justifyContent: 'center', alignItems: 'center', elevation: 6,
    ...Platform.select({
      web: { boxShadow: '0 4px 12px rgba(0,0,0,0.25)' },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12 },
    }),
  },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modal:      { width: '100%', maxWidth: 560, backgroundColor: Colors.background, borderRadius: 12, padding: 18 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 6 },
  modalHint:  { fontSize: 12, color: Colors.textMuted, marginBottom: 8, lineHeight: 17 },
  importBox:  { minHeight: 180, maxHeight: 320, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 6, padding: 10, fontSize: 12, color: Colors.textPrimary, textAlignVertical: 'top', marginBottom: 10, ...WEB_NO_OUTLINE },
  switchRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelBtn:  { flex: 1, paddingVertical: 11, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  cancelText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  saveBtn:    { flex: 1, paddingVertical: 11, borderRadius: 8, backgroundColor: Colors.accent, alignItems: 'center' },
  saveText:   { fontSize: 14, fontWeight: '700', color: '#111' },
});
