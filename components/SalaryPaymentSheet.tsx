import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Modal,
  ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView, Dimensions, Alert,
} from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { hrApi, PayrollRow, PayrollPayment } from '../services/api';
import { Colors } from '../constants/colors';
import DatePickerModal from './DatePickerModal';

// Records or edits one salary installment for an employee's month. Multiple
// installments are allowed; the server rejects anything beyond the remaining
// balance. Amount defaults to the remaining balance (create) and stays
// editable for partial payments.

interface Props {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  month: string;                    // YYYY-MM
  row?: PayrollRow | null;
  payment?: PayrollPayment | null;  // set = edit an existing installment
}

const METHODS = [
  { key: 'cash',          label: 'Cash' },
  { key: 'bank_transfer', label: 'Bank Transfer' },
  { key: 'upi',           label: 'UPI' },
  { key: 'cheque',        label: 'Cheque' },
];

function isoToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function isoToDisplay(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
}
function fmtMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}
function fmtMoney(n: number | string): string {
  return `₹${parseFloat(String(n)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

export default function SalaryPaymentSheet({ visible, onClose, onSaved, month, row, payment }: Props) {
  const isWeb = Platform.OS === 'web';
  const isEdit = !!payment;

  const [amount, setAmount] = useState('');
  const [dateIso, setDateIso] = useState(isoToday());
  const [method, setMethod] = useState('bank_transfer');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [showCal, setShowCal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Max this installment may be: remaining balance, plus (when editing) the
  // installment's own current amount, since it's part of paidTotal already.
  const maxAmount = row ? (isEdit && payment ? row.remaining + parseFloat(payment.amount) : row.remaining) : 0;

  useEffect(() => {
    if (!visible || !row) return;
    if (payment) {
      setAmount(String(parseFloat(payment.amount)));
      setDateIso(payment.paymentDate.slice(0, 10));
      setMethod(payment.paymentMethod);
      setReference(payment.referenceNumber ?? '');
      setNotes(payment.notes ?? '');
    } else {
      setAmount(String(row.remaining));
      setDateIso(isoToday());
      setMethod('bank_transfer');
      setReference('');
      setNotes('');
    }
    setSaveError('');
  }, [visible, row, payment]);

  const handleSave = async () => {
    setSaveError('');
    if (!row) return;
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) { setSaveError('Amount must be a number greater than 0.'); return; }
    if (amt > maxAmount + 0.005) {
      setSaveError(`Amount exceeds remaining balance. Maximum: ${fmtMoney(maxAmount)}.`);
      return;
    }

    setSaving(true);
    try {
      if (isEdit && payment) {
        await hrApi.salaryPayments.update(payment.id, {
          amount: amt, paymentDate: dateIso, paymentMethod: method,
          referenceNumber: reference.trim(), notes,
        });
      } else {
        await hrApi.salaryPayments.create({
          employeeId: row.employee.id,
          paymentMonth: `${month}-01`,
          paymentDate: dateIso,
          amount: amt,
          paymentMethod: method,
          referenceNumber: reference.trim(),
          notes,
        });
      }
      onSaved();
      onClose();
    } catch (e: any) {
      setSaveError(e?.response?.data?.error ?? 'Failed to save payment.');
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    if (!payment) return;
    setSaving(true);
    try {
      await hrApi.salaryPayments.remove(payment.id);
      onSaved();
      onClose();
    } catch (e: any) {
      setSaveError(e?.response?.data?.error ?? 'Failed to delete payment.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    const msg = 'Delete this payment entry? The employee\'s totals will recalculate.';
    if (Platform.OS === 'web') {
      if (window.confirm(msg)) doDelete();
    } else {
      Alert.alert('Delete Payment', msg, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  const breakdown = (st: any) => row && (
    <View style={st.breakdown}>
      <View style={st.bRow}>
        <Text style={st.bLabel}>Payable days (P + ½H)</Text>
        <Text style={st.bValue}>{row.payableDays} × ₹{parseFloat(row.employee.dailyWage).toLocaleString('en-IN')}</Text>
      </View>
      <View style={st.bRow}>
        <Text style={st.bLabel}>Earned</Text>
        <Text style={st.bValue}>{fmtMoney(row.earned)}</Text>
      </View>
      {row.allowances > 0 && (
        <View style={st.bRow}>
          <Text style={st.bLabel}>Allowances</Text>
          <Text style={[st.bValue, { color: Colors.success }]}>+{fmtMoney(row.allowances)}</Text>
        </View>
      )}
      {row.deductions > 0 && (
        <View style={st.bRow}>
          <Text style={st.bLabel}>Deductions</Text>
          <Text style={[st.bValue, { color: Colors.error }]}>−{fmtMoney(row.deductions)}</Text>
        </View>
      )}
      <View style={st.bRow}>
        <Text style={st.bLabel}>Net payable</Text>
        <Text style={st.bValue}>{fmtMoney(row.net)}</Text>
      </View>
      {row.paidTotal > 0 && (
        <View style={st.bRow}>
          <Text style={st.bLabel}>Paid so far ({row.payments.length} payment{row.payments.length === 1 ? '' : 's'})</Text>
          <Text style={[st.bValue, { color: Colors.success }]}>{fmtMoney(row.paidTotal)}</Text>
        </View>
      )}
      <View style={[st.bRow, st.bNetRow]}>
        <Text style={st.bNetLabel}>Remaining</Text>
        <Text style={st.bNetValue}>{fmtMoney(row.remaining)}</Text>
      </View>
    </View>
  );

  const formFields = (st: any) => (
    <>
      {!!saveError && (
        <View style={st.errorBanner}>
          <Ionicons name="alert-circle" size={18} color={Colors.error} />
          <Text style={st.errorBannerText}>{saveError}</Text>
        </View>
      )}

      {breakdown(st)}

      <Text style={st.label}>Amount to Pay <Text style={st.req}>*</Text></Text>
      <View style={st.inputRow}>
        <Text style={st.rupeePrefix}>₹</Text>
        <TextInput
          style={[st.input, { flex: 1 }]} value={amount} onChangeText={setAmount}
          keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={Colors.textMuted}
        />
      </View>

      <Text style={st.label}>Payment Date</Text>
      <TouchableOpacity style={st.inputRow} onPress={() => setShowCal(true)} activeOpacity={0.7}>
        <Ionicons name="calendar-outline" size={15} color={Colors.accentDark} />
        <Text style={[st.input, { flex: 1 }]}>{isoToDisplay(dateIso)}</Text>
        <Ionicons name="chevron-down" size={14} color={Colors.textMuted} />
      </TouchableOpacity>

      <Text style={st.label}>Payment Method</Text>
      <View style={st.chipRow}>
        {METHODS.map((m) => {
          const active = method === m.key;
          return (
            <TouchableOpacity
              key={m.key}
              style={[st.chip, active && st.chipActive]}
              onPress={() => setMethod(m.key)}
              activeOpacity={0.7}
            >
              <Text style={[st.chipText, active && st.chipTextActive]}>{m.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={st.label}>Reference No. <Text style={st.opt}>(optional)</Text></Text>
      <TextInput
        style={st.inputBox} value={reference} onChangeText={setReference}
        placeholder="UTR / cheque no..." placeholderTextColor={Colors.textMuted}
        autoComplete="off" textContentType="none" importantForAutofill="no"
      />

      <Text style={st.label}>Notes <Text style={st.opt}>(optional)</Text></Text>
      <TextInput
        style={st.inputBox} value={notes} onChangeText={setNotes}
        placeholder="Add a note..." placeholderTextColor={Colors.textMuted}
        autoComplete="off" textContentType="none" importantForAutofill="no"
      />

      {isEdit && (
        <TouchableOpacity style={st.deleteBtn} onPress={handleDelete} disabled={saving} activeOpacity={0.7}>
          <Ionicons name="trash-outline" size={15} color={Colors.error} />
          <Text style={st.deleteText}>Delete payment entry</Text>
        </TouchableOpacity>
      )}
    </>
  );

  const cal = (
    <DatePickerModal
      visible={showCal}
      title="Payment Date"
      value={dateIso}
      onSelect={(iso) => { if (iso) setDateIso(iso); setShowCal(false); }}
      onClose={() => setShowCal(false)}
    />
  );

  const title = row ? `${row.employee.name} — ${fmtMonth(month)}` : '';
  const heading = isEdit ? 'Edit Payment' : 'Record Payment';
  const saveLabel = isEdit ? 'Save Changes' : 'Record Payment';

  // ── Web dialog ──────────────────────────────────────────────────────────────
  if (isWeb) {
    const SCREEN_H = Dimensions.get('window').height;
    return (
      <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
        <View style={w.backdrop}>
          <View style={[w.dialog, { maxHeight: SCREEN_H * 0.92 }]}>
            <View style={w.header}>
              <View style={w.headerLeft}>
                <Ionicons name="wallet-outline" size={18} color={Colors.accent} />
                <Text style={w.headerTitle}>{heading}</Text>
                <Text style={w.headerSub}>{title}</Text>
              </View>
              <View style={w.headerActions}>
                <TouchableOpacity style={w.cancelBtn} onPress={onClose} disabled={saving}>
                  <Text style={w.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[w.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                  {saving ? <ActivityIndicator size="small" color="#111" /> : (
                    <><Ionicons name="checkmark" size={15} color="#111" /><Text style={w.saveText}>{saveLabel}</Text></>
                  )}
                </TouchableOpacity>
              </View>
            </View>
            <ScrollView contentContainerStyle={w.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {formFields(w)}
            </ScrollView>
          </View>
          {cal}
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
            <Text style={s.title}>{heading}</Text>
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
              {saving ? <ActivityIndicator size="small" color="#111" /> : <Text style={s.saveText}>{saveLabel}</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
        {cal}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const breakdownStyles = {
  breakdown: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6, marginBottom: 14 },
  bRow:      { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, paddingVertical: 7 },
  bLabel:    { fontSize: 12, color: Colors.textSecondary },
  bValue:    { fontSize: 13, fontWeight: '600' as const, color: Colors.textPrimary },
  bNetRow:   { borderTopWidth: 1, borderTopColor: Colors.border },
  bNetLabel: { fontSize: 13, fontWeight: '700' as const, color: Colors.textPrimary },
  bNetValue: { fontSize: 16, fontWeight: '800' as const, color: Colors.accentDark },
};

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

  ...breakdownStyles,

  label: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, marginBottom: 5, marginTop: 2 },
  opt:   { fontWeight: '400', color: Colors.textMuted },
  req:   { color: Colors.error },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip:           { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  chipActive:     { backgroundColor: Colors.accent, borderColor: Colors.accent },
  chipText:       { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  chipTextActive: { color: '#111' },

  inputBox: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, color: Colors.textPrimary, marginBottom: 12, ...Platform.select({ web: { outlineStyle: 'none' } }) },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 6, paddingHorizontal: 10, marginBottom: 12 },
  input:    { fontSize: 14, color: Colors.textPrimary, paddingVertical: 9, ...Platform.select({ web: { outlineStyle: 'none' } }) },
  rupeePrefix: { fontSize: 13, color: Colors.textMuted, fontWeight: '600', flexShrink: 0 },

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

  errorBanner:     { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.errorLight, borderWidth: 1, borderColor: Colors.error + '40', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 },
  errorBannerText: { flex: 1, fontSize: 13, color: Colors.error, fontWeight: '600' },

  ...breakdownStyles,

  label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6, marginTop: 4 },
  opt:   { fontSize: 12, fontWeight: '400', color: Colors.textMuted },
  req:   { color: Colors.error },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chip:           { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  chipActive:     { backgroundColor: Colors.accent, borderColor: Colors.accent },
  chipText:       { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  chipTextActive: { color: '#111' },

  inputBox: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, color: Colors.textPrimary, marginBottom: 14, ...Platform.select({ web: { outlineStyle: 'none' } }) },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: 12, marginBottom: 14 },
  input:    { fontSize: 15, color: Colors.textPrimary, paddingVertical: 11 },
  rupeePrefix: { fontSize: 13, color: Colors.textMuted, fontWeight: '600', flexShrink: 0 },

  deleteBtn:  { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: Colors.error + '40', backgroundColor: Colors.errorLight, marginTop: 4 },
  deleteText: { fontSize: 13, fontWeight: '700', color: Colors.error },

  actions:    { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelBtn:  { flex: 1, paddingVertical: 14, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  cancelText: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
  saveBtn:    { flex: 2, paddingVertical: 14, borderRadius: 8, backgroundColor: Colors.accent, alignItems: 'center' },
  saveText:   { fontSize: 15, fontWeight: '700', color: '#111' },
});
