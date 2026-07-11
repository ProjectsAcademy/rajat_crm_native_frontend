import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Modal,
  ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView, Dimensions, Alert, Switch,
} from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { hrApi, employeesApi, SalaryComponent } from '../services/api';
import { Colors } from '../constants/colors';
import SearchPickerModal, { PickerItem } from './SearchPickerModal';
import DatePickerModal from './DatePickerModal';

// Create/edit a salary component (monthly allowance or deduction) for an
// employee. Amounts apply to every month the component is effective in.

interface Props {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  component?: SalaryComponent | null;
}

const TYPES = [
  { key: 'allowance', label: 'Allowance', color: Colors.success, bg: Colors.successLight },
  { key: 'deduction', label: 'Deduction', color: Colors.error,   bg: Colors.errorLight },
];

// ── Date helpers (DD/MM/YYYY display <-> YYYY-MM-DD ISO) ─────────────────────
function today(): string {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}
function isoToDisplay(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
}
function displayToIso(disp: string): string | null {
  const m = disp.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const day = parseInt(dd), mon = parseInt(mm);
  if (mon < 1 || mon > 12 || day < 1 || day > 31) return null;
  return `${yyyy}-${mm}-${dd}`;
}
function autoDate(t: string): string {
  const digits = t.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export default function SalaryComponentFormSheet({ visible, onClose, onSaved, component }: Props) {
  const isEdit = !!component;
  const isWeb = Platform.OS === 'web';

  const [employeeId, setEmployeeId] = useState<number | null>(null);
  const [employeeLabel, setEmployeeLabel] = useState('');
  const [type, setType] = useState('allowance');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState(today());
  const [effectiveTo, setEffectiveTo] = useState('');
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(true);

  const [showPicker, setShowPicker] = useState(false);
  const [showFromCal, setShowFromCal] = useState(false);
  const [showToCal, setShowToCal] = useState(false);
  const [employees, setEmployees] = useState<PickerItem[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (!visible) return;
    if (component) {
      setEmployeeId(component.employee.id);
      setEmployeeLabel(`${component.employee.employeeCode} · ${component.employee.name}`);
      setType(component.componentType === 'deduction' ? 'deduction' : 'allowance');
      setName(component.name);
      setAmount(parseFloat(component.amount).toString());
      setEffectiveFrom(isoToDisplay(component.effectiveFrom));
      setEffectiveTo(component.effectiveTo ? isoToDisplay(component.effectiveTo) : '');
      setNotes(component.notes ?? '');
      setIsActive(component.isActive);
    } else {
      setEmployeeId(null); setEmployeeLabel('');
      setType('allowance'); setName(''); setAmount('');
      setEffectiveFrom(today()); setEffectiveTo('');
      setNotes(''); setIsActive(true);
    }
    setSaveError('');
  }, [visible, component]);

  const openPicker = async () => {
    setShowPicker(true);
    if (employees.length > 0) return;
    setLoadingEmployees(true);
    try {
      const { data } = await employeesApi.list({ limit: 500 });
      setEmployees(data.employees.map((e: any) => ({ id: e.id, label: e.name, sub: e.employeeCode })));
    } catch { /* picker shows empty */ }
    finally { setLoadingEmployees(false); }
  };

  const handleSave = async () => {
    setSaveError('');
    if (!employeeId) { setSaveError('Select an employee.'); return; }
    if (!name.trim()) { setSaveError('Component name is required.'); return; }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) { setSaveError('Amount must be a number greater than 0.'); return; }
    const isoFrom = displayToIso(effectiveFrom);
    if (!isoFrom) { setSaveError('Enter effective-from date as DD/MM/YYYY.'); return; }
    let isoTo: string | null = null;
    if (effectiveTo.trim() !== '') {
      isoTo = displayToIso(effectiveTo);
      if (!isoTo) { setSaveError('Enter effective-to date as DD/MM/YYYY (or leave blank).'); return; }
      if (isoTo < isoFrom) { setSaveError('Effective-to cannot be before effective-from.'); return; }
    }

    setSaving(true);
    try {
      if (isEdit && component) {
        await hrApi.salaryComponents.update(component.id, {
          componentType: type, name: name.trim(), amount: amt,
          effectiveFrom: isoFrom, effectiveTo: isoTo, notes, isActive,
        });
      } else {
        await hrApi.salaryComponents.create({
          employeeId, componentType: type, name: name.trim(), amount: amt,
          effectiveFrom: isoFrom, effectiveTo: isoTo, notes,
        });
      }
      onSaved();
      onClose();
    } catch (e: any) {
      setSaveError(e?.response?.data?.error ?? 'Failed to save component.');
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    if (!component) return;
    setSaving(true);
    try {
      await hrApi.salaryComponents.remove(component.id);
      onSaved();
      onClose();
    } catch (e: any) {
      setSaveError(e?.response?.data?.error ?? 'Failed to delete.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    const msg = 'Delete this salary component? Future payroll will no longer include it.';
    if (Platform.OS === 'web') {
      if (window.confirm(msg)) doDelete();
    } else {
      Alert.alert('Delete Component', msg, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  const picker = (
    <>
      <SearchPickerModal
        visible={showPicker}
        title="Select Employee"
        items={employees}
        loading={loadingEmployees}
        onSelect={(item) => {
          if (item) { setEmployeeId(item.id); setEmployeeLabel(`${item.sub} · ${item.label}`); }
          setShowPicker(false);
        }}
      />
      <DatePickerModal
        visible={showFromCal}
        title="Effective From"
        value={displayToIso(effectiveFrom)}
        onSelect={(iso) => { if (iso) setEffectiveFrom(isoToDisplay(iso)); setShowFromCal(false); }}
        onClose={() => setShowFromCal(false)}
      />
      <DatePickerModal
        visible={showToCal}
        title="Effective To"
        value={displayToIso(effectiveTo)}
        allowClear
        onSelect={(iso) => { setEffectiveTo(iso ? isoToDisplay(iso) : ''); setShowToCal(false); }}
        onClose={() => setShowToCal(false)}
      />
    </>
  );

  const formFields = (st: any) => (
    <>
      {!!saveError && (
        <View style={st.errorBanner}>
          <Ionicons name="alert-circle" size={18} color={Colors.error} />
          <Text style={st.errorBannerText}>{saveError}</Text>
        </View>
      )}

      <Text style={st.label}>Employee <Text style={st.req}>*</Text></Text>
      <TouchableOpacity
        style={[st.pickerField, isEdit && { opacity: 0.6 }]}
        onPress={openPicker}
        disabled={isEdit}
        activeOpacity={0.7}
      >
        <Text style={employeeLabel ? st.pickerValue : st.pickerPlaceholder}>
          {employeeLabel || 'Select employee...'}
        </Text>
        <Ionicons name="chevron-down" size={16} color={Colors.textMuted} />
      </TouchableOpacity>

      <Text style={st.label}>Type</Text>
      <View style={st.chipRow}>
        {TYPES.map((t) => {
          const active = type === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              style={[st.chip, active && { backgroundColor: t.bg, borderColor: t.color }]}
              onPress={() => setType(t.key)}
              activeOpacity={0.7}
            >
              <Text style={[st.chipText, active && { color: t.color }]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={st.label}>Name <Text style={st.req}>*</Text></Text>
      <TextInput
        style={st.inputBox} value={name} onChangeText={setName}
        placeholder="e.g. Travel allowance, Advance recovery"
        placeholderTextColor={Colors.textMuted}
        autoComplete="off" textContentType="none" importantForAutofill="no"
      />

      <Text style={st.label}>Monthly Amount <Text style={st.req}>*</Text></Text>
      <View style={st.inputRow}>
        <Text style={st.rupeePrefix}>₹</Text>
        <TextInput
          style={[st.input, { flex: 1 }]} value={amount} onChangeText={setAmount}
          keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={Colors.textMuted}
        />
      </View>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={st.label}>Effective From <Text style={st.req}>*</Text></Text>
          <View style={st.inputRow}>
            <TouchableOpacity onPress={() => setShowFromCal(true)} hitSlop={8}>
              <Ionicons name="calendar-outline" size={15} color={Colors.accentDark} />
            </TouchableOpacity>
            <TextInput
              style={[st.input, { flex: 1 }]} value={effectiveFrom}
              onChangeText={(t) => setEffectiveFrom(autoDate(t))}
              placeholder="DD/MM/YYYY" placeholderTextColor={Colors.textMuted}
              keyboardType="numeric" maxLength={10}
            />
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={st.label}>Effective To <Text style={st.opt}>(optional)</Text></Text>
          <View style={st.inputRow}>
            <TouchableOpacity onPress={() => setShowToCal(true)} hitSlop={8}>
              <Ionicons name="calendar-outline" size={15} color={Colors.accentDark} />
            </TouchableOpacity>
            <TextInput
              style={[st.input, { flex: 1 }]} value={effectiveTo}
              onChangeText={(t) => setEffectiveTo(autoDate(t))}
              placeholder="No end date" placeholderTextColor={Colors.textMuted}
              keyboardType="numeric" maxLength={10}
            />
          </View>
        </View>
      </View>

      <Text style={st.label}>Notes <Text style={st.opt}>(optional)</Text></Text>
      <TextInput
        style={st.inputBox} value={notes} onChangeText={setNotes}
        placeholder="Add a note..." placeholderTextColor={Colors.textMuted}
        autoComplete="off" textContentType="none" importantForAutofill="no"
      />

      {isEdit && (
        <>
          <View style={st.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={st.label}>Active</Text>
              <Text style={st.hint}>Inactive components are excluded from payroll.</Text>
            </View>
            <Switch
              value={isActive}
              onValueChange={setIsActive}
              trackColor={{ true: Colors.accent, false: Colors.border }}
              thumbColor="#fff"
            />
          </View>
          <TouchableOpacity style={st.deleteBtn} onPress={handleDelete} disabled={saving} activeOpacity={0.7}>
            <Ionicons name="trash-outline" size={15} color={Colors.error} />
            <Text style={st.deleteText}>Delete component</Text>
          </TouchableOpacity>
        </>
      )}
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
                <Ionicons name="cash-outline" size={18} color={Colors.accent} />
                <Text style={w.headerTitle}>{isEdit ? 'Edit Component' : 'New Component'}</Text>
                {isEdit && component && <Text style={w.headerSub}>{component.employee.name}</Text>}
              </View>
              <View style={w.headerActions}>
                <TouchableOpacity style={w.cancelBtn} onPress={onClose} disabled={saving}>
                  <Text style={w.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[w.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                  {saving ? <ActivityIndicator size="small" color="#111" /> : (
                    <><Ionicons name="checkmark" size={15} color="#111" /><Text style={w.saveText}>{isEdit ? 'Update' : 'Create'}</Text></>
                  )}
                </TouchableOpacity>
              </View>
            </View>
            <ScrollView contentContainerStyle={w.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {formFields(w)}
            </ScrollView>
          </View>
          {picker}
        </View>
      </Modal>
    );
  }

  // ── Mobile ──────────────────────────────────────────────────────────────────
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.header}>
          <Text style={s.title}>{isEdit ? 'Edit Component' : 'New Component'}</Text>
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
              {saving ? <ActivityIndicator size="small" color="#111" /> : <Text style={s.saveText}>{isEdit ? 'Update' : 'Save'}</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
        {picker}
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Web styles ────────────────────────────────────────────────────────────────
const w = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  dialog:   { width: '100%', maxWidth: 520, backgroundColor: Colors.background, borderRadius: 12, overflow: 'hidden', elevation: 32, ...Platform.select({ web: { boxShadow: '0 12px 32px rgba(0,0,0,0.35)' }, default: { shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.35, shadowRadius: 32 } }) },

  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, backgroundColor: Colors.primary, borderBottomWidth: 1, borderBottomColor: Colors.primaryLight },
  headerLeft:    { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, flexWrap: 'wrap' },
  headerTitle:   { fontSize: 16, fontWeight: '700', color: '#fff' },
  headerSub:     { fontSize: 11, color: Colors.accent, fontWeight: '600' },
  headerActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  cancelBtn:     { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  cancelText:    { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.85)' },
  saveBtn:       { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 16, paddingVertical: 7, borderRadius: 6, backgroundColor: Colors.accent },
  saveText:      { fontSize: 13, fontWeight: '700', color: '#111' },

  body: { padding: 20 },

  errorBanner:     { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.errorLight, borderWidth: 1, borderColor: Colors.error + '40', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 14 },
  errorBannerText: { flex: 1, fontSize: 13, color: Colors.error, fontWeight: '600' },

  label: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, marginBottom: 5, marginTop: 2 },
  opt:   { fontWeight: '400', color: Colors.textMuted },
  req:   { color: Colors.error },
  hint:  { fontSize: 11, color: Colors.textMuted, marginTop: 1 },

  pickerField:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 },
  pickerValue:      { fontSize: 14, color: Colors.textPrimary, flex: 1 },
  pickerPlaceholder:{ fontSize: 14, color: Colors.textMuted, flex: 1 },

  chipRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  chip:     { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  chipText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },

  inputBox: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, color: Colors.textPrimary, marginBottom: 12, ...Platform.select({ web: { outlineStyle: 'none' } }) },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 6, paddingHorizontal: 10, marginBottom: 12 },
  input:    { fontSize: 14, color: Colors.textPrimary, paddingVertical: 9, ...Platform.select({ web: { outlineStyle: 'none' } }) },
  rupeePrefix: { fontSize: 13, color: Colors.textMuted, fontWeight: '600', flexShrink: 0 },

  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 },

  deleteBtn:  { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, borderWidth: 1, borderColor: Colors.error + '40', backgroundColor: Colors.errorLight, marginTop: 4 },
  deleteText: { fontSize: 12, fontWeight: '700', color: Colors.error },
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
  hint:     { fontSize: 11, color: Colors.textMuted, marginTop: 1 },

  errorBanner:     { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.errorLight, borderWidth: 1, borderColor: Colors.error + '40', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 },
  errorBannerText: { flex: 1, fontSize: 13, color: Colors.error, fontWeight: '600' },

  pickerField:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 13, marginBottom: 14 },
  pickerValue:      { fontSize: 15, color: Colors.textPrimary, flex: 1 },
  pickerPlaceholder:{ fontSize: 15, color: Colors.textMuted, flex: 1 },

  chipRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  chip:     { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  chipText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },

  inputBox: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, color: Colors.textPrimary, marginBottom: 14, ...Platform.select({ web: { outlineStyle: 'none' } }) },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: 12, marginBottom: 14 },
  input:    { fontSize: 15, color: Colors.textPrimary, paddingVertical: 11 },
  rupeePrefix: { fontSize: 13, color: Colors.textMuted, fontWeight: '600', flexShrink: 0 },

  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, marginBottom: 14 },

  deleteBtn:  { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: Colors.error + '40', backgroundColor: Colors.errorLight, marginTop: 4 },
  deleteText: { fontSize: 13, fontWeight: '700', color: Colors.error },

  actions:    { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelBtn:  { flex: 1, paddingVertical: 14, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  cancelText: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
  saveBtn:    { flex: 2, paddingVertical: 14, borderRadius: 8, backgroundColor: Colors.accent, alignItems: 'center' },
  saveText:   { fontSize: 15, fontWeight: '700', color: '#111' },
});
