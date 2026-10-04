import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ledgerApi, LedgerEntryType } from '../services/api';
import { Colors } from '../constants/colors';
import LedgerSheetFrame from './LedgerSheetFrame';
import DatePickerModal from './DatePickerModal';
import { ENTRY_TYPES, fmtDay, todayIso } from '../utils/ledgerFormat';
import { confirmAsync, notify } from '../utils/dialogs';

// Manual ledger lines for one customer:
//  mode 'entry'   → discount / write-off (Cr) or extra charge / refund (Dr);
//                   add, or edit/delete an existing one
//  mode 'opening' → the balance carried in from before the system (Dr/Cr)

export interface EditableEntry { id: number; entryType: LedgerEntryType; date: string; amount: number; notes: string }

interface Props {
  visible: boolean;
  customerId: number;
  customerName: string;
  mode: 'entry' | 'opening';
  entry?: EditableEntry | null;                                // entry mode: edit this one
  opening?: { amount: number; date: string | null } | null;    // opening mode: current value (signed)
  onClose: () => void;
  onSaved: () => void;
}

export default function LedgerEntrySheet({ visible, customerId, customerName, mode, entry, opening, onClose, onSaved }: Props) {
  const isOpening = mode === 'opening';
  const isEdit = isOpening ? !!opening && opening.amount !== 0 : !!entry;

  const [entryType, setEntryType] = useState<LedgerEntryType>('discount');
  const [side, setSide]     = useState<'dr' | 'cr'>('dr');
  const [date, setDate]     = useState<string | null>(todayIso());
  const [amount, setAmount] = useState('');
  const [notes, setNotes]   = useState('');
  const [showDate, setShowDate] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (isOpening) {
      const a = opening?.amount ?? 0;
      setSide(a < 0 ? 'cr' : 'dr');
      setAmount(a ? String(Math.abs(a)) : '');
      setDate(opening?.date ?? null);
    } else if (entry) {
      setEntryType(entry.entryType);
      setDate(entry.date);
      setAmount(String(entry.amount));
      setNotes(entry.notes);
    } else {
      setEntryType('discount'); setDate(todayIso()); setAmount(''); setNotes('');
    }
    // Primitive deps: the parent passes `opening` as a fresh object literal on
    // every render, which must not wipe what's being typed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, isOpening, opening?.amount, opening?.date, entry?.id]);

  const parsed = parseFloat(amount);

  const handleSave = async () => {
    if (!Number.isFinite(parsed) || parsed <= 0) { notify('Invalid amount', 'Enter an amount greater than zero.'); return; }
    setSaving(true);
    try {
      if (isOpening) {
        await ledgerApi.setOpeningBalance(customerId, { amount: parsed, side, date });
      } else {
        if (!date) { notify('Date required', 'Pick the date of this entry.'); setSaving(false); return; }
        const payload = { entryType, entryDate: date, amount: parsed, notes: notes.trim() || undefined };
        if (entry) await ledgerApi.updateEntry(entry.id, payload);
        else await ledgerApi.createEntry(customerId, payload);
      }
      onSaved();
      onClose();
    } catch (e: any) {
      notify('Could not save', e?.response?.data?.error || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const ok = await confirmAsync(
      isOpening ? 'Remove opening balance?' : 'Delete entry?',
      isOpening ? 'The opening balance line will be removed from this ledger.' : 'This entry will be removed from the ledger.',
      isOpening ? 'Remove' : 'Delete', true,
    );
    if (!ok) return;
    setSaving(true);
    try {
      if (isOpening) await ledgerApi.setOpeningBalance(customerId, { amount: 0, side: 'dr', date: null });
      else if (entry) await ledgerApi.deleteEntry(entry.id);
      onSaved();
      onClose();
    } catch (e: any) {
      notify('Could not delete', e?.response?.data?.error || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const selectedType = ENTRY_TYPES.find((t) => t.key === entryType);

  return (
    <LedgerSheetFrame
      visible={visible}
      title={isOpening ? 'Opening Balance' : isEdit ? 'Edit Entry' : 'Add Adjustment'}
      subtitle={customerName}
      icon={isOpening ? 'flag-outline' : 'create-outline'}
      saving={saving}
      saveLabel="Save"
      onSave={handleSave}
      onClose={onClose}
      extraAction={isEdit ? { label: isOpening ? 'Remove' : 'Delete', onPress: handleDelete, destructive: true } : undefined}
    >
      {isOpening ? (
        <>
          <Text style={st.help}>
            Balance this customer already had before you started using the app. It appears as the first line of the ledger.
          </Text>
          <Text style={st.label}>Balance Type</Text>
          <View style={st.chipRow}>
            <Chip active={side === 'dr'} onPress={() => setSide('dr')} title="Customer owes us" sub="Debit (Dr)" />
            <Chip active={side === 'cr'} onPress={() => setSide('cr')} title="Advance with us" sub="Credit (Cr)" />
          </View>
        </>
      ) : (
        <>
          <Text style={st.label}>Entry Type</Text>
          <View style={st.chipRow}>
            {ENTRY_TYPES.map((t) => (
              <Chip key={t.key} active={entryType === t.key} onPress={() => setEntryType(t.key)} title={t.label} sub={t.side === 'Cr' ? 'Credit (Cr)' : 'Debit (Dr)'} />
            ))}
          </View>
          {selectedType && <Text style={st.help}>{selectedType.hint}</Text>}
        </>
      )}

      <Text style={st.label}>Amount <Text style={st.req}>*</Text></Text>
      <View style={st.inputRow}>
        <Text style={st.rupee}>₹</Text>
        <TextInput
          style={[st.input, { flex: 1 }]} value={amount} onChangeText={setAmount}
          placeholder="0.00" placeholderTextColor={Colors.textMuted} keyboardType="decimal-pad"
          autoComplete="off" textContentType="none" importantForAutofill="no"
        />
      </View>

      <Text style={st.label}>
        {isOpening ? 'As on Date ' : 'Date '}
        {isOpening ? <Text style={st.opt}>(optional)</Text> : <Text style={st.req}>*</Text>}
      </Text>
      <TouchableOpacity style={st.inputRow} onPress={() => setShowDate(true)} activeOpacity={0.7}>
        <Ionicons name="calendar-outline" size={16} color={Colors.textMuted} />
        <Text style={[st.dateText, !date && { color: Colors.textMuted }]}>{date ? fmtDay(date) : 'Before all transactions'}</Text>
      </TouchableOpacity>

      {!isOpening && (
        <>
          <Text style={st.label}>Notes <Text style={st.opt}>(shown on the statement)</Text></Text>
          <TextInput
            style={st.plainInput} value={notes} onChangeText={setNotes}
            placeholder="e.g. Diwali discount on ORD-OCT26-012" placeholderTextColor={Colors.textMuted}
            autoComplete="off" textContentType="none" importantForAutofill="no"
          />
        </>
      )}

      <DatePickerModal
        visible={showDate}
        title={isOpening ? 'Opening Balance Date' : 'Entry Date'}
        value={date}
        allowClear={isOpening}
        onSelect={(iso) => { if (iso || isOpening) setDate(iso); setShowDate(false); }}
        onClose={() => setShowDate(false)}
      />
    </LedgerSheetFrame>
  );
}

function Chip({ active, onPress, title, sub }: { active: boolean; onPress: () => void; title: string; sub: string }) {
  return (
    <TouchableOpacity style={[st.chip, active && st.chipActive]} onPress={onPress} activeOpacity={0.8}>
      <Text style={[st.chipTitle, active && st.chipTitleActive]}>{title}</Text>
      <Text style={[st.chipSub, active && st.chipTitleActive]}>{sub}</Text>
    </TouchableOpacity>
  );
}

const st = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6, marginTop: 4 },
  req:   { color: Colors.error },
  opt:   { fontWeight: '400', color: Colors.textMuted },
  help:  { fontSize: 12, color: Colors.textSecondary, lineHeight: 18, marginBottom: 12 },
  chipRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  chip:      { flexGrow: 1, flexBasis: 130, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  chipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  chipTitle: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  chipSub:   { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  chipTitleActive: { color: '#111' },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 8, paddingHorizontal: 12, marginBottom: 14,
  },
  input:    { fontSize: 16, color: Colors.textPrimary, paddingVertical: 12, ...Platform.select({ web: { outlineStyle: 'none' as any } }) },
  rupee:    { fontSize: 18, color: Colors.textMuted, fontWeight: '600' },
  dateText: { fontSize: 15, color: Colors.textPrimary },
  plainInput: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, color: Colors.textPrimary, marginBottom: 14, minHeight: 48,
    ...Platform.select({ web: { outlineStyle: 'none' as any } }),
  },
});
