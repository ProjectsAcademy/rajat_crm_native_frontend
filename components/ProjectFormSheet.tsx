import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Modal,
  ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView, Dimensions,
} from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { projectsApi, tendersApi, Project } from '../services/api';
import { Colors } from '../constants/colors';
import SearchPickerModal, { PickerItem } from './SearchPickerModal';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSaved: (newProjectId?: number) => void;
  project?: Project | null;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUSES = [
  { key: 'planning',    label: 'Planning'    },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'on_hold',     label: 'On Hold'     },
  { key: 'completed',   label: 'Completed'   },
  { key: 'cancelled',   label: 'Cancelled'   },
];

// ── Date helpers ──────────────────────────────────────────────────────────────

function isoToDisplay(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('T')[0].split('-');
  return `${d}/${m}/${y}`;
}
function displayToIso(s: string): string | null {
  const p = s.split('/');
  if (p.length !== 3 || p[2].length !== 4) return null;
  return `${p[2]}-${p[1].padStart(2,'0')}-${p[0].padStart(2,'0')}`;
}
function autoDate(text: string): string {
  const d = text.replace(/\D/g, '');
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0,2)}/${d.slice(2)}`;
  return `${d.slice(0,2)}/${d.slice(2,4)}/${d.slice(4,8)}`;
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ProjectFormSheet({ visible, onClose, onSaved, project }: Props) {
  const isEdit = !!project;
  const isWeb  = Platform.OS === 'web';

  // Form fields
  const [name,        setName]        = useState('');
  const [description, setDescription] = useState('');
  const [status,      setStatus]      = useState('planning');
  const [budget,      setBudget]      = useState('');
  const [startDate,   setStartDate]   = useState('');
  const [endDate,     setEndDate]     = useState('');
  const [tenderId,    setTenderId]    = useState<number | null>(null);
  const [tenderLabel, setTenderLabel] = useState('');
  const [saving,      setSaving]      = useState(false);
  const [saveError,   setSaveError]   = useState('');

  // Tender picker
  const [tenders,         setTenders]         = useState<PickerItem[]>([]);
  const [loadingTenders,  setLoadingTenders]  = useState(false);
  const [showTenderPicker, setShowTenderPicker] = useState(false);

  // Reset / pre-fill
  useEffect(() => {
    if (!visible) return;
    if (project) {
      setName(project.name);
      setDescription(project.description ?? '');
      setStatus(project.status);
      setBudget(parseFloat(project.budget) > 0 ? parseFloat(project.budget).toString() : '');
      setStartDate(project.startDate ? isoToDisplay(project.startDate) : '');
      setEndDate(project.endDate ? isoToDisplay(project.endDate) : '');
      setTenderId(project.tender?.id ?? null);
      setTenderLabel(project.tender ? `${project.tender.tenderNo} · ${project.tender.title}` : '');
    } else {
      setName('');        setDescription('');
      setStatus('planning'); setBudget('');
      setStartDate('');   setEndDate('');
      setTenderId(null);  setTenderLabel('');
    }
    setSaveError('');
  }, [visible, project]);

  const openTenderPicker = () => {
    if (!tenders.length) {
      setLoadingTenders(true);
      tendersApi.list({ limit: 500 })
        .then(({ data }) => setTenders(data.tenders.map(t => ({ id: t.id, label: t.title, sub: t.tenderNo }))))
        .catch(() => {}).finally(() => setLoadingTenders(false));
    }
    setShowTenderPicker(true);
  };

  // Save
  const handleSave = async () => {
    setSaveError('');

    if (!name.trim()) { setSaveError('Project name is required'); return; }

    const isoStart = startDate ? displayToIso(startDate) : null;
    if (startDate && !isoStart) { setSaveError('Enter start date as DD/MM/YYYY'); return; }
    const isoEnd = endDate ? displayToIso(endDate) : null;
    if (endDate && !isoEnd) { setSaveError('Enter end date as DD/MM/YYYY'); return; }
    if (isoStart && isoEnd && isoEnd < isoStart) { setSaveError('End date cannot be before start date'); return; }

    const b = budget.trim() === '' ? 0 : parseFloat(budget);
    if (isNaN(b) || b < 0) { setSaveError('Budget must be a number greater than or equal to 0'); return; }

    const payload = {
      name:        name.trim(),
      description,
      status,
      budget:      b,
      startDate:   isoStart,
      endDate:     isoEnd,
      tenderId:    tenderId ?? null,
    };

    setSaving(true);
    try {
      if (isEdit) {
        await projectsApi.update(project!.id, payload);
        onSaved();
      } else {
        const { data } = await projectsApi.create(payload);
        onSaved(data.project.id);
      }
      onClose();
    } catch (e: any) {
      setSaveError(e?.response?.data?.error || 'Could not save project. Check your connection and try again.');
    } finally { setSaving(false); }
  };

  // Shared pickers JSX
  const pickers = (
    <SearchPickerModal visible={showTenderPicker} title="Select Tender" items={tenders} loading={loadingTenders}
      onSelect={item => {
        if (item) { setTenderId(item.id); setTenderLabel(`${item.sub} · ${item.label}`); }
        setShowTenderPicker(false);
      }} />
  );

  // Shared field fragments used by both layouts (styles differ per layout)
  const renderStatusChips = (st: typeof w | typeof s) => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
      {STATUSES.map(opt => (
        <TouchableOpacity key={opt.key} style={[st.chip, status === opt.key && st.chipActive]} onPress={() => setStatus(opt.key)}>
          <Text style={[st.chipText, status === opt.key && st.chipTextActive]}>{opt.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderTenderField = (st: typeof w | typeof s) => (
    <TouchableOpacity style={st.pickerField} onPress={openTenderPicker}>
      <Text style={tenderId ? st.pickerValue : st.pickerPlaceholder} numberOfLines={1}>
        {tenderId ? tenderLabel : 'Select tender...'}
      </Text>
      <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
        {tenderId && (
          <TouchableOpacity onPress={() => { setTenderId(null); setTenderLabel(''); }} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
            <Ionicons name="close-circle" size={15} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
        <Ionicons name="chevron-down" size={15} color={Colors.textMuted} />
      </View>
    </TouchableOpacity>
  );

  const renderErrorBanner = (st: typeof w | typeof s) => saveError ? (
    <View style={st.errorBanner}>
      <Ionicons name="alert-circle-outline" size={16} color={Colors.error} />
      <Text style={st.errorBannerText}>{saveError}</Text>
      <TouchableOpacity onPress={() => setSaveError('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="close" size={14} color={Colors.error} />
      </TouchableOpacity>
    </View>
  ) : null;

  // ══════════════════════════════════════════════════════════════════════════
  //  WEB LAYOUT
  // ══════════════════════════════════════════════════════════════════════════
  if (isWeb) {
    const SCREEN_H = Dimensions.get('window').height;

    return (
      <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
        <View style={w.backdrop}>
          <View style={[w.dialog, { maxHeight: SCREEN_H * 0.92 }]}>

            {/* Dialog header */}
            <View style={w.header}>
              <View style={w.headerLeft}>
                <Ionicons name="construct-outline" size={18} color={Colors.accent} />
                <Text style={w.headerTitle}>{isEdit ? 'Edit Project' : 'New Project'}</Text>
                {isEdit && project && <Text style={w.headerSub}>{project.projectNo}</Text>}
              </View>
              <View style={w.headerActions}>
                <TouchableOpacity style={w.cancelBtn} onPress={onClose} disabled={saving}>
                  <Text style={w.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[w.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                  {saving ? <ActivityIndicator size="small" color="#111" /> : (
                    <><Ionicons name="checkmark" size={15} color="#111" /><Text style={w.saveText}>{isEdit ? 'Update Project' : 'Create Project'}</Text></>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView contentContainerStyle={w.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

              {renderErrorBanner(w)}

              {/* Two-column fields */}
              <View style={w.fieldsGrid}>

                {/* LEFT COLUMN */}
                <View style={w.col}>
                  <Text style={w.label}>Project Name <Text style={w.req}>*</Text></Text>
                  <TextInput style={w.inputBox} value={name} onChangeText={setName} placeholder="Enter project name..." placeholderTextColor={Colors.textMuted} />

                  <Text style={w.label}>Description <Text style={w.opt}>(optional)</Text></Text>
                  <TextInput style={w.textArea} value={description} onChangeText={setDescription} placeholder="Add description..." placeholderTextColor={Colors.textMuted} multiline numberOfLines={5} textAlignVertical="top" />

                  <Text style={w.label}>Linked Tender <Text style={w.opt}>(optional)</Text></Text>
                  {renderTenderField(w)}
                </View>

                {/* RIGHT COLUMN */}
                <View style={w.col}>
                  <Text style={w.label}>Status</Text>
                  {renderStatusChips(w)}

                  <Text style={w.label}>Budget <Text style={w.opt}>(optional)</Text></Text>
                  <View style={w.inputRow}>
                    <Text style={w.rupeePrefix}>₹</Text>
                    <TextInput style={[w.input, { flex: 1 }]} value={budget} onChangeText={setBudget} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={Colors.textMuted} />
                  </View>

                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={w.label}>Start Date <Text style={w.opt}>(optional)</Text></Text>
                      <View style={w.inputRow}>
                        <Ionicons name="calendar-outline" size={13} color={Colors.textMuted} />
                        <TextInput style={[w.input, { flex: 1 }]} value={startDate} onChangeText={t => setStartDate(autoDate(t))} placeholder="DD/MM/YYYY" placeholderTextColor={Colors.textMuted} keyboardType="numeric" maxLength={10} />
                      </View>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={w.label}>End Date <Text style={w.opt}>(optional)</Text></Text>
                      <View style={w.inputRow}>
                        <Ionicons name="calendar-outline" size={13} color={Colors.textMuted} />
                        <TextInput style={[w.input, { flex: 1 }]} value={endDate} onChangeText={t => setEndDate(autoDate(t))} placeholder="DD/MM/YYYY" placeholderTextColor={Colors.textMuted} keyboardType="numeric" maxLength={10} />
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            </ScrollView>
          </View>

          {pickers}
        </View>
      </Modal>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  MOBILE LAYOUT
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.header}>
          <Text style={s.title}>{isEdit ? 'Edit Project' : 'New Project'}</Text>
          <TouchableOpacity onPress={onClose} style={s.closeBtn}>
            <Ionicons name="close" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1, backgroundColor: Colors.background }} contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">

          {/* Name */}
          <Text style={s.label}>Project Name <Text style={s.req}>*</Text></Text>
          <TextInput style={s.inputBox} value={name} onChangeText={setName} placeholder="Enter project name..." placeholderTextColor={Colors.textMuted} />

          {/* Status */}
          <Text style={s.label}>Status</Text>
          {renderStatusChips(s)}

          {/* Budget */}
          <Text style={s.label}>Budget <Text style={s.opt}>(optional)</Text></Text>
          <View style={s.inputRow}>
            <Text style={s.rupeePrefix}>₹</Text>
            <TextInput style={[s.input, { flex: 1 }]} value={budget} onChangeText={setBudget} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={Colors.textMuted} />
          </View>

          {/* Dates */}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Start Date <Text style={s.opt}>(opt)</Text></Text>
              <View style={s.inputRow}>
                <Ionicons name="calendar-outline" size={14} color={Colors.textMuted} />
                <TextInput style={[s.input, { flex: 1 }]} value={startDate} onChangeText={t => setStartDate(autoDate(t))} placeholder="DD/MM/YYYY" placeholderTextColor={Colors.textMuted} keyboardType="numeric" maxLength={10} />
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>End Date <Text style={s.opt}>(opt)</Text></Text>
              <View style={s.inputRow}>
                <Ionicons name="calendar-outline" size={14} color={Colors.textMuted} />
                <TextInput style={[s.input, { flex: 1 }]} value={endDate} onChangeText={t => setEndDate(autoDate(t))} placeholder="DD/MM/YYYY" placeholderTextColor={Colors.textMuted} keyboardType="numeric" maxLength={10} />
              </View>
            </View>
          </View>

          {/* Tender */}
          <Text style={s.label}>Linked Tender <Text style={s.opt}>(optional)</Text></Text>
          {renderTenderField(s)}

          {/* Description */}
          <Text style={s.label}>Description <Text style={s.opt}>(optional)</Text></Text>
          <TextInput style={s.textArea} value={description} onChangeText={setDescription} placeholder="Add description..." placeholderTextColor={Colors.textMuted} multiline numberOfLines={4} textAlignVertical="top" />

          {renderErrorBanner(s)}

          <View style={s.actions}>
            <TouchableOpacity style={s.cancelBtn} onPress={onClose} disabled={saving}>
              <Text style={s.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color="#111" /> : <Text style={s.saveText}>{isEdit ? 'Update Project' : 'Save Project'}</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>

        {pickers}
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Web styles ────────────────────────────────────────────────────────────────
const w = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  dialog:   { width: '100%', maxWidth: 720, backgroundColor: Colors.background, borderRadius: 12, overflow: 'hidden', elevation: 32, ...Platform.select({ web: { boxShadow: '0 12px 32px rgba(0,0,0,0.35)' }, default: { shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.35, shadowRadius: 32 } }) },

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

  fieldsGrid: { flexDirection: 'row', gap: 24 },
  col:        { flex: 1 },
  label:      { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, marginBottom: 5, marginTop: 2 },
  opt:        { fontWeight: '400', color: Colors.textMuted },
  req:        { color: Colors.error },

  inputBox:  { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, color: Colors.textPrimary, marginBottom: 12, ...Platform.select({ web: { outlineStyle: 'none' } }) },
  inputRow:  { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 6, paddingHorizontal: 10, marginBottom: 12 },
  input:     { fontSize: 14, color: Colors.textPrimary, paddingVertical: 9, ...Platform.select({ web: { outlineStyle: 'none' } }) },
  rupeePrefix: { fontSize: 13, color: Colors.textMuted, fontWeight: '600', flexShrink: 0 },

  pickerField:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 },
  pickerValue:      { fontSize: 14, color: Colors.textPrimary, flex: 1 },
  pickerPlaceholder:{ fontSize: 14, color: Colors.textMuted, flex: 1 },

  chip:          { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  chipActive:    { backgroundColor: Colors.accent, borderColor: Colors.accent },
  chipText:      { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  chipTextActive:{ color: '#111' },

  textArea: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10, minHeight: 110, fontSize: 14, color: Colors.textPrimary, marginBottom: 12, ...Platform.select({ web: { outlineStyle: 'none' } }) },
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

  inputBox:  { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, color: Colors.textPrimary, marginBottom: 14, ...Platform.select({ web: { outlineStyle: 'none' } }) },
  inputRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: 12, marginBottom: 14 },
  input:     { fontSize: 15, color: Colors.textPrimary, paddingVertical: 11 },
  rupeePrefix: { fontSize: 13, color: Colors.textMuted, fontWeight: '600', flexShrink: 0 },

  pickerField:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 13, marginBottom: 14 },
  pickerValue:      { fontSize: 15, color: Colors.textPrimary, flex: 1 },
  pickerPlaceholder:{ fontSize: 15, color: Colors.textMuted, flex: 1 },

  chip:          { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  chipActive:    { backgroundColor: Colors.accent, borderColor: Colors.accent },
  chipText:      { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  chipTextActive:{ color: '#111' },

  textArea: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, minHeight: 90, fontSize: 14, color: Colors.textPrimary, marginBottom: 16, ...Platform.select({ web: { outlineStyle: 'none' } }) },

  actions:    { flexDirection: 'row', gap: 12 },
  cancelBtn:  { flex: 1, paddingVertical: 14, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  cancelText: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
  saveBtn:    { flex: 2, paddingVertical: 14, borderRadius: 8, backgroundColor: Colors.accent, alignItems: 'center' },
  saveText:   { fontSize: 15, fontWeight: '700', color: '#111' },
});
