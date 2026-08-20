import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Modal,
  ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView, Dimensions, Switch,
} from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { adminApi, AdminUser, AdminGroup, AdminUserPayload } from '../services/api';
import { Colors } from '../constants/colors';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  user?: AdminUser | null;
}

export default function UserFormSheet({ visible, onClose, onSaved, user }: Props) {
  const isEdit = !!user;
  const isWeb = Platform.OS === 'web';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [selectedGroups, setSelectedGroups] = useState<number[]>([]);

  const [groups, setGroups] = useState<AdminGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setUsername(user?.username ?? '');
    setPassword('');
    setEmail(user?.email ?? '');
    setFirstName(user?.firstName ?? '');
    setLastName(user?.lastName ?? '');
    setIsActive(user?.isActive ?? true);
    setSelectedGroups(user?.groups.map((g) => g.id) ?? []);
    setSaveError('');
    setShowPassword(false);

    setLoadingGroups(true);
    adminApi.groups.list()
      .then(({ data }) => setGroups(data.groups.filter((g) => g.isActive)))
      .catch(() => {})
      .finally(() => setLoadingGroups(false));
  }, [visible, user]);

  const toggleGroup = (id: number) => {
    setSelectedGroups((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    setSaveError('');
    if (!isEdit && !username.trim()) { setSaveError('Username is required.'); return; }
    if (!isEdit && password.length < 8) { setSaveError('Password must be at least 8 characters.'); return; }
    if (isEdit && password && password.length < 8) { setSaveError('New password must be at least 8 characters.'); return; }

    setSaving(true);
    try {
      if (isEdit && user) {
        const payload: Partial<AdminUserPayload> = { email, firstName, lastName, isActive };
        if (password) payload.password = password;
        await adminApi.users.update(user.id, payload);
        await adminApi.users.setGroups(user.id, selectedGroups);
      } else {
        await adminApi.users.create({
          username: username.trim(), password, email, firstName, lastName,
          groupIds: selectedGroups,
        });
      }
      onSaved();
      onClose();
    } catch (e: any) {
      setSaveError(e?.response?.data?.error ?? 'Failed to save user.');
    } finally {
      setSaving(false);
    }
  };

  const renderErrorBanner = (st: any) =>
    saveError ? (
      <View style={st.errorBanner}>
        <Ionicons name="alert-circle" size={18} color={Colors.error} />
        <Text style={st.errorBannerText}>{saveError}</Text>
      </View>
    ) : null;

  const renderGroupChecks = (st: any) => (
    <View style={{ marginBottom: 12 }}>
      {loadingGroups ? (
        <ActivityIndicator size="small" color={Colors.accent} style={{ alignSelf: 'flex-start', marginVertical: 8 }} />
      ) : groups.length === 0 ? (
        <Text style={{ fontSize: 13, color: Colors.textMuted, marginVertical: 4 }}>
          No groups yet — create one under Admin → Groups.
        </Text>
      ) : (
        groups.map((g) => {
          const checked = selectedGroups.includes(g.id);
          return (
            <TouchableOpacity key={g.id} style={st.checkRow} onPress={() => toggleGroup(g.id)} activeOpacity={0.7}>
              <Ionicons
                name={checked ? 'checkbox' : 'square-outline'}
                size={20}
                color={checked ? Colors.accent : Colors.textMuted}
              />
              <View style={{ flex: 1 }}>
                <Text style={st.checkLabel}>{g.name}</Text>
                {!!g.description && <Text style={st.checkSub}>{g.description}</Text>}
              </View>
            </TouchableOpacity>
          );
        })
      )}
    </View>
  );

  const formFields = (st: any) => (
    <>
      {renderErrorBanner(st)}

      <Text style={st.label}>Username {!isEdit && <Text style={st.req}>*</Text>}</Text>
      <TextInput
        style={[st.inputBox, isEdit && { opacity: 0.6 }]}
        value={username}
        onChangeText={setUsername}
        editable={!isEdit}
        placeholder="Enter username..."
        placeholderTextColor={Colors.textMuted}
        autoCapitalize="none"
        autoComplete="off"
        textContentType="none"
        importantForAutofill="no"
      />

      <Text style={st.label}>
        {isEdit ? <>New Password <Text style={st.opt}>(leave blank to keep current)</Text></> : <>Password <Text style={st.req}>*</Text></>}
      </Text>
      <View style={st.pwRow}>
        <TextInput
          style={st.pwInput}
          value={password}
          onChangeText={setPassword}
          placeholder={isEdit ? 'Unchanged' : 'Min 8 characters'}
          placeholderTextColor={Colors.textMuted}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoComplete="off"
          textContentType="none"
          importantForAutofill="no"
        />
        <TouchableOpacity onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
          <Ionicons
            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color={Colors.textMuted}
          />
        </TouchableOpacity>
      </View>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={st.label}>First Name <Text style={st.opt}>(optional)</Text></Text>
          <TextInput style={st.inputBox} value={firstName} onChangeText={setFirstName} placeholder="First name" placeholderTextColor={Colors.textMuted} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={st.label}>Last Name <Text style={st.opt}>(optional)</Text></Text>
          <TextInput style={st.inputBox} value={lastName} onChangeText={setLastName} placeholder="Last name" placeholderTextColor={Colors.textMuted} />
        </View>
      </View>

      <Text style={st.label}>Email <Text style={st.opt}>(optional)</Text></Text>
      <TextInput
        style={st.inputBox}
        value={email}
        onChangeText={setEmail}
        placeholder="email@example.com"
        placeholderTextColor={Colors.textMuted}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="off"
        textContentType="none"
        importantForAutofill="no"
      />

      {isEdit && (
        <View style={st.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={st.label}>Account Active</Text>
            <Text style={st.checkSub}>Disabled users cannot sign in or call the API.</Text>
          </View>
          <Switch
            value={isActive}
            onValueChange={setIsActive}
            trackColor={{ true: Colors.accent, false: Colors.border }}
            thumbColor="#fff"
          />
        </View>
      )}

      <Text style={st.label}>Groups</Text>
      {renderGroupChecks(st)}
    </>
  );

  // ── Web dialog ──────────────────────────────────────────────────────────────
  if (isWeb) {
    const SCREEN_H = Dimensions.get('window').height;
    return (
      <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
        <View style={w.backdrop}>
          <View style={[w.dialog, { maxHeight: SCREEN_H * 0.92 }]}>
            <View style={w.header}>
              <View style={w.headerLeft}>
                <Ionicons name="person-add-outline" size={18} color={Colors.accent} />
                <Text style={w.headerTitle}>{isEdit ? 'Edit User' : 'New User'}</Text>
                {isEdit && user && <Text style={w.headerSub}>{user.username}</Text>}
              </View>
              <View style={w.headerActions}>
                <TouchableOpacity style={w.cancelBtn} onPress={onClose} disabled={saving}>
                  <Text style={w.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[w.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                  {saving ? <ActivityIndicator size="small" color="#111" /> : (
                    <><Ionicons name="checkmark" size={15} color="#111" /><Text style={w.saveText}>{isEdit ? 'Update User' : 'Create User'}</Text></>
                  )}
                </TouchableOpacity>
              </View>
            </View>
            <ScrollView contentContainerStyle={w.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {formFields(w)}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  }

  // ── Mobile ──────────────────────────────────────────────────────────────────
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.header}>
          <Text style={s.title}>{isEdit ? 'Edit User' : 'New User'}</Text>
          <TouchableOpacity onPress={onClose} style={s.closeBtn}>
            <Ionicons name="close" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <ScrollView style={{ flex: 1, backgroundColor: Colors.background }} contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
          {formFields(s)}
          <View style={s.actions}>
            <TouchableOpacity style={s.cancelBtn} onPress={onClose} disabled={saving}>
              <Text style={s.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color="#111" /> : <Text style={s.saveText}>{isEdit ? 'Update User' : 'Save User'}</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Web styles ────────────────────────────────────────────────────────────────
const w = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  dialog:   { width: '100%', maxWidth: 560, backgroundColor: Colors.background, borderRadius: 12, overflow: 'hidden', elevation: 32, ...Platform.select({ web: { boxShadow: '0 12px 32px rgba(0,0,0,0.35)' }, default: { shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.35, shadowRadius: 32 } }) },

  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 14, backgroundColor: Colors.primary, borderBottomWidth: 1, borderBottomColor: Colors.primaryLight },
  headerLeft:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle:   { fontSize: 17, fontWeight: '700', color: '#fff' },
  headerSub:     { fontSize: 12, color: Colors.accent, fontWeight: '600', marginLeft: 4 },
  headerActions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  cancelBtn:     { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  cancelText:    { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.85)' },
  saveBtn:       { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 18, paddingVertical: 8, borderRadius: 6, backgroundColor: Colors.accent },
  saveText:      { fontSize: 13, fontWeight: '700', color: '#111' },

  body: { padding: 24 },

  errorBanner:     { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.errorLight, borderWidth: 1, borderColor: Colors.error + '40', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16 },
  errorBannerText: { flex: 1, fontSize: 13, color: Colors.error, fontWeight: '600' },

  label: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, marginBottom: 5, marginTop: 2 },
  opt:   { fontWeight: '400', color: Colors.textMuted },
  req:   { color: Colors.error },

  inputBox: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, color: Colors.textPrimary, marginBottom: 12, ...Platform.select({ web: { outlineStyle: 'none' } }) },

  pwRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 6, paddingHorizontal: 12, marginBottom: 12 },
  pwInput: { flex: 1, fontSize: 14, color: Colors.textPrimary, paddingVertical: 9, ...Platform.select({ web: { outlineStyle: 'none' } }) },

  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 },

  checkRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8 },
  checkLabel: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  checkSub:   { fontSize: 12, color: Colors.textMuted, marginTop: 1 },
});

