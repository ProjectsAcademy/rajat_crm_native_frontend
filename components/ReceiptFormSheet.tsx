import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ledgerApi, LedgerDueOrder } from '../services/api';
import { Colors } from '../constants/colors';
import LedgerSheetFrame from './LedgerSheetFrame';
import DatePickerModal from './DatePickerModal';
import { PAYMENT_MODES, fmtDay, fmtMoney, todayIso } from '../utils/ledgerFormat';
import { notify } from '../utils/dialogs';

// "Receive Payment" — one lump sum from a customer, spread over their unpaid
// orders. By default it fills oldest orders first (FIFO); editing any row
// switches to manual amounts. Whatever isn't adjusted stays as advance.
// The server re-validates every amount against the orders' live dues.

interface Props {
  visible: boolean;
  customerId: number;
  customerName: string;
  onClose: () => void;
  onSaved: () => void;
}

const toPaise = (s: string) => {
  const n = parseFloat(s);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0;
};
const paiseToInput = (p: number) => (p > 0 ? String(p / 100) : '');

export default function ReceiptFormSheet({ visible, customerId, customerName, onClose, onSaved }: Props) {
  const [amount, setAmount]   = useState('');
  const [date, setDate]       = useState(todayIso());
  const [mode, setMode]       = useState('cash');
  const [refNo, setRefNo]     = useState('');
  const [notes, setNotes]     = useState('');
  const [dueOrders, setDueOrders] = useState<LedgerDueOrder[]>([]);
  const [loadingDue, setLoadingDue] = useState(false);
  const [dueError, setDueError]     = useState('');
  const [manual, setManual]   = useState(false);
  const [allocs, setAllocs]   = useState<Record<number, string>>({});
  const [showDate, setShowDate] = useState(false);
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    if (!visible) return;
    setAmount(''); setDate(todayIso()); setMode('cash'); setRefNo(''); setNotes('');
    setManual(false); setAllocs({}); setDueError('');
    setLoadingDue(true);
    ledgerApi.dueOrders(customerId)
      .then(({ data }) => setDueOrders(data.orders))
      .catch(() => { setDueOrders([]); setDueError('Could not load pending orders.'); })
      .finally(() => setLoadingDue(false));
  }, [visible, customerId]);

  // Auto mode: oldest orders first, until the amount runs out.
  useEffect(() => {
    if (manual) return;
    let left = toPaise(amount);
    const next: Record<number, string> = {};
    for (const o of dueOrders) {
      const take = Math.min(left, Math.round(o.due * 100));
      next[o.id] = paiseToInput(take);
      left -= take;
    }
    setAllocs(next);
  }, [amount, dueOrders, manual]);

  const received = toPaise(amount);
  const adjusted = useMemo(() => Object.values(allocs).reduce((s, v) => s + toPaise(v), 0), [allocs]);
  const advance = received - adjusted;
  const overDue = dueOrders.filter((o) => toPaise(allocs[o.id] ?? '') > Math.round(o.due * 100));

  const handleSave = async () => {
    if (received <= 0) { notify('Invalid amount', 'Enter the amount received.'); return; }
    if (overDue.length) { notify('Check amounts', `${overDue[0].orderNo}: adjusted amount is more than its due.`); return; }
    if (advance < 0) { notify('Check amounts', 'Adjusted total is more than the amount received.'); return; }

    setSaving(true);
    try {
      const allocations = dueOrders
        .map((o) => ({ orderId: o.id, amount: toPaise(allocs[o.id] ?? '') / 100 }))
        .filter((a) => a.amount > 0);
      const { data } = await ledgerApi.createReceipt(customerId, {
        receiptDate: date, amount: received / 100, paymentMode: mode,
        referenceNo: refNo.trim() || undefined, notes: notes.trim() || undefined,
        allocations,
      });
      const lines = data.allocations.map((a) => `${a.orderNo}: ${fmtMoney(a.amount)}`);
      if (data.advance > 0) lines.push(`Advance: ${fmtMoney(data.advance)}`);
      notify(`Receipt ${data.receipt.receiptNo} saved`, lines.join('\n') || 'Kept fully as advance.');
      onSaved();
      onClose();
    } catch (e: any) {
      notify('Could not save', e?.response?.data?.error || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <LedgerSheetFrame
      visible={visible}
      title="Receive Payment"
      subtitle={customerName}
      icon="wallet-outline"
      saving={saving}
      saveLabel="Save Receipt"
      onSave={handleSave}
      onClose={onClose}
    >
      <Text style={st.label}>Amount Received <Text style={st.req}>*</Text></Text>
      <View style={st.inputRow}>
        <Text style={st.rupee}>₹</Text>
        <TextInput
          style={[st.input, { flex: 1 }]} value={amount} onChangeText={setAmount}
          placeholder="0.00" placeholderTextColor={Colors.textMuted} keyboardType="decimal-pad"
          autoComplete="off" textContentType="none" importantForAutofill="no"
        />
      </View>

      <View style={st.twoCol}>
        <View style={{ flex: 1 }}>
          <Text style={st.label}>Date <Text style={st.req}>*</Text></Text>
          <TouchableOpacity style={st.inputRow} onPress={() => setShowDate(true)} activeOpacity={0.7}>
            <Ionicons name="calendar-outline" size={16} color={Colors.textMuted} />
            <Text style={st.dateText}>{fmtDay(date)}</Text>
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={st.label}>Reference No <Text style={st.opt}>(optional)</Text></Text>
          <TextInput
            style={st.plainInput} value={refNo} onChangeText={setRefNo}
            placeholder={mode === 'cash' ? 'Slip / voucher no.' : 'UTR / Cheque no.'} placeholderTextColor={Colors.textMuted}
            autoCapitalize="characters" autoComplete="off" textContentType="none" importantForAutofill="no"
          />
        </View>
      </View>

      <Text style={st.label}>Payment Mode</Text>
      <View style={st.modeRow}>
        {PAYMENT_MODES.map((m) => (
          <TouchableOpacity key={m.key} style={[st.modeBtn, mode === m.key && st.modeBtnActive]} onPress={() => setMode(m.key)}>
            <Ionicons name={m.icon as any} size={17} color={mode === m.key ? '#111' : Colors.textSecondary} />
            <Text style={[st.modeLabel, mode === m.key && st.modeLabelActive]}>{m.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={st.label}>Notes <Text style={st.opt}>(optional)</Text></Text>
      <TextInput
        style={st.plainInput} value={notes} onChangeText={setNotes}
        placeholder="e.g. Paid by Mr. Sharma at site" placeholderTextColor={Colors.textMuted}
        autoComplete="off" textContentType="none" importantForAutofill="no"
      />

      {/* Allocation */}
      <View style={st.allocHeader}>
        <Text style={st.sectionTitle}>Adjust Against Orders</Text>
        {manual ? (
          <TouchableOpacity onPress={() => setManual(false)} hitSlop={8}>
            <Text style={st.link}>Auto (oldest first)</Text>
          </TouchableOpacity>
        ) : (
          <Text style={st.autoTag}>Auto · oldest first</Text>
        )}
      </View>

      {loadingDue ? (
        <ActivityIndicator color={Colors.accent} style={{ marginVertical: 16 }} />
      ) : dueError ? (
        <Text style={st.errorText}>{dueError}</Text>
      ) : dueOrders.length === 0 ? (
        <View style={st.emptyBox}>
          <Ionicons name="checkmark-done-outline" size={18} color={Colors.success} />
          <Text style={st.emptyText}>No unpaid orders — the full amount will be kept as advance.</Text>
        </View>
      ) : (
        <View style={st.card}>
          {dueOrders.map((o, i) => {
            const bad = toPaise(allocs[o.id] ?? '') > Math.round(o.due * 100);
            return (
              <View key={o.id} style={[st.orderRow, i > 0 && st.rowBorder]}>
                <View style={{ flex: 1 }}>
                  <Text style={st.orderNo}>{o.orderNo}</Text>
                  <Text style={st.orderMeta} numberOfLines={1}>
                    {fmtDay(o.orderDate)}{o.project ? `  ·  ${o.project}` : ''}
                  </Text>
                  <Text style={st.orderDue}>Due {fmtMoney(o.due)}</Text>
                </View>
                <View style={[st.allocInputBox, bad && { borderColor: Colors.error }]}>
                  <Text style={st.allocRupee}>₹</Text>
                  <TextInput
                    style={st.allocInput} value={allocs[o.id] ?? ''} keyboardType="decimal-pad"
                    placeholder="0" placeholderTextColor={Colors.textMuted}
                    onChangeText={(t) => { setManual(true); setAllocs((p) => ({ ...p, [o.id]: t })); }}
                    autoComplete="off" textContentType="none" importantForAutofill="no"
                  />
                </View>
              </View>
            );
          })}
        </View>
      )}

      <View style={st.summary}>
        <SummaryCell label="Received" value={fmtMoney(received / 100)} />
        <SummaryCell label="Adjusted" value={fmtMoney(adjusted / 100)} />
        <SummaryCell
          label={advance < 0 ? 'Over-adjusted' : 'Advance'}
          value={fmtMoney(Math.abs(advance) / 100)}
          color={advance < 0 ? Colors.error : advance > 0 ? Colors.info : Colors.textPrimary}
        />
      </View>

      <DatePickerModal
        visible={showDate}
        title="Receipt Date"
        value={date}
        onSelect={(iso) => { if (iso) setDate(iso); setShowDate(false); }}
        onClose={() => setShowDate(false)}
      />
    </LedgerSheetFrame>
  );
}

function SummaryCell({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={st.summaryCell}>
      <Text style={st.summaryLabel}>{label}</Text>
      <Text style={[st.summaryValue, color ? { color } : null]}>{value}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  label:   { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6, marginTop: 4 },
  req:     { color: Colors.error },
  opt:     { fontWeight: '400', color: Colors.textMuted },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 8, paddingHorizontal: 12, marginBottom: 14,
  },
  input:     { fontSize: 16, color: Colors.textPrimary, paddingVertical: 12, ...Platform.select({ web: { outlineStyle: 'none' as any } }) },
  rupee:     { fontSize: 18, color: Colors.textMuted, fontWeight: '600' },
  dateText:  { fontSize: 15, color: Colors.textPrimary },
  plainInput: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, color: Colors.textPrimary, marginBottom: 14, minHeight: 48,
    ...Platform.select({ web: { outlineStyle: 'none' as any } }),
  },
  twoCol:  { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },

  modeRow:         { flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' },
  modeBtn:         { flex: 1, minWidth: 58, alignItems: 'center', paddingVertical: 9, gap: 3, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  modeBtnActive:   { backgroundColor: Colors.accent, borderColor: Colors.accent },
  modeLabel:       { fontSize: 11, fontWeight: '600', color: Colors.textSecondary },
  modeLabelActive: { color: '#111' },

  allocHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, marginBottom: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  link:         { fontSize: 12, fontWeight: '700', color: Colors.info },
  autoTag:      { fontSize: 11, fontWeight: '600', color: Colors.textMuted },
  card:         { backgroundColor: Colors.surface, borderRadius: 8, borderWidth: 1, borderColor: Colors.border },
  orderRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  rowBorder:    { borderTopWidth: 1, borderTopColor: Colors.border },
  orderNo:      { fontSize: 13, fontWeight: '700', color: '#1565C0' },
  orderMeta:    { fontSize: 11, color: Colors.textSecondary, marginTop: 1 },
  orderDue:     { fontSize: 12, fontWeight: '700', color: Colors.error, marginTop: 3 },
  allocInputBox: { flexDirection: 'row', alignItems: 'center', width: 120, borderWidth: 1, borderColor: Colors.border, borderRadius: 6, paddingHorizontal: 8, backgroundColor: Colors.background },
  allocRupee:   { fontSize: 13, color: Colors.textMuted },
  allocInput:   { flex: 1, minWidth: 0, textAlign: 'right', fontSize: 14, fontWeight: '600', color: Colors.textPrimary, paddingVertical: 8, paddingLeft: 4, ...Platform.select({ web: { outlineStyle: 'none' as any } }) },
  emptyBox:     { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 8, backgroundColor: Colors.successLight },
  emptyText:    { flex: 1, fontSize: 12, color: Colors.success, fontWeight: '600' },
  errorText:    { fontSize: 12, color: Colors.error, marginVertical: 8 },

  summary:      { flexDirection: 'row', marginTop: 14, backgroundColor: Colors.surface, borderRadius: 8, borderWidth: 1, borderColor: Colors.border },
  summaryCell:  { flex: 1, paddingVertical: 10, alignItems: 'center' },
  summaryLabel: { fontSize: 10, fontWeight: '600', color: Colors.textMuted, marginBottom: 3 },
  summaryValue: { fontSize: 14, fontWeight: '800', color: Colors.textPrimary },
});
