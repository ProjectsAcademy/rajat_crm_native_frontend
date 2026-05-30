/**
 * InventoryFormSheet — Create and Edit modal for Inventory Items.
 *
 * Category behaviour (mirrors Django project):
 *   - Loads distinct category strings from existing inventory items via GET /api/inventory/categories
 *   - Shows them in a dropdown/picker (native) or a styled select (web)
 *   - "+" button reveals an inline text input to type a brand-new category
 *   - The new string is saved as the item's category — NO separate Category model
 *
 * Create mode includes an "Initial Stock" section to seed the first movement.
 * Edit mode shows itemCode as read-only chip and never changes it.
 */
import {
  View, Text, TextInput, TouchableOpacity, Modal,
  ScrollView, ActivityIndicator, StyleSheet,
  Platform, KeyboardAvoidingView, Switch,
} from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { inventoryApi, InventoryDetail } from '../services/api';
import { Colors } from '../constants/colors';

// ─── Constants ────────────────────────────────────────────────────────────────

const UNITS = ['pcs', 'kg', 'm', 'litre', 'box', 'roll', 'set', 'pair', 'ft', 'sqft'];

// ─── Sub-components ───────────────────────────────────────────────────────────

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <View style={s.fieldWrap}>
      <Text style={s.label}>{label}{required ? <Text style={s.req}> *</Text> : null}</Text>
      {children}
    </View>
  );
}

function SectionHeader({ title, icon }: { title: string; icon: string }) {
  return (
    <View style={s.sectionHeader}>
      <Ionicons name={icon as any} size={14} color={Colors.accent} />
      <Text style={s.sectionTitle}>{title}</Text>
    </View>
  );
}

function StyledInput(props: React.ComponentProps<typeof TextInput>) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      {...props}
      style={[s.input, focused && s.inputFocused, props.style]}
      onFocus={e => { setFocused(true); props.onFocus?.(e); }}
      onBlur={e => { setFocused(false); props.onBlur?.(e); }}
      placeholderTextColor={Colors.textMuted}
      autoComplete="new-password"
      textContentType="none"
      importantForAutofill="no"
    />
  );
}

// ─── Category Picker ──────────────────────────────────────────────────────────
// Mirrors Django UX: dropdown of existing categories + "+" to add inline.

interface CategoryPickerProps {
  value: string;
  onChange: (v: string) => void;
  categories: string[];
}