// ── Mobile styles ─────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  header:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 60 : 24, paddingBottom: 14, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title:    { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  closeBtn: { padding: 4 },
  body:     { padding: 16, paddingBottom: 48 },
  label:    { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6, marginTop: 4 },
  opt:      { fontSize: 12, fontWeight: '400', color: Colors.textMuted },
  req:      { color: Colors.error },

  errorBanner:     { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.errorLight, borderWidth: 1, borderColor: Colors.error + '40', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 },
  errorBannerText: { flex: 1, fontSize: 13, color: Colors.error, fontWeight: '600' },

  inputBox: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, color: Colors.textPrimary, marginBottom: 14, ...Platform.select({ web: { outlineStyle: 'none' } }) },

  pwRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: 12, marginBottom: 14 },
  pwInput: { flex: 1, fontSize: 15, color: Colors.textPrimary, paddingVertical: 11, ...Platform.select({ web: { outlineStyle: 'none' } }) },

  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, marginBottom: 14 },

  checkRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, marginBottom: 8 },
  checkLabel: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  checkSub:   { fontSize: 12, color: Colors.textMuted, marginTop: 1 },

  actions:    { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn:  { flex: 1, paddingVertical: 14, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  cancelText: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
  saveBtn:    { flex: 2, paddingVertical: 14, borderRadius: 8, backgroundColor: Colors.accent, alignItems: 'center' },
  saveText:   { fontSize: 15, fontWeight: '700', color: '#111' },
});
