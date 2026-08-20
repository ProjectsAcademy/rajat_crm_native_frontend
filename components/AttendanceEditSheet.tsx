import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Modal,
  ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView, Dimensions, Alert,
} from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { hrApi } from '../services/api';
import { Colors } from '../constants/colors';

// Edits a single attendance record (status / hours / overtime / notes) and
// supports deleting it. Callers pass a minimal shape so both the Records tab
// (full AttendanceRecord) and the calendar (day record) can open it.

export interface EditableAttendance {
  id: number;
  date: string;
  attendanceStatus: string;
  hoursWorked: string;
  overtimeHours: string;
  notes: string;
  employeeName?: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  record?: EditableAttendance | null;
}

export const ATT_STATUSES = [
  { key: 'P', label: 'Present',  color: Colors.success, bg: Colors.successLight },
  { key: 'A', label: 'Absent',   color: Colors.error,   bg: Colors.errorLight },
  { key: 'H', label: 'Half-day', color: '#7A5400',      bg: Colors.warningLight },
  { key: 'L', label: 'Leave',    color: Colors.info,    bg: Colors.infoLight },
];

export const DEFAULT_HOURS: Record<string, string> = { P: '8', H: '4', A: '0', L: '0' };

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function AttendanceEditSheet({ visible, onClose, onSaved, record }: Props) {
  const isWeb = Platform.OS === 'web';

  const [status, setStatus] = useState('P');
  const [hours, setHours] = useState('8');
  const [overtime, setOvertime] = useState('0');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (!visible || !record) return;
    setStatus(record.attendanceStatus);
    setHours(String(parseFloat(record.hoursWorked)));
    setOvertime(String(parseFloat(record.overtimeHours)));
    setNotes(record.notes ?? '');
    setSaveError('');
  }, [visible, record]);

  const pickStatus = (key: string) => {
    setStatus(key);
    setHours(DEFAULT_HOURS[key]);
  };

  const handleSave = async () => {
    setSaveError('');
    const h = parseFloat(hours);
    const o = parseFloat(overtime || '0');
    if (isNaN(h) || h < 0 || h > 24) { setSaveError('Hours must be between 0 and 24.'); return; }
    if (isNaN(o) || o < 0) { setSaveError('Overtime must be 0 or more.'); return; }
    if (!record) return;

    setSaving(true);
    try {
      await hrApi.attendance.update(record.id, {
        attendanceStatus: status, hoursWorked: h, overtimeHours: o, notes,
      });
      onSaved();
      onClose();
    } catch (e: any) {
      setSaveError(e?.response?.data?.error ?? 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    if (!record) return;
    setSaving(true);
    try {
      await hrApi.attendance.remove(record.id);
      onSaved();
      onClose();
    } catch (e: any) {
      setSaveError(e?.response?.data?.error ?? 'Failed to delete.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    const msg = 'Remove this attendance record?';
    if (Platform.OS === 'web') {
      if (window.confirm(msg)) doDelete();
    } else {
      Alert.alert('Delete Record', msg, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  const formFields = (st: any) => (
    <>
      {!!saveError && (
        <View style={st.errorBanner}>
          <Ionicons name="alert-circle" size={18} color={Colors.error} />
          <Text style={st.errorBannerText}>{saveError}</Text>
        </View>
      )}

      <Text style={st.label}>Status</Text>
      <View style={st.chipRow}>
        {ATT_STATUSES.map((s) => {
          const active = status === s.key;
          return (
            <TouchableOpacity
              key={s.key}
              style={[st.chip, active && { backgroundColor: s.bg, borderColor: s.color }]}
              onPress={() => pickStatus(s.key)}
              activeOpacity={0.7}
            >
              <Text style={[st.chipText, active && { color: s.color }]}>{s.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={st.label}>Hours Worked</Text>
          <TextInput
            style={st.inputBox} value={hours} onChangeText={setHours}
            keyboardType="decimal-pad" placeholder="0" placeholderTextColor={Colors.textMuted}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={st.label}>Overtime</Text>
          <TextInput
            style={st.inputBox} value={overtime} onChangeText={setOvertime}
            keyboardType="decimal-pad" placeholder="0" placeholderTextColor={Colors.textMuted}
          />
        </View>
      </View>

      <Text style={st.label}>Notes <Text style={st.opt}>(optional)</Text></Text>
      <TextInput
        style={st.inputBox} value={notes} onChangeText={setNotes}
        placeholder="Add a note..." placeholderTextColor={Colors.textMuted}
        autoComplete="off" textContentType="none" importantForAutofill="no"
      />

      <TouchableOpacity style={st.deleteBtn} onPress={handleDelete} disabled={saving} activeOpacity={0.7}>
        <Ionicons name="trash-outline" size={15} color={Colors.error} />
        <Text style={st.deleteText}>Delete record</Text>
      </TouchableOpacity>
    </>
  );

  const title = record
    ? `${record.employeeName ? record.employeeName + ' — ' : ''}${fmtDate(record.date)}`
    : '';

  // ── Web dialog ──────────────────────────────────────────────────────────────
  if (isWeb) {
    const SCREEN_H = Dimensions.get('window').height;
    return (
      <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
        <View style={w.backdrop}>
          <View style={[w.dialog, { maxHeight: SCREEN_H * 0.92 }]}>
            <View style={w.header}>
              <View style={w.headerLeft}>
                <Ionicons name="calendar-outline" size={18} color={Colors.accent} />
                <Text style={w.headerTitle}>Edit Attendance</Text>
                <Text style={w.headerSub}>{title}</Text>
              </View>
              <View style={w.headerActions}>
                <TouchableOpacity style={w.cancelBtn} onPress={onClose} disabled={saving}>
                  <Text style={w.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[w.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                  {saving ? <ActivityIndicator size="small" color="#111" /> : (
                    <><Ionicons name="checkmark" size={15} color="#111" /><Text style={w.saveText}>Save</Text></>
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
          <View style={{ flex: 1 }}>
            <Text style={s.title}>Edit Attendance</Text>
            {!!title && <Text style={s.titleSub}>{title}</Text>}
          </View>
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
              {saving ? <ActivityIndicator size="small" color="#111" /> : <Text style={s.saveText}>Save</Text>}
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
  dialog:   { width: '100%', maxWidth: 480, backgroundColor: Colors.background, borderRadius: 12, overflow: 'hidden', elevation: 32, ...Platform.select({ web: { boxShadow: '0 12px 32px rgba(0,0,0,0.35)' }, default: { shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.35, shadowRadius: 32 } }) },

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

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip:     { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  chipText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },

  inputBox: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, color: Colors.textPrimary, marginBottom: 12, ...Platform.select({ web: { outlineStyle: 'none' } }) },

  deleteBtn:  { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, borderWidth: 1, borderColor: Colors.error + '40', backgroundColor: Colors.errorLight, marginTop: 4 },
  deleteText: { fontSize: 12, fontWeight: '700', color: Colors.error },
});

// ── Mobile styles ─────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  header:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 60 : 24, paddingBottom: 14, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title:    { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  titleSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  closeBtn: { padding: 4 },
  body:     { padding: 16, paddingBottom: 48 },
  label:    { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6, marginTop: 4 },
  opt:      { fontSize: 12, fontWeight: '400', color: Colors.textMuted },

  errorBanner:     { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.errorLight, borderWidth: 1, borderColor: Colors.error + '40', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 },
  errorBannerText: { flex: 1, fontSize: 13, color: Colors.error, fontWeight: '600' },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chip:     { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  chipText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },

  inputBox: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, color: Colors.textPrimary, marginBottom: 14, ...Platform.select({ web: { outlineStyle: 'none' } }) },

  deleteBtn:  { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: Colors.error + '40', backgroundColor: Colors.errorLight, marginTop: 4 },
  deleteText: { fontSize: 13, fontWeight: '700', color: Colors.error },

  actions:    { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelBtn:  { flex: 1, paddingVertical: 14, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  cancelText: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
  saveBtn:    { flex: 2, paddingVertical: 14, borderRadius: 8, backgroundColor: Colors.accent, alignItems: 'center' },
  saveText:   { fontSize: 15, fontWeight: '700', color: '#111' },
});
