/**
 * StockMovementSheet — Add a stock movement for a specific inventory item.
 *
 * Can be opened from the inventory detail screen.
 * Shows current stock prominently and warns when OUT qty approaches available.
 */
import {
  View, Text, TextInput, TouchableOpacity, Modal,
  ScrollView, ActivityIndicator, StyleSheet, Platform, KeyboardAvoidingView,
} from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { stockApi } from '../services/api';
import { Colors } from '../constants/colors';

const TX_TYPES = [
  { value: 'in',         label: 'IN',         icon: 'arrow-down-circle-outline', color: Colors.success, bg: Colors.successLight },
  { value: 'out',        label: 'OUT',         icon: 'arrow-up-circle-outline',   color: Colors.error,   bg: Colors.errorLight },
  { value: 'adjustment', label: 'ADJUSTMENT',  icon: 'swap-horizontal-outline',   color: Colors.info,    bg: Colors.infoLight },
] as const;

function StyledInput(props: React.ComponentProps<typeof TextInput>) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      {...props}
      style={[styles.input, focused && styles.inputFocused, props.style]}
      onFocus={e => { setFocused(true); props.onFocus?.(e); }}
      onBlur={e => { setFocused(false); props.onBlur?.(e); }}
      placeholderTextColor={Colors.textMuted}
      autoComplete="new-password"
      textContentType="none"
      importantForAutofill="no"
    />
  );
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSaved: (newCurrentStock: number) => void;
  inventoryId: number;
  inventoryName: string;
  currentStock: number;
  unit: string;
}

