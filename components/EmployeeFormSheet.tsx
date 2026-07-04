import {
  View, Text, TextInput, TouchableOpacity, Modal,
  ScrollView, ActivityIndicator, StyleSheet,
  Platform, KeyboardAvoidingView, Alert, Switch,
} from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { employeesApi, Employee, EmployeePayload } from '../services/api';
import { Colors } from '../constants/colors';

// ─── Skill type options ───────────────────────────────────────────────────────

const SKILL_TYPES = [
  { label: 'Unskilled',   value: 'unskilled' },
  { label: 'Semi-Skilled',value: 'semi_skilled' },
  { label: 'Skilled',     value: 'skilled' },
  { label: 'Supervisor',  value: 'supervisor' },
  { label: 'Electrician', value: 'electrician' },
  { label: 'Helper',      value: 'helper' },
  { label: 'Driver',      value: 'driver' },
  { label: 'Other',       value: 'other' },
];

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  visible: boolean;
  employee?: Employee | null;   // null/undefined = create mode
  onClose: () => void;
  onSaved: (newId?: number) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function numStr(v: string | number | undefined) {
  if (v == null || v === '' || v === '0') return '';
  return String(v);
}

// ─── Field row ───────────────────────────────────────────────────────────────

function Field({
  label, value, onChangeText, placeholder, keyboardType, required, hint,
}: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; keyboardType?: any; required?: boolean; hint?: string;
}) {
  return (
    <View style={s.fieldWrap}>
      <Text style={s.label}>{label}{required ? <Text style={{ color: Colors.error }}> *</Text> : null}</Text>
      <TextInput
        style={s.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder || label}
        placeholderTextColor={Colors.textMuted}
        keyboardType={keyboardType || 'default'}
        autoCorrect={false}
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="none"
        importantForAutofill="no"
      />
      {hint ? <Text style={s.hint}>{hint}</Text> : null}
    </View>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function EmployeeFormSheet({ visible, employee, onClose, onSaved }: Props) {
  const isEdit = !!employee;

  // ── Form state ──
  const [name,        setName]        = useState('');
  const [phone,       setPhone]       = useState('');
  const [email,       setEmail]       = useState('');
  const [address,     setAddress]     = useState('');
  const [aadharNo,    setAadharNo]    = useState('');
  const [pan,         setPan]         = useState('');
  const [skillType,   setSkillType]   = useState('unskilled');
  const [dailyWage,   setDailyWage]   = useState('');
  const [ctc,         setCtc]         = useState('');
  const [basicSalary, setBasicSalary] = useState('');
  const [isActive,    setIsActive]    = useState(true);

  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  // ── Populate on edit ──
  useEffect(() => {
    if (visible && employee) {
      setName(employee.name || '');
      setPhone(employee.phone || '');
      setEmail(employee.email || '');
      setAddress(employee.address || '');
      setAadharNo(employee.aadharNo || '');
      setPan(employee.pan || '');
      setSkillType(employee.skillType || 'unskilled');
      setDailyWage(numStr(employee.dailyWage));
      setCtc(numStr(employee.ctc));
      setBasicSalary(numStr(employee.basicSalary));
      setIsActive(employee.isActive !== false);
    } else if (visible && !employee) {
      // Reset to blank for create
      setName(''); setPhone(''); setEmail(''); setAddress('');
      setAadharNo(''); setPan(''); setSkillType('unskilled');
      setDailyWage(''); setCtc(''); setBasicSalary('');
      setIsActive(true);
    }
    setError('');
  }, [visible, employee]);

  // ── Submit ──
  const handleSave = async () => {
    if (!name.trim()) { setError('Employee name is required.'); return; }
    setSaving(true); setError('');
    try {
      const payload: EmployeePayload = {
        name: name.trim(),
        phone:       phone.trim()    || undefined,
        email:       email.trim()    || undefined,
        address:     address.trim()  || undefined,
        aadharNo:    aadharNo.trim() || undefined,
        pan:         pan.trim()      || undefined,
        skillType,
        dailyWage:   dailyWage   ? parseFloat(dailyWage)   : undefined,
        ctc:         ctc         ? parseFloat(ctc)         : undefined,
        basicSalary: basicSalary ? parseFloat(basicSalary) : undefined,
        isActive,
      };

      if (isEdit) {
        await employeesApi.update(employee!.id, payload);
        onSaved();
      } else {
        const { data } = await employeesApi.create(payload);
        onSaved(data.employee?.id);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Could not save employee. Please try again.';
      setError(msg);
      if (Platform.OS !== 'web') Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  };

  // ── Layout ──
  const inner = (
    <View style={[s.sheet, Platform.OS === 'web' && s.sheetWeb]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={onClose} style={s.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close" size={22} color={Colors.textSecondary} />
        </TouchableOpacity>
        <Text style={s.title}>{isEdit ? 'Edit Employee' : 'Add Employee'}</Text>
        <TouchableOpacity
          style={[s.saveBtn, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator size="small" color="#111" />
            : <Text style={s.saveBtnText}>Save</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={s.body}
        contentContainerStyle={s.bodyContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {error ? (
          <View style={s.errorBox}>
            <Ionicons name="alert-circle-outline" size={14} color={Colors.error} />
            <Text style={s.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Read-only code in edit mode */}
        {isEdit && (
          <View style={s.codeRow}>
            <Ionicons name="person-circle-outline" size={14} color={Colors.textMuted} />
            <Text style={s.codeText}>{employee?.employeeCode}</Text>
          </View>
        )}

        {/* ── Personal ── */}
        <Text style={s.sectionLabel}>Personal</Text>
        <Field label="Full Name"  value={name}  onChangeText={setName}  required />
        <Field label="Phone"      value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Field label="Email"      value={email} onChangeText={setEmail} keyboardType="email-address" />
        <Field label="Address"    value={address} onChangeText={setAddress} />

        {/* ── Professional ── */}
        <Text style={s.sectionLabel}>Professional</Text>

        {/* Skill type chip selector */}
        <View style={s.fieldWrap}>
          <Text style={s.label}>Skill Type</Text>
          <View style={s.chipRow}>
            {SKILL_TYPES.map(st => (
              <TouchableOpacity
                key={st.value}
                style={[s.chip, skillType === st.value && s.chipActive]}
                onPress={() => setSkillType(st.value)}
              >
                <Text style={[s.chipText, skillType === st.value && s.chipTextActive]}>
                  {st.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={s.row}>
          <View style={{ flex: 1 }}>
            <Field label="Daily Wage (₹)" value={dailyWage} onChangeText={setDailyWage} keyboardType="decimal-pad" placeholder="0" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="CTC/Month (₹)" value={ctc} onChangeText={setCtc} keyboardType="decimal-pad" placeholder="0" />
          </View>
        </View>
        <Field label="Basic Salary (₹)" value={basicSalary} onChangeText={setBasicSalary} keyboardType="decimal-pad" placeholder="0" />

        {/* ── Identity ── */}
        <Text style={s.sectionLabel}>Identity Documents</Text>
        <Field label="Aadhar Number" value={aadharNo} onChangeText={setAadharNo} keyboardType="numeric" />
        <Field label="PAN Number"    value={pan}      onChangeText={setPan} />

        {/* ── Status (edit only) ── */}
        {isEdit && (
          <>
            <Text style={s.sectionLabel}>Status</Text>
            <View style={s.switchRow}>
              <Text style={s.switchLabel}>Active Employee</Text>
              <Switch
                value={isActive}
                onValueChange={setIsActive}
                trackColor={{ false: Colors.errorLight, true: Colors.successLight }}
                thumbColor={isActive ? Colors.success : Colors.error}
              />
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );

  if (Platform.OS === 'web') {
    if (!visible) return null;
    return (
      <View style={s.webOverlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
        {inner}
      </View>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {inner}
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  // Web overlay
  webOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 100,
  },
  sheetWeb: {
    width: '100%', maxWidth: 560, borderRadius: 12, maxHeight: '90%',
    ...({ boxShadow: '0 8px 32px rgba(0,0,0,0.25)' } as any),
  },

  // Sheet
  sheet: { flex: 1, backgroundColor: Colors.background },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 14,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  closeBtn: { padding: 4 },
  title: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, flex: 1, textAlign: 'center' },
  saveBtn: {
    backgroundColor: Colors.accent, borderRadius: 6,
    paddingHorizontal: 16, paddingVertical: 7, minWidth: 64, alignItems: 'center',
  },
  saveBtnText: { fontSize: 13, fontWeight: '800', color: '#111' },

  // Body
  body: { flex: 1 },
  bodyContent: { padding: 14, gap: 0 },

  // Error
  errorBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: Colors.errorLight, borderRadius: 6, padding: 10, marginBottom: 12,
    borderWidth: 1, borderColor: Colors.error + '40',
  },
  errorText: { flex: 1, fontSize: 13, color: Colors.error },

  // Code chip
  codeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.accentLight, borderRadius: 6, padding: 8, marginBottom: 12,
    borderWidth: 1, borderColor: Colors.accent + '40',
  },
  codeText: { fontSize: 12, fontWeight: '700', color: Colors.accent },

  // Section label
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.7,
    marginTop: 18, marginBottom: 8,
  },

  // Fields
  fieldWrap: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 5 },
  input: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: Colors.textPrimary,
    ...Platform.select({ web: { outlineStyle: 'none' } }),
  },
  hint: { fontSize: 11, color: Colors.textMuted, marginTop: 3 },

  // Inline row
  row: { flexDirection: 'row', gap: 10 },

  // Chip selector
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border,
  },
  chipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  chipText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  chipTextActive: { color: '#111' },

  // Switch
  switchRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: 8, borderWidth: 1,
    borderColor: Colors.border, paddingHorizontal: 14, paddingVertical: 12,
  },
  switchLabel: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
});
