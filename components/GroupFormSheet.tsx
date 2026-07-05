import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Modal,
  ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView, Dimensions,
} from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { adminApi, AdminGroup, FeatureDef } from '../services/api';
import { Colors } from '../constants/colors';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  group?: AdminGroup | null;
}

const HUB_LABELS: Record<string, string> = {
  work: 'Work', people: 'People', finance: 'Finance', inventory: 'Inventory',
};

export default function GroupFormSheet({ visible, onClose, onSaved, group }: Props) {
  const isEdit = !!group;
  const isWeb = Platform.OS === 'web';

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);

  const [features, setFeatures] = useState<FeatureDef[]>([]);
  const [loadingFeatures, setLoadingFeatures] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (!visible) return;
    setName(group?.name ?? '');
    setDescription(group?.description ?? '');
    setSelectedFeatures(group?.features ?? []);
    setSaveError('');

    setLoadingFeatures(true);
    adminApi.features()
      .then(({ data }) => setFeatures(data.features))
      .catch(() => {})
      .finally(() => setLoadingFeatures(false));
  }, [visible, group]);

  const toggleFeature = (key: string) => {
    setSelectedFeatures((prev) => {
      if (prev.includes(key)) return prev.filter((f) => f !== key);
      // Selecting a parent covers all its children — drop redundant child grants
      return [...prev.filter((f) => !f.startsWith(key + '.')), key];
    });
  };

  const handleSave = async () => {
    setSaveError('');
    if (!name.trim()) { setSaveError('Group name is required.'); return; }

    setSaving(true);
    try {
      if (isEdit && group) {
        await adminApi.groups.update(group.id, { name: name.trim(), description });
        await adminApi.groups.setPermissions(group.id, selectedFeatures);
      } else {
        await adminApi.groups.create({ name: name.trim(), description, features: selectedFeatures });
      }
      onSaved();
      onClose();
    } catch (e: any) {
      setSaveError(e?.response?.data?.error ?? 'Failed to save group.');
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

  const renderFeatureMatrix = (st: any) => {
    if (loadingFeatures) {
      return <ActivityIndicator size="small" color={Colors.accent} style={{ alignSelf: 'flex-start', marginVertical: 8 }} />;
    }
    const parents = features.filter((f) => !f.parent);
    const childrenOf = (key: string) => features.filter((f) => f.parent === key);
    const hubs = Array.from(new Set(parents.map((f) => f.hub)));

    const renderRow = (f: (typeof features)[number], parentChecked: boolean) => {
      const checked = selectedFeatures.includes(f.key);
      const covered = parentChecked && !!f.parent; // implied by the parent grant
      return (
        <TouchableOpacity
          key={f.key}
          style={[st.checkRow, !!f.parent && st.checkRowChild, covered && { opacity: 0.55 }]}
          onPress={() => toggleFeature(f.key)}
          disabled={covered}
          activeOpacity={0.7}
        >
          <Ionicons
            name={checked || covered ? 'checkbox' : 'square-outline'}
            size={20}
            color={checked || covered ? Colors.accent : Colors.textMuted}
          />
          <Text style={st.checkLabel}>{f.label}</Text>
          {covered && <Text style={st.coveredHint}>included</Text>}
        </TouchableOpacity>
      );
    };

    return (
      <View style={{ marginBottom: 12 }}>
        {hubs.map((hub) => (
          <View key={hub}>
            <Text style={st.hubLabel}>{HUB_LABELS[hub] ?? hub}</Text>
            {parents.filter((f) => f.hub === hub).map((parent) => {
              const kids = childrenOf(parent.key);
              const parentChecked = selectedFeatures.includes(parent.key);
              return (
                <View key={parent.key}>
                  {renderRow(parent, false)}
                  {kids.map((k) => renderRow(k, parentChecked))}
                </View>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  const formFields = (st: any) => (
    <>
      {renderErrorBanner(st)}

      <Text style={st.label}>Group Name <Text style={st.req}>*</Text></Text>
      <TextInput
        style={st.inputBox}
        value={name}
        onChangeText={setName}
        placeholder="e.g. Operations"
        placeholderTextColor={Colors.textMuted}
        autoComplete="off"
        textContentType="none"
        importantForAutofill="no"
      />

      <Text style={st.label}>Description <Text style={st.opt}>(optional)</Text></Text>
      <TextInput
        style={st.inputBox}
        value={description}
        onChangeText={setDescription}
        placeholder="What is this group for?"
        placeholderTextColor={Colors.textMuted}
      />

      <Text style={st.label}>Feature Access</Text>
      <Text style={st.hint}>Members of this group can open the checked modules.</Text>
      {renderFeatureMatrix(st)}
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
                <Ionicons name="people-circle-outline" size={18} color={Colors.accent} />
                <Text style={w.headerTitle}>{isEdit ? 'Edit Group' : 'New Group'}</Text>
                {isEdit && group && <Text style={w.headerSub}>{group.name}</Text>}
              </View>
              <View style={w.headerActions}>
                <TouchableOpacity style={w.cancelBtn} onPress={onClose} disabled={saving}>
                  <Text style={w.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[w.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                  {saving ? <ActivityIndicator size="small" color="#111" /> : (
                    <><Ionicons name="checkmark" size={15} color="#111" /><Text style={w.saveText}>{isEdit ? 'Update Group' : 'Create Group'}</Text></>
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
          <Text style={s.title}>{isEdit ? 'Edit Group' : 'New Group'}</Text>
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
              {saving ? <ActivityIndicator size="small" color="#111" /> : <Text style={s.saveText}>{isEdit ? 'Update Group' : 'Save Group'}</Text>}
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
  hint:  { fontSize: 12, color: Colors.textMuted, marginBottom: 8 },

  inputBox: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, color: Colors.textPrimary, marginBottom: 12, ...Platform.select({ web: { outlineStyle: 'none' } }) },

  hubLabel:      { fontSize: 11, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 10, marginBottom: 6 },
  checkRow:      { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 6 },
  checkRowChild: { marginLeft: 26, paddingVertical: 7 },
  checkLabel:    { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  coveredHint:   { fontSize: 11, color: Colors.textMuted, marginLeft: 'auto' },
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
  hint:     { fontSize: 12, color: Colors.textMuted, marginBottom: 8 },

  errorBanner:     { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.errorLight, borderWidth: 1, borderColor: Colors.error + '40', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 },
  errorBannerText: { flex: 1, fontSize: 13, color: Colors.error, fontWeight: '600' },

  inputBox: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, color: Colors.textPrimary, marginBottom: 14, ...Platform.select({ web: { outlineStyle: 'none' } }) },

  hubLabel:      { fontSize: 11, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 10, marginBottom: 6 },
  checkRow:      { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 11, marginBottom: 6 },
  checkRowChild: { marginLeft: 26, paddingVertical: 9 },
  checkLabel:    { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  coveredHint:   { fontSize: 11, color: Colors.textMuted, marginLeft: 'auto' },

  actions:    { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn:  { flex: 1, paddingVertical: 14, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  cancelText: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
  saveBtn:    { flex: 2, paddingVertical: 14, borderRadius: 8, backgroundColor: Colors.accent, alignItems: 'center' },
  saveText:   { fontSize: 15, fontWeight: '700', color: '#111' },
});
