import {
  View, Text, TextInput, TouchableOpacity, Modal, ScrollView,
  FlatList, ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet,
} from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { stockApi, inventoryApi, StockMovement } from '../services/api';
import { Colors } from '../constants/colors';
import InventoryFormSheet from './InventoryFormSheet';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PurchaseItemOption {
  inventoryId: number;
  name: string;
  itemCode: string;
  unit: string;
  qty: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  movement?: StockMovement | null;
  purchaseContext?: {
    purchaseId: number;
    purchaseNo: string;
    items: PurchaseItemOption[];
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const TX_TYPES = [
  { key: 'in',         label: 'Stock In',   color: Colors.success, bg: Colors.successLight },
  { key: 'out',        label: 'Stock Out',  color: Colors.error,   bg: Colors.errorLight   },
  { key: 'adjustment', label: 'Adjustment', color: Colors.info,    bg: Colors.infoLight    },
] as const;

// ── Component ─────────────────────────────────────────────────────────────────

export default function StockEntryFormSheet({ visible, onClose, onSaved, movement, purchaseContext }: Props) {
  const isEdit = !!movement;
  const isWeb  = Platform.OS === 'web';

  const [inventoryId,    setInventoryId]    = useState<number | null>(null);
  const [inventoryLabel, setInventoryLabel] = useState('');
  const [inventoryUnit,  setInventoryUnit]  = useState('pcs');
  const [txType,         setTxType]         = useState<'in' | 'out' | 'adjustment'>('in');
  const [quantity,       setQuantity]       = useState('');
  const [location,       setLocation]       = useState('');
  const [batchNo,        setBatchNo]        = useState('');
  const [notes,          setNotes]          = useState('');
  const [saving,         setSaving]         = useState(false);
  const [error,          setError]          = useState('');

  // Inventory picker
  const [showPicker,    setShowPicker]    = useState(false);
  const [pickerSearch,  setPickerSearch]  = useState('');
  const [invList,       setInvList]       = useState<{ id: number; label: string; sub: string }[]>([]);
  const [loadingInv,    setLoadingInv]    = useState(false);
  const [showInvCreate, setShowInvCreate] = useState(false);

  // Pre-fill on open
  useEffect(() => {
    if (!visible) return;
    if (movement) {
      setInventoryId(movement.inventory?.id ?? null);
      setInventoryLabel(movement.inventory ? `${movement.inventory.itemCode} - ${movement.inventory.name}` : '');
      setInventoryUnit(movement.inventory?.unit ?? 'pcs');
      setTxType((movement.transactionType as any) ?? 'in');
      setQuantity(parseFloat(movement.quantity).toString());
      setLocation(movement.location ?? '');
      setBatchNo(movement.batchNo ?? '');
      setNotes(movement.notes ?? '');
    } else {
      setInventoryId(null); setInventoryLabel(''); setInventoryUnit('pcs');
      setTxType('in'); setQuantity('');
      setLocation(''); setBatchNo(''); setNotes('');
    }
    setError('');
  }, [visible, movement]);

  const openInventoryPicker = () => {
    if (!invList.length) {
      setLoadingInv(true);
      inventoryApi.list({ limit: 500, active: true })
        .then(({ data }) => setInvList(
          data.inventory.map(i => ({ id: i.id, label: `${i.itemCode} - ${i.name}`, sub: i.unit }))
        ))
        .catch(() => {})
        .finally(() => setLoadingInv(false));
    }
    setPickerSearch('');
    setShowPicker(true);
  };

  const handleInventoryCreated = (newId?: number) => {
    setShowInvCreate(false);
    if (!newId) return;
    inventoryApi.detail(newId).then(({ data }) => {
      const inv = data.item;
      const label = `${inv.itemCode} - ${inv.name}`;
      setInventoryId(inv.id);
      setInventoryLabel(label);
      setInventoryUnit(inv.unit ?? 'pcs');
      setInvList(prev => prev.some(i => i.id === inv.id)
        ? prev
        : [{ id: inv.id, label, sub: inv.unit ?? 'pcs' }, ...prev]);
    }).catch(() => {});
  };

  const selectPurchaseItem = (item: PurchaseItemOption) => {
    setInventoryId(item.inventoryId);
    setInventoryLabel(`${item.itemCode} - ${item.name}`);
    setInventoryUnit(item.unit);
    if (!isEdit) setQuantity(item.qty);
  };

  const handleSave = async () => {
    if (!inventoryId) { setError('Select an inventory item.'); return; }
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) { setError('Enter a valid quantity greater than 0.'); return; }
    setSaving(true); setError('');
    try {
      if (isEdit) {
        await stockApi.update(movement!.id, { quantity: qty, transactionType: txType, location, batchNo, notes });
      } else {
        await stockApi.create({
          inventoryId,
          quantity: qty,
          transactionType: txType,
          location, batchNo, notes,
          reference:     purchaseContext?.purchaseNo ?? '',
          referenceType: purchaseContext ? 'purchase' : 'manual',
          referenceId:   purchaseContext?.purchaseId,
        });
      }
      onSaved();
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Could not save. Please try again.');
    } finally { setSaving(false); }
  };

  // ── Inventory picker modal ─────────────────────────────────────────────────

  const filtered = pickerSearch
    ? invList.filter(i => i.label.toLowerCase().includes(pickerSearch.toLowerCase()))
    : invList;

  const pickerModal = (
    <Modal visible={showPicker} animationType="slide" transparent onRequestClose={() => setShowPicker(false)}>
      <View style={pm.backdrop}>
        <View style={pm.sheet}>
          <View style={pm.header}>
            <Text style={pm.title}>Select Item</Text>
            <TouchableOpacity onPress={() => setShowPicker(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={22} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <View style={pm.searchRow}>
            <Ionicons name="search-outline" size={16} color={Colors.textMuted} />
            <TextInput
              style={pm.searchInput} value={pickerSearch} onChangeText={setPickerSearch}
              placeholder="Search inventory..." placeholderTextColor={Colors.textMuted}
              autoFocus autoCorrect={false}
              autoComplete="new-password" textContentType="none" importantForAutofill="no"
            />
          </View>
          {loadingInv
            ? <ActivityIndicator style={{ margin: 24 }} color={Colors.accent} />
            : (
              <FlatList
                data={filtered}
                keyExtractor={i => String(i.id)}
                renderItem={({ item }) => (
                  <TouchableOpacity style={pm.item} onPress={() => {
                    setInventoryId(item.id);
                    setInventoryLabel(item.label);
                    setInventoryUnit(item.sub);
                    setShowPicker(false);
                  }}>
                    <Text style={pm.itemLabel} numberOfLines={1}>{item.label}</Text>
                    <Text style={pm.itemSub}>{item.sub}</Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={<Text style={pm.empty}>No items found</Text>}
              />
            )}
        </View>
      </View>
    </Modal>
  );

  // ── Form body (shared) ─────────────────────────────────────────────────────

  const purchaseItems = purchaseContext?.items.filter(it => it.inventoryId) ?? [];

  const invCreateModal = (
    <InventoryFormSheet
      visible={showInvCreate}
      item={null}
      onClose={() => setShowInvCreate(false)}
      onSaved={handleInventoryCreated}
    />
  );

  const formBody = (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={f.body}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Error */}
      {error ? (
        <View style={f.errorBox}>
          <Ionicons name="alert-circle-outline" size={15} color={Colors.error} />
          <Text style={f.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => setError('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={14} color={Colors.error} />
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Quick-pick from purchase (create mode only) */}
      {!isEdit && purchaseItems.length > 0 && (
        <View style={f.quickSection}>
          <Text style={f.quickLabel}>
            From {purchaseContext!.purchaseNo} — tap to pre-fill
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {purchaseItems.map(item => {
              const sel = inventoryId === item.inventoryId;
              return (
                <TouchableOpacity
                  key={item.inventoryId}
                  style={[f.quickChip, sel && f.quickChipActive]}
                  onPress={() => selectPurchaseItem(item)}
                  activeOpacity={0.75}
                >
                  <Text style={[f.quickChipName, sel && { color: Colors.accent }]} numberOfLines={1}>{item.name}</Text>
                  <Text style={[f.quickChipQty, sel && { color: Colors.accentDark }]}>{item.qty} {item.unit}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Inventory item */}
      <Text style={f.label}>Inventory Item <Text style={f.req}>*</Text></Text>
      {isEdit ? (
        <View style={f.lockedField}>
          <Ionicons name="lock-closed-outline" size={12} color={Colors.textMuted} />
          <Text style={f.lockedText} numberOfLines={1}>{inventoryLabel || '—'}</Text>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <TouchableOpacity style={[f.pickerField, { flex: 1 }]} onPress={openInventoryPicker}>
            <Text style={inventoryId ? f.pickerValue : f.pickerPlaceholder} numberOfLines={1}>
              {inventoryId ? inventoryLabel : 'Select item...'}
            </Text>
            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
              {inventoryId && (
                <TouchableOpacity onPress={() => { setInventoryId(null); setInventoryLabel(''); setInventoryUnit('pcs'); }}>
                  <Ionicons name="close-circle" size={15} color={Colors.textMuted} />
                </TouchableOpacity>
              )}
              <Ionicons name="chevron-down" size={15} color={Colors.textMuted} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={f.addItemBtn} onPress={() => setShowInvCreate(true)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
            <Ionicons name="add" size={18} color={Colors.accent} />
          </TouchableOpacity>
        </View>
      )}

      {/* Transaction type */}
      <Text style={f.label}>Type <Text style={f.req}>*</Text></Text>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        {TX_TYPES.map(t => {
          const active = txType === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              style={[f.typeChip, active && { backgroundColor: t.bg, borderColor: t.color }]}
              onPress={() => !isEdit && setTxType(t.key)}
              disabled={isEdit}
              activeOpacity={isEdit ? 1 : 0.8}
            >
              <Ionicons
                name={t.key === 'in' ? 'arrow-down-circle-outline' : t.key === 'out' ? 'arrow-up-circle-outline' : 'swap-horizontal-outline'}
                size={13}
                color={active ? t.color : Colors.textMuted}
              />
              <Text style={[f.typeChipText, active && { color: t.color, fontWeight: '700' }]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
        {isEdit && (
          <View style={f.lockHint}>
            <Ionicons name="lock-closed-outline" size={11} color={Colors.textMuted} />
            <Text style={f.lockHintText}>Type locked on edit</Text>
          </View>
        )}
      </View>

      {/* Quantity */}
      <Text style={f.label}>Quantity <Text style={f.req}>*</Text></Text>
      <View style={[f.inputRow, { marginBottom: 14 }]}>
        <TextInput
          style={[f.input, { flex: 1 }]}
          value={quantity} onChangeText={setQuantity}
          placeholder="0.00" placeholderTextColor={Colors.textMuted}
          keyboardType="decimal-pad"
          autoComplete="new-password" textContentType="none" importantForAutofill="no"
        />
        <Text style={f.unitSuffix}>{inventoryUnit}</Text>
      </View>

      {/* Location + Batch No */}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={f.label}>Location</Text>
          <TextInput
            style={f.input}
            value={location} onChangeText={setLocation}
            placeholder="Warehouse A..." placeholderTextColor={Colors.textMuted}
            autoComplete="new-password" textContentType="none" importantForAutofill="no"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={f.label}>Batch No</Text>
          <TextInput
            style={f.input}
            value={batchNo} onChangeText={v => setBatchNo(v.toUpperCase())}
            placeholder="BATCH-001" placeholderTextColor={Colors.textMuted}
            autoCapitalize="characters"
            autoComplete="new-password" textContentType="none" importantForAutofill="no"
          />
        </View>
      </View>

      {/* Notes */}
      <Text style={f.label}>Notes</Text>
      <TextInput
        style={[f.input, { height: 70, textAlignVertical: 'top', paddingTop: 10 }]}
        value={notes} onChangeText={setNotes}
        placeholder="Optional notes..." placeholderTextColor={Colors.textMuted}
        multiline numberOfLines={3}
        autoComplete="new-password" textContentType="none" importantForAutofill="no"
      />
    </ScrollView>
  );

  // ── WEB layout ────────────────────────────────────────────────────────────
  if (isWeb) {
    return (
      <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
        <View style={web.backdrop}>
          <View style={web.dialog}>
            <View style={web.header}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="git-branch-outline" size={17} color={Colors.accent} />
                <Text style={web.title}>{isEdit ? 'Edit Stock Entry' : 'New Stock Entry'}</Text>
                {purchaseContext && !isEdit && (
                  <Text style={web.subtitle}>for {purchaseContext.purchaseNo}</Text>
                )}
              </View>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                <TouchableOpacity style={web.cancelBtn} onPress={onClose} disabled={saving}>
                  <Text style={web.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[web.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                  {saving
                    ? <ActivityIndicator size="small" color="#111" />
                    : <><Ionicons name="checkmark" size={15} color="#111" /><Text style={web.saveText}>{isEdit ? 'Update Entry' : 'Add to Stock'}</Text></>
                  }
                </TouchableOpacity>
              </View>
            </View>
            {formBody}
          </View>
        </View>
        {pickerModal}
        {invCreateModal}
      </Modal>
    );
  }

  // ── NATIVE layout ─────────────────────────────────────────────────────────
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={f.nativeHeader}>
          <View>
            <Text style={f.nativeTitle}>{isEdit ? 'Edit Stock Entry' : 'New Stock Entry'}</Text>
            {purchaseContext && !isEdit && (
              <Text style={f.nativeSubtitle}>for {purchaseContext.purchaseNo}</Text>
            )}
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>
        {formBody}
        <View style={f.footer}>
          <TouchableOpacity style={f.cancelBtn} onPress={onClose} disabled={saving}>
            <Text style={f.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[f.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
            {saving
              ? <ActivityIndicator size="small" color="#111" />
              : <Text style={f.saveText}>{isEdit ? 'Update Entry' : 'Add to Stock'}</Text>
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
      {pickerModal}
    </Modal>
  );
}

// ── Shared styles ──────────────────────────────────────────────────────────────

const f = StyleSheet.create({
  body: { padding: 16, paddingBottom: 32 },

  nativeHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 60 : 24, paddingBottom: 14,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  nativeTitle:    { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  nativeSubtitle: { fontSize: 11, color: Colors.accent, fontWeight: '600', marginTop: 2 },

  footer: {
    flexDirection: 'row', gap: 12, padding: 16,
    borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.surface,
  },
  cancelBtn: {
    flex: 1, height: 44, borderRadius: 6, borderWidth: 1, borderColor: Colors.border,
    justifyContent: 'center', alignItems: 'center',
  },
  cancelText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  saveBtn: {
    flex: 2, height: 44, borderRadius: 6, backgroundColor: Colors.accent,
    justifyContent: 'center', alignItems: 'center',
  },
  saveText: { fontSize: 14, fontWeight: '700', color: '#111' },

  errorBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: Colors.errorLight, borderLeftWidth: 3, borderLeftColor: Colors.error,
    borderRadius: 4, padding: 12, marginBottom: 16,
  },
  errorText: { flex: 1, color: Colors.error, fontSize: 13, lineHeight: 18 },

  quickSection: {
    backgroundColor: Colors.accentLight, borderRadius: 8, borderWidth: 1,
    borderColor: 'rgba(255,153,0,0.25)', padding: 12, marginBottom: 16, gap: 10,
  },
  quickLabel:        { fontSize: 11, fontWeight: '700', color: Colors.accentDark, textTransform: 'uppercase', letterSpacing: 0.5 },
  quickChip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    minWidth: 80, alignItems: 'center',
  },
  quickChipActive:   { borderColor: Colors.accent, backgroundColor: '#FFF3D4' },
  quickChipName:     { fontSize: 12, fontWeight: '600', color: Colors.textPrimary },
  quickChipQty:      { fontSize: 10, color: Colors.textMuted, marginTop: 2 },

  label:    { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6 },
  req:      { color: Colors.error },

  lockedField: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 14,
  },
  lockedText: { fontSize: 14, color: Colors.textMuted, flex: 1 },

  pickerField: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 14,
  },
  addItemBtn: {
    width: 40, height: 40, borderRadius: 6, borderWidth: 1,
    borderColor: Colors.accent, backgroundColor: Colors.accentLight,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  pickerValue:       { fontSize: 14, color: Colors.textPrimary, flex: 1 },
  pickerPlaceholder: { fontSize: 14, color: Colors.textMuted, flex: 1 },

  typeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface,
  },
  typeChipText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },

  lockHint: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 8,
  },
  lockHintText: { fontSize: 11, color: Colors.textMuted },

  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    height: 44, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 6,
    paddingHorizontal: 12, fontSize: 14, color: Colors.textPrimary,
    backgroundColor: Colors.surface, marginBottom: 14,
    ...Platform.select({ web: { outlineStyle: 'none' } }),
  },
  unitSuffix: {
    fontSize: 13, fontWeight: '600', color: Colors.textMuted,
    paddingHorizontal: 10, paddingVertical: 12,
    backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 6, marginBottom: 14,
  },
});

const web = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  dialog: {
    width: '100%', maxWidth: 520, maxHeight: '88%',
    backgroundColor: Colors.background, borderRadius: 12, overflow: 'hidden',
    ...Platform.select({ web: { boxShadow: '0 12px 32px rgba(0,0,0,0.35)' }, default: { elevation: 20 } }),
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: Colors.primary, borderBottomWidth: 1, borderBottomColor: Colors.primaryLight,
  },
  title:    { fontSize: 16, fontWeight: '700', color: '#fff' },
  subtitle: { fontSize: 12, color: Colors.accent, fontWeight: '600', marginLeft: 6 },
  cancelBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  cancelText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.85)' },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 7, borderRadius: 6, backgroundColor: Colors.accent,
  },
  saveText: { fontSize: 13, fontWeight: '700', color: '#111' },
});

// ── Picker modal styles ───────────────────────────────────────────────────────

const pm = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16,
    maxHeight: '80%',
    ...Platform.select({ web: { maxHeight: 500, borderRadius: 12, margin: 'auto' as any, minWidth: 400 } }),
  },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title:       { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  searchRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, margin: 12, paddingHorizontal: 12, height: 44, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  searchInput: { flex: 1, fontSize: 15, color: Colors.textPrimary, ...Platform.select({ web: { outlineStyle: 'none' } }) },
  item:        { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  itemLabel:   { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  itemSub:     { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  empty:       { textAlign: 'center', color: Colors.textMuted, padding: 32, fontSize: 14 },
});
