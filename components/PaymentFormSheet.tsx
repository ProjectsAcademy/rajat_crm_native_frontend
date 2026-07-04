import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Modal,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ordersApi, OrderPayment } from '../services/api';
import { Colors } from '../constants/colors';

interface Props {
  visible: boolean;
  orderId: number;
  payment?: OrderPayment | null;  // null/undefined = add mode, set = edit mode
  onClose: () => void;
  onSaved: () => void;
}

const MODES = [
  { key: 'cash',  label: 'Cash',  icon: 'cash-outline'              },
  { key: 'upi',   label: 'UPI',   icon: 'phone-portrait-outline'    },
  { key: 'neft',  label: 'NEFT',  icon: 'swap-horizontal-outline'   },
  { key: 'check', label: 'Check', icon: 'document-outline'          },
  { key: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline'},
];

function today(): string {
  const d = new Date();
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}
function isoToDisplay(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
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

export default function PaymentFormSheet({ visible, orderId, payment, onClose, onSaved }: Props) {
  const isEdit = !!payment;

  const [amount, setAmount] = useState('');
  const [mode,   setMode]   = useState('cash');
  const [date,   setDate]   = useState('');
  const [refNo,  setRefNo]  = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (payment) {
      setAmount(parseFloat(payment.amount).toString());
      setMode(payment.paymentMode);
      setDate(isoToDisplay(payment.paymentDate));
      setRefNo(payment.referenceNo ?? '');
    } else {
      setAmount(''); setMode('cash'); setDate(today()); setRefNo('');
    }
  }, [visible, payment]);

  const handleSave = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Invalid amount', 'Please enter a valid payment amount');
      return;
    }
    const isoDate = displayToIso(date);
    if (!isoDate) { Alert.alert('Invalid date', 'Enter date as DD/MM/YYYY'); return; }

    setSaving(true);
    try {
      const payload = { amount, paymentMode: mode, paymentDate: isoDate, referenceNo: refNo || undefined };
      if (isEdit && payment) {
        await ordersApi.updatePayment(orderId, payment.id, payload);
      } else {
        await ordersApi.addPayment(orderId, payload);
      }
      onSaved();
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error || 'Could not save payment.');
    } finally { setSaving(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.header}>
          <Text style={s.title}>{isEdit ? 'Edit Payment' : 'Add Payment'}</Text>
          <TouchableOpacity onPress={onClose} style={s.closeBtn}>
            <Ionicons name="close" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1, backgroundColor: Colors.background }} contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">

          {/* Amount */}
          <Text style={s.label}>Amount <Text style={s.req}>*</Text></Text>
          <View style={s.inputRow}>
            <Text style={s.rupee}>₹</Text>
            <TextInput
              style={[s.input, { flex: 1 }]} value={amount} onChangeText={setAmount}
              placeholder="0.00" placeholderTextColor={Colors.textMuted}
              keyboardType="decimal-pad" autoFocus
              autoComplete="off" textContentType="none" importantForAutofill="no"
            />
          </View>

          {/* Payment Mode */}
          <Text style={s.label}>Payment Mode</Text>
          <View style={s.modeRow}>
            {MODES.map(m => (
              <TouchableOpacity
                key={m.key}
                style={[s.modeBtn, mode === m.key && s.modeBtnActive]}
                onPress={() => setMode(m.key)}
              >
                <Ionicons name={m.icon as any} size={18} color={mode === m.key ? '#111' : Colors.textSecondary} />
                <Text style={[s.modeLabel, mode === m.key && s.modeLabelActive]}>{m.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Payment Date */}
          <Text style={s.label}>Payment Date <Text style={s.req}>*</Text></Text>
          <View style={s.inputRow}>
            <Ionicons name="calendar-outline" size={16} color={Colors.textMuted} />
            <TextInput
              style={[s.input, { flex: 1 }]} value={date}
              onChangeText={t => setDate(autoDate(t))}
              placeholder="DD/MM/YYYY" placeholderTextColor={Colors.textMuted}
              keyboardType="numeric" maxLength={10}
              autoComplete="off" textContentType="none" importantForAutofill="no"
            />
          </View>

          {/* Reference No — shown for non-cash */}
          {mode !== 'cash' && (
            <>
              <Text style={s.label}>Reference No <Text style={s.opt}>(optional)</Text></Text>
              <TextInput
                style={s.standaloneInput} value={refNo} onChangeText={setRefNo}
                placeholder="UTR / Cheque No / Transaction ID"
                placeholderTextColor={Colors.textMuted} autoCapitalize="characters"
                autoComplete="off" textContentType="none" importantForAutofill="no"
              />
            </>
          )}

          {/* Actions */}
          <View style={s.actions}>
            <TouchableOpacity style={s.cancelBtn} onPress={onClose} disabled={saving}>
              <Text style={s.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
              {saving
                ? <ActivityIndicator size="small" color="#111" />
                : <Text style={s.saveText}>{isEdit ? 'Update Payment' : 'Save Payment'}</Text>
              }
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 60 : 24, paddingBottom: 14,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  title:   { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  closeBtn:{ padding: 4 },
  body:    { padding: 16, paddingBottom: 48 },
  label:   { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6, marginTop: 4 },
  req:     { color: Colors.error },
  opt:     { fontWeight: '400', color: Colors.textMuted },

  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 8, paddingHorizontal: 12, marginBottom: 14,
  },
  input:         { fontSize: 16, color: Colors.textPrimary, paddingVertical: 13, ...Platform.select({ web: { outlineStyle: 'none' } }) },
  standaloneInput:{
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 13,
    fontSize: 15, color: Colors.textPrimary, marginBottom: 14,
    ...Platform.select({ web: { outlineStyle: 'none' } }),
  },
  rupee: { fontSize: 18, color: Colors.textMuted, fontWeight: '600' },

  modeRow:        { flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' },
  modeBtn:        { flex: 1, minWidth: 56, alignItems: 'center', paddingVertical: 10, gap: 4, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  modeBtnActive:  { backgroundColor: Colors.accent, borderColor: Colors.accent },
  modeLabel:      { fontSize: 11, fontWeight: '600', color: Colors.textSecondary },
  modeLabelActive:{ color: '#111' },

  actions:    { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelBtn:  { flex: 1, paddingVertical: 14, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  cancelText: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
  saveBtn:    { flex: 2, paddingVertical: 14, borderRadius: 8, backgroundColor: Colors.accent, alignItems: 'center' },
  saveText:   { fontSize: 15, fontWeight: '700', color: '#111' },
});