export default function StockMovementSheet({
  visible, onClose, onSaved,
  inventoryId, inventoryName, currentStock, unit,
}: Props) {
  const [txType,    setTxType]    = useState<'in' | 'out' | 'adjustment'>('in');
  const [quantity,  setQuantity]  = useState('');
  const [location,  setLocation]  = useState('');
  const [batchNo,   setBatchNo]   = useState('');
  const [reference, setReference] = useState('');
  const [notes,     setNotes]     = useState('');
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState('');

  useEffect(() => {
    if (!visible) return;
    setTxType('in'); setQuantity(''); setLocation('');
    setBatchNo(''); setReference(''); setNotes(''); setError('');
  }, [visible]);

  const qty = parseFloat(quantity) || 0;
  const isOutInsufficient = txType === 'out' && qty > currentStock && qty > 0;
  const stockAfter = txType === 'in'
    ? currentStock + qty
    : txType === 'out'
      ? currentStock - qty
      : currentStock; // adjustment doesn't change stock display

  const handleSave = async () => {
    if (!quantity.trim() || isNaN(parseFloat(quantity)) || parseFloat(quantity) <= 0) {
      setError('Quantity must be greater than 0.'); return;
    }
    if (isOutInsufficient) { setError(`Insufficient stock. Available: ${currentStock} ${unit}.`); return; }
    setSaving(true); setError('');
    try {
      const { data } = await stockApi.create({
        inventoryId,
        quantity: parseFloat(quantity),
        transactionType: txType,
        location: location.trim(),
        batchNo: batchNo.trim(),
        reference: reference.trim(),
        notes: notes.trim(),
      });
      onSaved(data.newCurrentStock);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Could not add movement.');
    } finally { setSaving(false); }
  };

  const selectedTx = TX_TYPES.find(t => t.value === txType)!;

  const formBody = (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.body}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Current stock display */}
      <View style={[styles.stockCard, { backgroundColor: Colors.primary }]}>
        <Text style={styles.stockItemName} numberOfLines={1}>{inventoryName}</Text>
        <View style={styles.stockRow}>
          <View style={styles.stockStat}>
            <Text style={styles.stockStatLabel}>Current Stock</Text>
            <Text style={[styles.stockStatValue, { color: currentStock <= 0 ? Colors.error : Colors.accent }]}>
              {currentStock.toFixed(2)}
            </Text>
          </View>
          {qty > 0 && (
            <View style={styles.stockStat}>
              <Text style={styles.stockStatLabel}>After Movement</Text>
              <Text style={[styles.stockStatValue, {
                color: stockAfter < 0 ? Colors.error : stockAfter === 0 ? '#7A5400' : Colors.success,
              }]}>
                {stockAfter.toFixed(2)}
              </Text>
            </View>
          )}
          <View style={styles.stockStat}>
            <Text style={styles.stockStatLabel}>Unit</Text>
            <Text style={styles.stockStatValue}>{unit}</Text>
          </View>
        </View>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={15} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Transaction type selector */}
      <Text style={styles.label}>Transaction Type <Text style={styles.req}>*</Text></Text>
      <View style={styles.txRow}>
        {TX_TYPES.map(t => (
          <TouchableOpacity
            key={t.value}
            style={[styles.txChip, txType === t.value && { backgroundColor: t.bg, borderColor: t.color }]}
            onPress={() => setTxType(t.value)}
          >
            <Ionicons name={t.icon} size={16} color={txType === t.value ? t.color : Colors.textMuted} />
            <Text style={[styles.txChipText, txType === t.value && { color: t.color }]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Selected type description */}
      <View style={[styles.txDesc, { backgroundColor: selectedTx.bg }]}>
        <Text style={[styles.txDescText, { color: selectedTx.color }]}>
          {txType === 'in' ? '↓ Stock IN — goods received, purchase, return from site'
            : txType === 'out' ? '↑ Stock OUT — goods issued, dispatched to site'
              : '⇄ Adjustment — stock count correction, write-off, opening balance'}
        </Text>
      </View>

      {/* Quantity */}
      <View style={styles.fieldWrap}>
        <Text style={styles.label}>Quantity ({unit}) <Text style={styles.req}>*</Text></Text>
        <StyledInput
          value={quantity}
          onChangeText={setQuantity}
          placeholder="0.00"
          keyboardType="decimal-pad"
          style={isOutInsufficient ? { borderColor: Colors.error } : undefined}
        />
        {isOutInsufficient ? (
          <Text style={styles.insufficientText}>
            ⚠ Only {currentStock.toFixed(2)} {unit} available
          </Text>
        ) : null}
      </View>

      <View style={styles.rowGap}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Location</Text>
          <StyledInput value={location} onChangeText={setLocation} placeholder="Warehouse / Site" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Batch No</Text>
          <StyledInput value={batchNo} onChangeText={setBatchNo} placeholder="Optional" />
        </View>
      </View>

      <View style={styles.fieldWrap}>
        <Text style={styles.label}>Reference</Text>
        <StyledInput value={reference} onChangeText={setReference} placeholder="PO No, Invoice No, etc." />
      </View>

      <View style={styles.fieldWrap}>
        <Text style={styles.label}>Notes</Text>
        <StyledInput
          value={notes} onChangeText={setNotes} placeholder="Optional note"
          multiline numberOfLines={2} style={{ height: 60, textAlignVertical: 'top', paddingTop: 10 }}
        />
      </View>
    </ScrollView>
  );

  // ── WEB ───────────────────────────────────────────────────────────────────
  if (Platform.OS === 'web') {
    return (
      <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
        <View style={w.backdrop}>
          <View style={w.dialog}>
            <View style={w.header}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="git-branch-outline" size={18} color={Colors.accent} />
                <Text style={w.headerTitle}>Add Stock Movement</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                <TouchableOpacity style={w.cancelBtn} onPress={onClose} disabled={saving}>
                  <Text style={w.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[w.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                  {saving
                    ? <ActivityIndicator size="small" color="#111" />
                    : <><Ionicons name="checkmark" size={15} color="#111" /><Text style={w.saveText}>Add Movement</Text></>}
                </TouchableOpacity>
              </View>
            </View>
            {formBody}
          </View>
        </View>
      </Modal>
    );
  }

  // ── NATIVE ────────────────────────────────────────────────────────────────
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Add Stock Movement</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>
        {formBody}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.cancelBtnFooter} onPress={onClose} disabled={saving}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveBtnFooter, saving && { opacity: 0.6 }, isOutInsufficient && { backgroundColor: Colors.error }]}
            onPress={handleSave} disabled={saving}
          >
            {saving ? <ActivityIndicator size="small" color="#111" /> : <Text style={styles.saveText}>Add Movement</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 60 : 24, paddingBottom: 14,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  closeBtn: { padding: 4 },

  body: { padding: 16, paddingBottom: 32 },
  fieldWrap: { marginBottom: 14 },
  rowGap: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6 },
  req: { color: Colors.error },

  stockCard: { borderRadius: 8, padding: 14, marginBottom: 16 },
  stockItemName: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.7)', marginBottom: 10 },
  stockRow: { flexDirection: 'row', gap: 16 },
  stockStat: { alignItems: 'center' },
  stockStatLabel: { fontSize: 10, color: 'rgba(255,255,255,0.6)', marginBottom: 2 },
  stockStatValue: { fontSize: 20, fontWeight: '800', color: '#fff' },

  txRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  txChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: 8, paddingVertical: 10,
    backgroundColor: Colors.surface,
  },
  txChipText: { fontSize: 10, fontWeight: '800', color: Colors.textMuted, letterSpacing: 0.5 },
  txDesc: { borderRadius: 4, padding: 10, marginBottom: 16 },
  txDescText: { fontSize: 12, fontWeight: '500', lineHeight: 18 },

  input: {
    height: 44, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 6,
    paddingHorizontal: 12, fontSize: 14, color: Colors.textPrimary,
    backgroundColor: Colors.surface,
    ...Platform.select({ web: { outlineStyle: 'none' } }),
  },
  inputFocused: {
    borderColor: Colors.accent,
    ...Platform.select({
      web: { boxShadow: '0 0 0 3px rgba(255,153,0,0.15)' },
      default: { shadowColor: Colors.accent, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.2, shadowRadius: 4 },
    }),
  },
  insufficientText: { fontSize: 12, color: Colors.error, marginTop: 4, fontWeight: '600' },

  errorBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: Colors.errorLight, borderLeftWidth: 3, borderLeftColor: Colors.error,
    borderRadius: 4, padding: 12, marginBottom: 16,
  },
  errorText: { color: Colors.error, fontSize: 13, flex: 1, lineHeight: 18 },

  footer: {
    flexDirection: 'row', gap: 12, padding: 16,
    borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.surface,
  },
  cancelBtnFooter: {
    flex: 1, height: 44, borderRadius: 6, borderWidth: 1, borderColor: Colors.border,
    justifyContent: 'center', alignItems: 'center',
  },
  cancelText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  saveBtnFooter: {
    flex: 2, height: 44, borderRadius: 6, backgroundColor: Colors.accent,
    justifyContent: 'center', alignItems: 'center',
  },
  saveText: { fontSize: 14, fontWeight: '700', color: '#111' },
});

const w = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  dialog: {
    width: '100%', maxWidth: 520, maxHeight: '90%',
    backgroundColor: Colors.background, borderRadius: 12, overflow: 'hidden',
    ...Platform.select({ web: { boxShadow: '0 12px 32px rgba(0,0,0,0.35)' }, default: { elevation: 20 } }),
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, paddingVertical: 14,
    backgroundColor: Colors.primary, borderBottomWidth: 1, borderBottomColor: Colors.primaryLight,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  cancelText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.85)' },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 18, paddingVertical: 8, borderRadius: 6, backgroundColor: Colors.accent,
  },
  saveText: { fontSize: 13, fontWeight: '700', color: '#111' },
});