function CategoryPicker({ value, onChange, categories }: CategoryPickerProps) {
  const [dropOpen,   setDropOpen]   = useState(false);
  const [addingNew,  setAddingNew]  = useState(false);
  const [newCatVal,  setNewCatVal]  = useState('');

  const handleSelect = (cat: string) => {
    onChange(cat);
    setDropOpen(false);
    setAddingNew(false);
  };

  const commitNew = () => {
    const trimmed = newCatVal.trim();
    if (trimmed) {
      onChange(trimmed);
      setNewCatVal('');
    }
    setAddingNew(false);
    setDropOpen(false);
  };

  const cancelNew = () => {
    setNewCatVal('');
    setAddingNew(false);
  };

  return (
    <View>
      {/* Selector row */}
      <View style={s.catRow}>
        <TouchableOpacity
          style={[s.catDropBtn, dropOpen && s.catDropBtnOpen]}
          onPress={() => { setDropOpen(v => !v); setAddingNew(false); }}
          activeOpacity={0.8}
        >
          <Text style={[s.catDropText, !value && { color: Colors.textMuted }]}>
            {value || '-- Select Category --'}
          </Text>
          <Ionicons name={dropOpen ? 'chevron-up' : 'chevron-down'} size={14} color={Colors.textMuted} />
        </TouchableOpacity>

        {/* "+" to add a new category inline */}
        <TouchableOpacity
          style={s.catAddBtn}
          onPress={() => { setAddingNew(v => !v); setDropOpen(false); }}
          activeOpacity={0.8}
        >
          <Ionicons name={addingNew ? 'close' : 'add'} size={18} color={addingNew ? Colors.error : Colors.accent} />
        </TouchableOpacity>
      </View>

      {/* Existing categories dropdown — uses ScrollView with nestedScrollEnabled
           so the inner list scrolls independently from the outer form ScrollView */}
      {dropOpen && (
        <ScrollView
          style={s.catDropdown}
          nestedScrollEnabled={true}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={true}
        >
          <TouchableOpacity style={s.catOption} onPress={() => handleSelect('')}>
            <Text style={[s.catOptionText, { color: Colors.textMuted }]}>-- Select Category --</Text>
          </TouchableOpacity>
          {categories.length === 0 ? (
            <View style={s.catOption}>
              <Text style={[s.catOptionText, { color: Colors.textMuted, fontStyle: 'italic' }]}>
                No categories yet — use + to add one
              </Text>
            </View>
          ) : (
            categories.map(cat => (
              <TouchableOpacity
                key={cat}
                style={[s.catOption, value === cat && s.catOptionActive]}
                onPress={() => handleSelect(cat)}
              >
                {value === cat && <Ionicons name="checkmark" size={13} color={Colors.accent} />}
                <Text style={[s.catOptionText, value === cat && s.catOptionTextActive]}>{cat}</Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}

      {/* Inline new-category input */}
      {addingNew && (
        <View style={s.newCatRow}>
          <TextInput
            style={s.newCatInput}
            value={newCatVal}
            onChangeText={setNewCatVal}
            placeholder="Enter new category"
            placeholderTextColor={Colors.textMuted}
            autoFocus
            autoCapitalize="words"
            autoComplete="new-password"
            textContentType="none"
            importantForAutofill="no"
            onSubmitEditing={commitNew}
            returnKeyType="done"
            {...(Platform.OS === 'web' ? { style: [s.newCatInput, { outlineStyle: 'none' } as any] } : {})}
          />
          <TouchableOpacity style={s.newCatClearBtn} onPress={cancelNew}>
            <Ionicons name="close-circle" size={18} color={Colors.error} />
          </TouchableOpacity>
        </View>
      )}

      {/* Show selected category as a chip if not in dropdown */}
      {value && !addingNew && !dropOpen && (
        <View style={s.selectedChip}>
          <Ionicons name="pricetag-outline" size={11} color={Colors.accent} />
          <Text style={s.selectedChipText}>{value}</Text>
          <TouchableOpacity onPress={() => onChange('')} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
            <Ionicons name="close-circle" size={13} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  visible: boolean;
  onClose: () => void;
  onSaved: (newId?: number) => void;
  item?: InventoryDetail | null;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function InventoryFormSheet({ visible, onClose, onSaved, item }: Props) {
  const isEdit = !!item;

  const [name,         setName]         = useState('');
  const [description,  setDescription]  = useState('');
  const [category,     setCategory]     = useState('');
  const [unit,         setUnit]         = useState('pcs');
  const [customUnit,   setCustomUnit]   = useState('');
  const [unitPrice,    setUnitPrice]    = useState('');
  const [reorderLevel, setReorderLevel] = useState('0');
  const [isActive,     setIsActive]     = useState(true);

  // Initial stock (create only)
  const [initialStock,     setInitialStock]     = useState('');
  const [initialLocation,  setInitialLocation]  = useState('');
  const [initialReference, setInitialReference] = useState('Opening Stock');

  // Category list from server
  const [categories, setCategories] = useState<string[]>([]);

  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  // Load existing categories once when sheet opens
  useEffect(() => {
    if (!visible) return;
    inventoryApi.categories()
      .then(({ data }) => setCategories(data.categories))
      .catch(() => {}); // non-critical — just means empty dropdown
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    if (item) {
      setName(item.name);
      setDescription(item.description ?? '');
      setCategory(item.category ?? '');
      const u = item.unit ?? 'pcs';
      setUnit(UNITS.includes(u) ? u : 'custom');
      setCustomUnit(UNITS.includes(u) ? '' : u);
      setUnitPrice(String(parseFloat(item.unitPrice)));
      setReorderLevel(String(parseFloat(item.reorderLevel)));
      setIsActive(item.isActive);
    } else {
      setName(''); setDescription(''); setCategory('');
      setUnit('pcs'); setCustomUnit('');
      setUnitPrice(''); setReorderLevel('0'); setIsActive(true);
      setInitialStock(''); setInitialLocation(''); setInitialReference('Opening Stock');
    }
    setError('');
  }, [visible, item]);

  const effectiveUnit = unit === 'custom' ? customUnit : unit;

  const handleSave = async () => {
    if (!name.trim()) { setError('Item name is required.'); return; }
    if (!unitPrice.trim() || isNaN(parseFloat(unitPrice)) || parseFloat(unitPrice) < 0) {
      setError('Unit price must be a valid non-negative number.'); return;
    }
    setSaving(true); setError('');
    try {
      const payload: any = {
        name: name.trim(),
        description: description.trim(),
        category: category.trim(),
        unit: effectiveUnit.trim() || 'pcs',
        unitPrice: parseFloat(unitPrice),
        reorderLevel: parseFloat(reorderLevel) || 0,
        isActive,
      };
      if (isEdit) {
        await inventoryApi.update(item!.id, payload);
        onSaved();
      } else {
        if (initialStock && parseFloat(initialStock) > 0) {
          payload.initialStock     = parseFloat(initialStock);
          payload.initialLocation  = initialLocation.trim();
          payload.initialReference = initialReference.trim() || 'Opening Stock';
        }
        const { data } = await inventoryApi.create(payload);
        onSaved(data.item.id);
      }
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Could not save item. Please try again.');
    } finally { setSaving(false); }
  };

  // ── Form body ─────────────────────────────────────────────────────────────
  const formBody = (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={s.body}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {error ? (
        <View style={s.errorBox}>
          <Ionicons name="alert-circle-outline" size={15} color={Colors.error} />
          <Text style={s.errorText}>{error}</Text>
        </View>
      ) : null}

      {isEdit && item?.itemCode ? (
        <View style={s.codeChip}>
          <Ionicons name="cube-outline" size={13} color={Colors.textMuted} />
          <Text style={s.codeChipText}>{item.itemCode}</Text>
        </View>
      ) : null}

      <SectionHeader title="Item Information" icon="cube-outline" />

      <Field label="Item Name" required>
        <StyledInput value={name} onChangeText={setName} placeholder="e.g. Steel Pipe 1 inch" autoCapitalize="words" />
      </Field>

      {/* Category picker — mirrors Django: existing list + inline add */}
      <Field label="Category">
        <CategoryPicker value={category} onChange={setCategory} categories={categories} />
      </Field>

      {/* Unit chip selector */}
      <Field label="Unit">
        <View style={s.unitRow}>
          {UNITS.map(u => (
            <TouchableOpacity
              key={u}
              style={[s.unitChip, unit === u && s.unitChipActive]}
              onPress={() => setUnit(u)}
            >
              <Text style={[s.unitChipText, unit === u && s.unitChipTextActive]}>{u}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[s.unitChip, unit === 'custom' && s.unitChipActive]}
            onPress={() => setUnit('custom')}
          >
            <Text style={[s.unitChipText, unit === 'custom' && s.unitChipTextActive]}>custom…</Text>
          </TouchableOpacity>
        </View>
        {unit === 'custom' && (
          <StyledInput
            value={customUnit}
            onChangeText={setCustomUnit}
            placeholder="Enter unit (e.g. bundle)"
            style={{ marginTop: 8 }}
          />
        )}
      </Field>

      <View style={s.row}>
        <View style={{ flex: 1 }}>
          <Field label="Unit Price (₹)" required>
            <StyledInput value={unitPrice} onChangeText={setUnitPrice} placeholder="0.00" keyboardType="decimal-pad" />
          </Field>
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Reorder Level">
            <StyledInput value={reorderLevel} onChangeText={setReorderLevel} placeholder="0" keyboardType="decimal-pad" />
          </Field>
        </View>
      </View>

      <Field label="Description">
        <StyledInput
          value={description} onChangeText={setDescription} placeholder="Optional"
          multiline numberOfLines={3} style={{ height: 72, textAlignVertical: 'top', paddingTop: 10 }}
        />
      </Field>

      {/* Initial Stock — create only */}
      {!isEdit && (
        <>
          <SectionHeader title="Initial Stock (Optional)" icon="layers-outline" />
          <View style={s.stockHint}>
            <Ionicons name="information-circle-outline" size={14} color={Colors.info} />
            <Text style={s.stockHintText}>Set opening stock. Leave blank if stock will be added separately.</Text>
          </View>
          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Field label={`Qty (${effectiveUnit || 'pcs'})`}>
                <StyledInput value={initialStock} onChangeText={setInitialStock} placeholder="0" keyboardType="decimal-pad" />
              </Field>
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Location">
                <StyledInput value={initialLocation} onChangeText={setInitialLocation} placeholder="Warehouse A" />
              </Field>
            </View>
          </View>
          <Field label="Reference">
            <StyledInput value={initialReference} onChangeText={setInitialReference} placeholder="Opening Stock" />
          </Field>
        </>
      )}

      {/* Status toggle — edit only */}
      {isEdit && (
        <View style={s.toggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.toggleLabel}>Active Status</Text>
            <Text style={s.toggleSub}>Inactive items won't appear in order pickers</Text>
          </View>
          <Switch value={isActive} onValueChange={setIsActive} trackColor={{ true: Colors.success, false: Colors.border }} thumbColor="#fff" />
        </View>
      )}
    </ScrollView>
  );

  // ── WEB layout ────────────────────────────────────────────────────────────
  if (Platform.OS === 'web') {
    return (
      <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
        <View style={w.backdrop}>
          <View style={w.dialog}>
            <View style={w.header}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="cube-outline" size={18} color={Colors.accent} />
                <Text style={w.headerTitle}>{isEdit ? 'Edit Item' : 'New Inventory Item'}</Text>
                {isEdit && item?.itemCode ? <Text style={w.headerSub}>{item.itemCode}</Text> : null}
              </View>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                <TouchableOpacity style={w.cancelBtn} onPress={onClose} disabled={saving}>
                  <Text style={w.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[w.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                  {saving
                    ? <ActivityIndicator size="small" color="#111" />
                    : <><Ionicons name="checkmark" size={15} color="#111" /><Text style={w.saveText}>{isEdit ? 'Update' : 'Create Item'}</Text></>}
                </TouchableOpacity>
              </View>
            </View>
            {formBody}
          </View>
        </View>
      </Modal>
    );
  }

  // ── NATIVE layout ─────────────────────────────────────────────────────────
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.header}>
          <Text style={s.headerTitle}>{isEdit ? 'Edit Item' : 'New Inventory Item'}</Text>
          <TouchableOpacity onPress={onClose} style={s.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>
        {formBody}
        <View style={s.footer}>
          <TouchableOpacity style={s.cancelBtnF} onPress={onClose} disabled={saving}>
            <Text style={s.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.saveBtnF, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
            {saving
              ? <ActivityIndicator size="small" color="#111" />
              : <Text style={s.saveText}>{isEdit ? 'Update Item' : 'Create Item'}</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 60 : 24, paddingBottom: 14,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  closeBtn: { padding: 4 },

  body:      { padding: 16, paddingBottom: 32 },
  fieldWrap: { marginBottom: 14 },
  label:     { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6 },
  req:       { color: Colors.error },
  row:       { flexDirection: 'row', gap: 12 },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginBottom: 12, marginTop: 8,
    borderBottomWidth: 1, borderBottomColor: Colors.border, paddingBottom: 8,
  },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8 },

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

  // ── Category picker ──
  catRow:        { flexDirection: 'row', gap: 8 },
  catDropBtn: {
    flex: 1, height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: 6,
    paddingHorizontal: 12, backgroundColor: Colors.surface,
  },
  catDropBtnOpen: { borderColor: Colors.accent },
  catDropText:   { fontSize: 14, color: Colors.textPrimary, flex: 1 },
  catAddBtn: {
    width: 44, height: 44, borderRadius: 6, borderWidth: 1.5,
    borderColor: Colors.border, justifyContent: 'center', alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  catDropdown: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: 6,
    backgroundColor: Colors.surface, marginTop: 4,
    maxHeight: 200,
    ...Platform.select({
      web: { boxShadow: '0 4px 12px rgba(0,0,0,0.12)' },
      default: { elevation: 4 },
    }),
  },
  catOption: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 11,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  catOptionActive:     { backgroundColor: Colors.accentLight },
  catOptionText:       { fontSize: 14, color: Colors.textPrimary },
  catOptionTextActive: { fontWeight: '700', color: Colors.accent },
  newCatRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8,
  },
  newCatInput: {
    flex: 1, height: 44, borderWidth: 1.5, borderColor: Colors.accent, borderRadius: 6,
    paddingHorizontal: 12, fontSize: 14, color: Colors.textPrimary,
    backgroundColor: Colors.surface,
    ...Platform.select({ web: { outlineStyle: 'none' } }),
  },
  newCatClearBtn: { padding: 4 },
  selectedChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start',
    backgroundColor: Colors.accentLight, borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4, marginTop: 6,
    borderWidth: 1, borderColor: 'rgba(255,153,0,0.35)',
  },
  selectedChipText: { fontSize: 12, fontWeight: '600', color: Colors.accent },

  // ── Unit chips ──
  unitRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  unitChip: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16,
    backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border,
  },
  unitChipActive:     { backgroundColor: Colors.accent, borderColor: Colors.accent },
  unitChipText:       { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  unitChipTextActive: { color: '#111' },

  stockHint: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: Colors.infoLight, borderRadius: 4, padding: 10, marginBottom: 14,
  },
  stockHintText: { fontSize: 12, color: Colors.info, flex: 1, lineHeight: 18 },

  errorBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: Colors.errorLight, borderLeftWidth: 3, borderLeftColor: Colors.error,
    borderRadius: 4, padding: 12, marginBottom: 16,
  },
  errorText: { color: Colors.error, fontSize: 13, flex: 1, lineHeight: 18 },

  codeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start',
    backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 16,
  },
  codeChipText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },

  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 6, padding: 14, marginTop: 8,
  },
  toggleLabel: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  toggleSub:   { fontSize: 12, color: Colors.textMuted, marginTop: 2 },

  footer: {
    flexDirection: 'row', gap: 12, padding: 16,
    borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.surface,
  },
  cancelBtnF: {
    flex: 1, height: 44, borderRadius: 6, borderWidth: 1, borderColor: Colors.border,
    justifyContent: 'center', alignItems: 'center',
  },
  cancelText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  saveBtnF: {
    flex: 2, height: 44, borderRadius: 6, backgroundColor: Colors.accent,
    justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 6,
  },
  saveText: { fontSize: 14, fontWeight: '700', color: '#111' },
});

const w = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  dialog: {
    width: '100%', maxWidth: 580, maxHeight: '90%',
    backgroundColor: Colors.background, borderRadius: 12, overflow: 'hidden',
    ...Platform.select({ web: { boxShadow: '0 12px 32px rgba(0,0,0,0.35)' }, default: { elevation: 20 } }),
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, paddingVertical: 14,
    backgroundColor: Colors.primary, borderBottomWidth: 1, borderBottomColor: Colors.primaryLight,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },
  headerSub:   { fontSize: 12, color: Colors.accent, fontWeight: '600', marginLeft: 4 },
  cancelBtn: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  cancelText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.85)' },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 18, paddingVertical: 8, borderRadius: 6, backgroundColor: Colors.accent,
  },
  saveText: { fontSize: 13, fontWeight: '700', color: '#111' },
});
