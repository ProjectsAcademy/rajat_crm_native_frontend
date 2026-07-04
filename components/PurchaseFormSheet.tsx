import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Modal,
  FlatList, ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView, Dimensions, Switch,
} from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { purchasesApi, vendorsApi, inventoryApi, PurchaseDetail } from '../services/api';
import { Colors } from '../constants/colors';
import VendorFormSheet from './VendorFormSheet';

// ── Types ─────────────────────────────────────────────────────────────────────

interface LocalItem {
  key: string;
  dbId: number | null;      // database PurchaseItem.id — null for new unsaved items
  stockedQty: number;       // read from server; > 0 means quantity is locked
  // Inventory link (optional — items without a link are non-stock items)
  inventoryId: number | null;
  inventoryLabel: string;
  inventoryUnit: string;
  // Free-text fields used when inventoryId is null
  description: string;
  unit: string;
  quantity: string;
  unitPrice: string;
  taxRate: string;
}

function makeItem(): LocalItem {
  return {
    key: `${Date.now()}-${Math.random()}`,
    dbId: null, stockedQty: 0,
    inventoryId: null, inventoryLabel: '', inventoryUnit: 'pcs',
    description: '', unit: 'pcs',
    quantity: '1', unitPrice: '', taxRate: '18',
  };
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSaved: (newPurchaseId?: number) => void;
  purchase?: PurchaseDetail | null;
}
interface SearchItem { id: number; label: string; sub?: string }

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUSES = [
  { key: 'draft',     label: 'Draft'     },
  { key: 'ordered',   label: 'Ordered'   },
  { key: 'received',  label: 'Received'  },
  { key: 'partial',   label: 'Partial'   },
  { key: 'cancelled', label: 'Cancelled' },
];

// ── Date helpers ──────────────────────────────────────────────────────────────

function today(): string {
  const d = new Date();
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}
function isoToDisplay(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('T')[0].split('-');
  return `${d}/${m}/${y}`;
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
function fmtCurrency(n: number): string {
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function lineTotal(item: LocalItem): number {
  const q = parseFloat(item.quantity || '0');
  const p = parseFloat(item.unitPrice || '0');
  return isNaN(q) || isNaN(p) ? 0 : q * p;
}
function lineTax(item: LocalItem): number {
  const t = lineTotal(item);
  const r = parseFloat(item.taxRate || '0');
  return isNaN(r) ? 0 : t * r / 100;
}

// ── SearchPickerModal ─────────────────────────────────────────────────────────

function SearchPickerModal({ visible, title, items, loading, onSelect }: {
  visible: boolean; title: string; items: SearchItem[];
  loading: boolean; onSelect: (item: SearchItem | null) => void;
}) {
  const [q, setQ] = useState('');
  const filtered = q
    ? items.filter(i => i.label.toLowerCase().includes(q.toLowerCase()) || (i.sub ?? '').toLowerCase().includes(q.toLowerCase()))
    : items;
  useEffect(() => { if (!visible) setQ(''); }, [visible]);
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={() => onSelect(null)}>
      <View style={sp.container}>
        <View style={sp.header}>
          <Text style={sp.title}>{title}</Text>
          <TouchableOpacity onPress={() => onSelect(null)} style={sp.closeBtn}>
            <Ionicons name="close" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={sp.searchRow}>
          <Ionicons name="search-outline" size={16} color={Colors.textMuted} />
          <TextInput style={sp.searchInput} placeholder="Search..." placeholderTextColor={Colors.textMuted}
            value={q} onChangeText={setQ} autoFocus autoCorrect={false}
            autoComplete="new-password" textContentType="none" importantForAutofill="no" />
        </View>
        {loading ? <View style={sp.center}><ActivityIndicator color={Colors.accent} /></View> : (
          <FlatList data={filtered} keyExtractor={i => String(i.id)}
            renderItem={({ item }) => (
              <TouchableOpacity style={sp.item} onPress={() => onSelect(item)}>
                <Text style={sp.itemLabel}>{item.label}</Text>
                {item.sub ? <Text style={sp.itemSub}>{item.sub}</Text> : null}
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: Colors.border }} />}
            ListEmptyComponent={<View style={sp.center}><Text style={{ color: Colors.textMuted }}>No results</Text></View>}
          />
        )}
      </View>
    </Modal>
  );
}
const sp = StyleSheet.create({
  container:  { flex: 1, backgroundColor: Colors.background },
  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 60 : 24, paddingBottom: 12, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title:      { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  closeBtn:   { padding: 4 },
  searchRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.surface, margin: 12, paddingHorizontal: 12, height: 44, borderRadius: 8, borderWidth: 1, borderColor: Colors.border },
  searchInput:{ flex: 1, fontSize: 15, color: Colors.textPrimary, ...Platform.select({ web: { outlineStyle: 'none' } }) },
  item:       { paddingHorizontal: 16, paddingVertical: 14, backgroundColor: Colors.surface },
  itemLabel:  { fontSize: 15, color: Colors.textPrimary, fontWeight: '500' },
  itemSub:    { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
});

// ── Main Component ────────────────────────────────────────────────────────────

export default function PurchaseFormSheet({ visible, onClose, onSaved, purchase }: Props) {
  const isEdit = !!purchase;
  const isWeb  = Platform.OS === 'web';

  // Form fields
  const [vendorId,      setVendorId]      = useState<number | null>(null);
  const [vendorName,    setVendorName]    = useState('');
  const [purchaseDate,  setPurchaseDate]  = useState('');
  const [deliveryDate,  setDeliveryDate]  = useState('');
  const [isGst,         setIsGst]         = useState(true);
  const [status,        setStatus]        = useState('draft');
  const [notes,         setNotes]         = useState('');
  const [paidAmount,    setPaidAmount]    = useState('0');
  const [saving,        setSaving]        = useState(false);
  const [saveError,     setSaveError]     = useState('');

  // Items
  const [items,               setItems]               = useState<LocalItem[]>([]);
  const [editingItemKey,      setEditingItemKey]       = useState<string | null>(null);
  const [showInventoryPicker, setShowInventoryPicker]  = useState(false);
  const [inventoryList,       setInventoryList]        = useState<SearchItem[]>([]);
  const [loadingInventory,    setLoadingInventory]     = useState(false);

  // Vendor picker
  const [vendors,        setVendors]        = useState<SearchItem[]>([]);
  const [loadingVendors, setLoadingVendors] = useState(false);
  const [showVendorPicker, setShowVendorPicker] = useState(false);
  const [showVendorCreate, setShowVendorCreate] = useState(false);

  // Reset / pre-fill
  useEffect(() => {
    if (!visible) return;
    if (purchase) {
      setVendorId(purchase.vendor?.id ?? null);
      setVendorName(purchase.vendor?.name ?? '');
      setPurchaseDate(isoToDisplay(purchase.purchaseDate));
      setDeliveryDate(purchase.deliveryDate ? isoToDisplay(purchase.deliveryDate) : '');
      setIsGst(purchase.isGst);
      setStatus(purchase.status);
      setNotes(purchase.notes ?? '');
      setPaidAmount(parseFloat(purchase.paidAmount).toString());
      setItems((purchase.items ?? []).map(it => ({
        key:            String(it.id),
        dbId:           it.id,
        stockedQty:     parseFloat(it.stockedQty),
        inventoryId:    it.inventory?.id ?? null,
        inventoryLabel: it.inventory ? `${it.inventory.itemCode} - ${it.inventory.name}` : '',
        inventoryUnit:  it.inventory?.unit ?? it.unit ?? 'pcs',
        description:    it.description ?? '',
        unit:           it.unit ?? 'pcs',
        quantity:       parseFloat(it.quantity).toString(),
        unitPrice:      parseFloat(it.unitPrice).toString(),
        taxRate:        parseFloat(it.taxRate).toString(),
      })));
    } else {
      setVendorId(null);   setVendorName('');
      setPurchaseDate(today()); setDeliveryDate('');
      setIsGst(true);      setStatus('draft');
      setNotes('');        setPaidAmount('0');
      setItems([]);
    }
    setSaveError('');
  }, [visible, purchase]);

  // Derived totals
  const subtotal  = items.reduce((s, it) => s + lineTotal(it), 0);
  const taxAmount = items.reduce((s, it) => s + lineTax(it), 0);
  const grandTotal = subtotal + (isGst ? taxAmount : 0);

  // Pickers
  const openVendorPicker = () => {
    if (!vendors.length) {
      setLoadingVendors(true);
      vendorsApi.list({ limit: 500, active: true })
        .then(({ data }) => setVendors(data.vendors.map(v => ({ id: v.id, label: v.name, sub: v.vendorCode }))))
        .catch(() => {}).finally(() => setLoadingVendors(false));
    }
    setShowVendorPicker(true);
  };

  const handleVendorCreated = (newId?: number) => {
    setShowVendorCreate(false);
    if (!newId) return;
    vendorsApi.detail(newId).then(({ data }) => {
      setVendorId(data.vendor.id);
      setVendorName(data.vendor.name);
      setVendors(prev => prev.some(v => v.id === data.vendor.id)
        ? prev
        : [{ id: data.vendor.id, label: data.vendor.name, sub: data.vendor.vendorCode }, ...prev]);
    }).catch(() => {});
  };

  const openInventoryPicker = (key: string) => {
    setEditingItemKey(key);
    if (!inventoryList.length) {
      setLoadingInventory(true);
      inventoryApi.list({ limit: 500, active: true })
        .then(({ data }) => setInventoryList(
          data.inventory.map(inv => ({ id: inv.id, label: `${inv.itemCode} - ${inv.name}`, sub: inv.unit }))
        ))
        .catch(() => {}).finally(() => setLoadingInventory(false));
    }
    setShowInventoryPicker(true);
  };

  // Item helpers — new items start as free-text; user can optionally link to inventory
  const addItem = () => setItems(p => [...p, makeItem()]);
  const removeItem = (key: string) => setItems(p => p.filter(it => it.key !== key));
  const updateItem = (key: string, patch: Partial<LocalItem>) =>
    setItems(p => p.map(it => it.key === key ? { ...it, ...patch } : it));

  // Save
  const handleSave = async () => {
    setSaveError('');
    const isoDate = displayToIso(purchaseDate);
    if (!isoDate) { setSaveError('Enter purchase date as DD/MM/YYYY'); return; }
    const isoDelivery = deliveryDate ? displayToIso(deliveryDate) : null;
    if (deliveryDate && !isoDelivery) { setSaveError('Enter delivery date as DD/MM/YYYY'); return; }

    const payload = {
      vendorId:     vendorId ?? undefined,
      purchaseDate: isoDate,
      deliveryDate: isoDelivery ?? undefined,
      isGst,
      status,
      notes,
      paidAmount,
      items: items.map(it => ({
        ...(it.dbId !== null ? { id: it.dbId } : {}),
        inventoryId: it.inventoryId ?? undefined,
        description: it.inventoryId ? '' : it.description,
        unit:        it.inventoryId ? (it.inventoryUnit || 'pcs') : (it.unit || 'pcs'),
        quantity:    it.quantity  || '1',
        unitPrice:   it.unitPrice || '0',
        taxRate:     it.taxRate   || '0',
      })),
    };

    setSaving(true);
    try {
      if (isEdit) {
        await purchasesApi.update(purchase!.id, payload);
        onSaved();
      } else {
        const { data } = await purchasesApi.create(payload);
        onSaved(data.purchase.id);
      }
      onClose();
    } catch (e: any) {
      setSaveError(e?.response?.data?.error || 'Could not save purchase. Check your connection and try again.');
    } finally { setSaving(false); }
  };

  // Shared pickers JSX
  const pickers = (
    <>
      <SearchPickerModal visible={showVendorPicker} title="Select Vendor" items={vendors} loading={loadingVendors}
        onSelect={item => { if (item) { setVendorId(item.id); setVendorName(item.label); } setShowVendorPicker(false); }} />
      <SearchPickerModal visible={showInventoryPicker} title="Select Inventory Item" items={inventoryList} loading={loadingInventory}
        onSelect={item => {
          if (item && editingItemKey) {
            const patch = { inventoryId: item.id, inventoryLabel: item.label, inventoryUnit: item.sub ?? 'pcs' };
            const existing = items.find(i => i.key === editingItemKey);
            if (existing?.stockedQty && existing.stockedQty > 0) {
              // Stocked item: only update the label/unit display, not the link itself
              updateItem(editingItemKey, { inventoryLabel: item.label, inventoryUnit: item.sub ?? 'pcs' });
            } else {
              updateItem(editingItemKey, patch);
            }
          }
          setShowInventoryPicker(false); setEditingItemKey(null);
        }} />
      <VendorFormSheet
        visible={showVendorCreate}
        vendor={null}
        onClose={() => setShowVendorCreate(false)}
        onSaved={handleVendorCreated}
      />
    </>
  );

  // ══════════════════════════════════════════════════════════════════════════
  //  WEB LAYOUT
  // ══════════════════════════════════════════════════════════════════════════
  if (isWeb) {
    const SCREEN_H = Dimensions.get('window').height;

    return (
      <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
        <View style={w.backdrop}>
          <View style={[w.dialog, { maxHeight: SCREEN_H * 0.92 }]}>

            {/* Dialog header */}
            <View style={w.header}>
              <View style={w.headerLeft}>
                <Ionicons name="cart-outline" size={18} color={Colors.accent} />
                <Text style={w.headerTitle}>{isEdit ? 'Edit Purchase' : 'New Purchase'}</Text>
                {isEdit && purchase && <Text style={w.headerSub}>{purchase.purchaseNo}</Text>}
              </View>
              <View style={w.headerActions}>
                <TouchableOpacity style={w.cancelBtn} onPress={onClose} disabled={saving}>
                  <Text style={w.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[w.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                  {saving ? <ActivityIndicator size="small" color="#111" /> : (
                    <><Ionicons name="checkmark" size={15} color="#111" /><Text style={w.saveText}>{isEdit ? 'Update Purchase' : 'Create Purchase'}</Text></>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView contentContainerStyle={w.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

              {/* Error banner */}
              {saveError ? (
                <View style={w.errorBanner}>
                  <Ionicons name="alert-circle-outline" size={16} color={Colors.error} />
                  <Text style={w.errorBannerText}>{saveError}</Text>
                  <TouchableOpacity onPress={() => setSaveError('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close" size={14} color={Colors.error} />
                  </TouchableOpacity>
                </View>
              ) : null}

              {/* GST Banner */}
              <View style={w.gstBanner}>
                <View style={w.gstBannerLeft}>
                  <View style={w.gstIcon}><Ionicons name="receipt-outline" size={16} color={Colors.info} /></View>
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={w.gstBannerTitle}>GST Purchase</Text>
                      {isGst && <View style={w.gstActivePill}><Text style={w.gstActivePillText}>GST ENABLED</Text></View>}
                    </View>
                    <Text style={w.gstBannerSub}>CGST / SGST / IGST will apply to purchase items.</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={w.gstToggleLabel}>Enable GST</Text>
                  <Switch value={isGst} onValueChange={setIsGst} trackColor={{ false: Colors.border, true: Colors.info }} thumbColor="#fff" />
                </View>
              </View>

              {/* Two-column fields */}
              <View style={w.fieldsGrid}>

                {/* LEFT COLUMN */}
                <View style={w.col}>
                  <Text style={w.label}>Vendor <Text style={w.opt}>(optional)</Text></Text>
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <TouchableOpacity style={[w.pickerField, { flex: 1 }]} onPress={openVendorPicker}>
                      <Text style={vendorId ? w.pickerValue : w.pickerPlaceholder} numberOfLines={1}>
                        {vendorId ? vendorName : 'Select vendor...'}
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                        {vendorId && (
                          <TouchableOpacity onPress={() => { setVendorId(null); setVendorName(''); }}>
                            <Ionicons name="close-circle" size={15} color={Colors.textMuted} />
                          </TouchableOpacity>
                        )}
                        <Ionicons name="chevron-down" size={15} color={Colors.textMuted} />
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity style={w.addVendorBtn} onPress={() => setShowVendorCreate(true)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                      <Ionicons name="add" size={18} color={Colors.accent} />
                    </TouchableOpacity>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={w.label}>Purchase Date <Text style={w.req}>*</Text></Text>
                      <View style={w.inputRow}>
                        <Ionicons name="calendar-outline" size={13} color={Colors.textMuted} />
                        <TextInput style={[w.input, { flex: 1 }]} value={purchaseDate} onChangeText={t => setPurchaseDate(autoDate(t))} placeholder="DD/MM/YYYY" placeholderTextColor={Colors.textMuted} keyboardType="numeric" maxLength={10} />
                      </View>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={w.label}>Delivery Date <Text style={w.opt}>(optional)</Text></Text>
                      <View style={w.inputRow}>
                        <Ionicons name="calendar-outline" size={13} color={Colors.textMuted} />
                        <TextInput style={[w.input, { flex: 1 }]} value={deliveryDate} onChangeText={t => setDeliveryDate(autoDate(t))} placeholder="DD/MM/YYYY" placeholderTextColor={Colors.textMuted} keyboardType="numeric" maxLength={10} />
                      </View>
                    </View>
                  </View>

                  <Text style={w.label}>Paid Amount</Text>
                  <View style={[w.inputRow, { marginBottom: 0 }]}>
                    <Text style={w.rupeePrefix}>₹</Text>
                    <TextInput style={[w.input, { flex: 1 }]} value={paidAmount} onChangeText={setPaidAmount} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={Colors.textMuted} />
                  </View>
                  <Text style={w.fieldHint}>Payment status is derived automatically.</Text>
                </View>

                {/* RIGHT COLUMN */}
                <View style={w.col}>
                  <Text style={w.label}>Status</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                    {STATUSES.map(st => (
                      <TouchableOpacity key={st.key} style={[w.chip, status === st.key && w.chipActive]} onPress={() => setStatus(st.key)}>
                        <Text style={[w.chipText, status === st.key && w.chipTextActive]}>{st.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={w.label}>Notes <Text style={w.opt}>(optional)</Text></Text>
                  <TextInput style={w.textArea} value={notes} onChangeText={setNotes} placeholder="Add notes..." placeholderTextColor={Colors.textMuted} multiline numberOfLines={4} textAlignVertical="top" />
                </View>
              </View>

              <View style={w.divider} />

              {/* Items table */}
              <View style={w.itemsSection}>
                <View style={w.itemsSectionHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="list-outline" size={16} color={Colors.textSecondary} />
                    <Text style={w.sectionTitle}>Purchase Items</Text>
                    <Text style={w.itemCount}>{items.length} item{items.length !== 1 ? 's' : ''}</Text>
                  </View>
                  <TouchableOpacity style={w.addItemBtn} onPress={addItem}>
                    <Ionicons name="add" size={14} color="#111" />
                    <Text style={w.addItemBtnText}>Add Item</Text>
                  </TouchableOpacity>
                </View>

                <View style={w.table}>
                  {/* Header row */}
                  <View style={[w.tableRow, w.tableHeaderRow]}>
                    <Text style={[w.thCell, { flex: 2 }]}>Item</Text>
                    <Text style={[w.thCell, { width: 90 }]}>Qty</Text>
                    <Text style={[w.thCell, { width: 150 }]}>Unit Price</Text>
                    {isGst && <Text style={[w.thCell, { width: 90 }]}>Tax %</Text>}
                    {isGst && <Text style={[w.thCell, { width: 110, textAlign: 'right' }]}>Tax</Text>}
                    <Text style={[w.thCell, w.thRight, { width: 120 }]}>Total</Text>
                    <View style={{ width: 44 }} />
                  </View>

                  {items.length === 0 && (
                    <View style={w.tableEmpty}>
                      <Ionicons name="cube-outline" size={24} color={Colors.textMuted} />
                      <Text style={w.tableEmptyText}>No items yet. Click "Add Item" to begin.</Text>
                    </View>
                  )}

                  {items.map((item, idx) => {
                    const lt      = lineTotal(item);
                    const tax     = lineTax(item);
                    const locked  = item.stockedQty > 0;
                    return (
                      <View key={item.key} style={[w.tableRow, idx % 2 === 0 && w.tableRowAlt]}>

                        {/* Item cell — inventory picker OR free-text description */}
                        <View style={[{ flex: 2, minWidth: 0 }, w.tdCell]}>
                          {item.inventoryId ? (
                            /* Linked to inventory */
                            <TouchableOpacity style={w.invPickerWeb} onPress={() => !locked && openInventoryPicker(item.key)}>
                              <View style={{ flex: 1, minWidth: 0 }}>
                                <Text style={w.invValueWeb} numberOfLines={1}>{item.inventoryLabel}</Text>
                                {locked
                                  ? <Text style={w.stockedTagWeb}>Stocked: {item.stockedQty} {item.inventoryUnit}</Text>
                                  : <Text style={w.unitTagWeb} numberOfLines={1}>{item.inventoryUnit}</Text>
                                }
                              </View>
                              {!locked && (
                                <TouchableOpacity onPress={() => updateItem(item.key, { inventoryId: null, inventoryLabel: '' })} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                                  <Ionicons name="close-circle" size={13} color={Colors.textMuted} />
                                </TouchableOpacity>
                              )}
                            </TouchableOpacity>
                          ) : (
                            /* Free-text mode */
                            <View style={{ gap: 4 }}>
                              <TextInput
                                style={[w.tableInput, { minWidth: 0 }]}
                                value={item.description}
                                onChangeText={v => updateItem(item.key, { description: v })}
                                placeholder="Item description..."
                                placeholderTextColor={Colors.textMuted}
                              />
                              <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                                <TextInput
                                  style={[w.tableInput, { flex: 1, fontSize: 11 }]}
                                  value={item.unit}
                                  onChangeText={v => updateItem(item.key, { unit: v })}
                                  placeholder="Unit"
                                  placeholderTextColor={Colors.textMuted}
                                />
                                <TouchableOpacity style={w.linkInvBtn} onPress={() => openInventoryPicker(item.key)}>
                                  <Ionicons name="link-outline" size={11} color={Colors.info} />
                                  <Text style={w.linkInvBtnText}>Link</Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          )}
                        </View>

                        {/* Qty — locked when stockedQty > 0 */}
                        <View style={[{ width: 90, flexShrink: 0 }, w.tdCell]}>
                          {locked ? (
                            <View style={w.lockedCell}>
                              <Ionicons name="lock-closed-outline" size={11} color={Colors.textMuted} />
                              <Text style={w.lockedValue}>{item.quantity}</Text>
                            </View>
                          ) : (
                            <TextInput style={w.tableInput} value={item.quantity} onChangeText={v => updateItem(item.key, { quantity: v })} keyboardType="decimal-pad" placeholder="1" placeholderTextColor={Colors.textMuted} />
                          )}
                        </View>

                        {/* Unit price */}
                        <View style={[{ width: 150, flexShrink: 0 }, w.tdCell]}>
                          <View style={w.priceBox}>
                            <Text style={w.rupeePrefix}>₹</Text>
                            <TextInput style={w.priceInput} value={item.unitPrice} onChangeText={v => updateItem(item.key, { unitPrice: v })} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={Colors.textMuted} />
                          </View>
                        </View>

                        {/* Tax rate */}
                        {isGst && (
                          <View style={[{ width: 90, flexShrink: 0 }, w.tdCell]}>
                            <View style={w.taxBox}>
                              <TextInput style={w.taxInput} value={item.taxRate} onChangeText={v => updateItem(item.key, { taxRate: v })} keyboardType="decimal-pad" placeholder="18" placeholderTextColor={Colors.textMuted} />
                              <Text style={w.taxPct}>%</Text>
                            </View>
                          </View>
                        )}

                        {/* Tax amount */}
                        {isGst && (
                          <View style={[{ width: 110, flexShrink: 0 }, w.tdCell]}>
                            <Text style={w.taxAmtWeb} numberOfLines={1}>{fmtCurrency(tax)}</Text>
                          </View>
                        )}

                        {/* Line total */}
                        <View style={[{ width: 120, flexShrink: 0 }, w.tdCell]}>
                          <Text style={w.lineTotalWeb} numberOfLines={1}>{fmtCurrency(lt + (isGst ? tax : 0))}</Text>
                        </View>

                        {/* Delete — disabled for locked items */}
                        <View style={[{ width: 44, flexShrink: 0 }, w.tdCell]}>
                          {locked ? (
                            <Ionicons name="lock-closed-outline" size={15} color={Colors.border} />
                          ) : (
                            <TouchableOpacity onPress={() => removeItem(item.key)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                              <Ionicons name="trash-outline" size={16} color={Colors.error} />
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    );
                  })}

                  {/* Grand total row */}
                  {items.length > 0 && (
                    <View style={w.grandTotalRow}>
                      <View style={{ flex: 1, flexDirection: 'row', gap: 20 }}>
                        <Text style={w.grandTotalHint}>Subtotal: <Text style={w.grandTotalHintVal}>{fmtCurrency(subtotal)}</Text></Text>
                        {isGst && <Text style={w.grandTotalHint}>GST: <Text style={w.grandTotalHintVal}>{fmtCurrency(taxAmount)}</Text></Text>}
                      </View>
                      <Text style={w.grandTotalLabel}>TOTAL</Text>
                      <Text style={w.grandTotalValue}>{fmtCurrency(grandTotal)}</Text>
                    </View>
                  )}
                </View>
              </View>
            </ScrollView>
          </View>

          {pickers}
        </View>
      </Modal>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  MOBILE LAYOUT
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.header}>
          <Text style={s.title}>{isEdit ? 'Edit Purchase' : 'New Purchase'}</Text>
          <TouchableOpacity onPress={onClose} style={s.closeBtn}>
            <Ionicons name="close" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1, backgroundColor: Colors.background }} contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">

          {/* GST Banner */}
          <View style={s.gstBanner}>
            <View style={s.gstBannerLeft}>
              <View style={s.gstIcon}><Ionicons name="receipt-outline" size={14} color={Colors.info} /></View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={s.gstBannerTitle}>GST Purchase</Text>
                  {isGst && <View style={s.gstActivePill}><Text style={s.gstActivePillText}>ON</Text></View>}
                </View>
                <Text style={s.gstBannerSub}>CGST / SGST / IGST will apply to purchase items.</Text>
              </View>
            </View>
            <Switch value={isGst} onValueChange={setIsGst} trackColor={{ false: Colors.border, true: Colors.info }} thumbColor="#fff" />
          </View>

          {/* Vendor */}
          <Text style={s.label}>Vendor <Text style={s.opt}>(optional)</Text></Text>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <TouchableOpacity style={[s.pickerField, { flex: 1 }]} onPress={openVendorPicker}>
              <Text style={vendorId ? s.pickerValue : s.pickerPlaceholder} numberOfLines={1}>{vendorId ? vendorName : 'Select vendor...'}</Text>
              <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                {vendorId && <TouchableOpacity onPress={() => { setVendorId(null); setVendorName(''); }}><Ionicons name="close-circle" size={16} color={Colors.textMuted} /></TouchableOpacity>}
                <Ionicons name="chevron-down" size={16} color={Colors.textMuted} />
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={s.addVendorBtn} onPress={() => setShowVendorCreate(true)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
              <Ionicons name="add" size={20} color={Colors.accent} />
            </TouchableOpacity>
          </View>

          {/* Dates */}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Purchase Date <Text style={s.req}>*</Text></Text>
              <View style={s.inputRow}><Ionicons name="calendar-outline" size={14} color={Colors.textMuted} /><TextInput style={[s.input, { flex: 1 }]} value={purchaseDate} onChangeText={t => setPurchaseDate(autoDate(t))} placeholder="DD/MM/YYYY" placeholderTextColor={Colors.textMuted} keyboardType="numeric" maxLength={10} /></View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Delivery <Text style={s.opt}>(opt)</Text></Text>
              <View style={s.inputRow}><Ionicons name="calendar-outline" size={14} color={Colors.textMuted} /><TextInput style={[s.input, { flex: 1 }]} value={deliveryDate} onChangeText={t => setDeliveryDate(autoDate(t))} placeholder="DD/MM/YYYY" placeholderTextColor={Colors.textMuted} keyboardType="numeric" maxLength={10} /></View>
            </View>
          </View>

          {/* Items section */}
          <View style={s.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="list-outline" size={16} color={Colors.textSecondary} />
              <Text style={s.sectionTitle}>Purchase Items</Text>
            </View>
            <TouchableOpacity style={s.addItemBtn} onPress={addItem}>
              <Ionicons name="add" size={14} color="#111" />
              <Text style={s.addItemBtnText}>Add Item</Text>
            </TouchableOpacity>
          </View>

          {items.length === 0 && (
            <View style={s.emptyItems}><Text style={s.emptyItemsText}>No items added yet. Tap "Add Item" to start.</Text></View>
          )}

          {items.map(item => {
            const lt     = lineTotal(item);
            const tax    = lineTax(item);
            const locked = item.stockedQty > 0;
            return (
              <View key={item.key} style={[s.itemCard, locked && s.itemCardLocked]}>
                {/* Item name row */}
                <View style={s.itemRow}>
                  {item.inventoryId ? (
                    /* Linked to inventory */
                    <TouchableOpacity style={[s.invPicker, { flex: 1 }]} onPress={() => !locked && openInventoryPicker(item.key)}>
                      <Ionicons name="cube-outline" size={14} color={Colors.success} />
                      <Text style={s.invPickerValue} numberOfLines={1}>{item.inventoryLabel}</Text>
                      {!locked && <Ionicons name="chevron-down" size={13} color={Colors.textMuted} />}
                    </TouchableOpacity>
                  ) : (
                    /* Free-text description */
                    <TextInput
                      style={[s.descInput, { flex: 1 }]}
                      value={item.description}
                      onChangeText={v => updateItem(item.key, { description: v })}
                      placeholder="Item description..."
                      placeholderTextColor={Colors.textMuted}
                    />
                  )}
                  {locked ? (
                    <View style={s.itemDeleteBtn}><Ionicons name="lock-closed-outline" size={15} color={Colors.textMuted} /></View>
                  ) : (
                    <TouchableOpacity onPress={() => removeItem(item.key)} style={s.itemDeleteBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="trash-outline" size={16} color={Colors.error} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Sub-row: link/unlink inventory + unit */}
                <View style={s.itemRow}>
                  {item.inventoryId ? (
                    locked ? (
                      <Text style={s.stockedTag}>Stocked: {item.stockedQty} {item.inventoryUnit} — qty locked</Text>
                    ) : (
                      <TouchableOpacity style={s.unlinkBtn} onPress={() => updateItem(item.key, { inventoryId: null, inventoryLabel: '' })}>
                        <Ionicons name="close-circle-outline" size={12} color={Colors.textMuted} />
                        <Text style={s.unlinkBtnText}>Unlink inventory</Text>
                      </TouchableOpacity>
                    )
                  ) : (
                    <>
                      <TextInput style={[s.descInput, { width: 70 }]} value={item.unit} onChangeText={v => updateItem(item.key, { unit: v })} placeholder="Unit" placeholderTextColor={Colors.textMuted} />
                      <TouchableOpacity style={s.linkInvBtn} onPress={() => openInventoryPicker(item.key)}>
                        <Ionicons name="link-outline" size={12} color={Colors.info} />
                        <Text style={s.linkInvBtnText}>Link inventory</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>

                <View style={s.itemRow}>
                  <View style={[s.numericField, { flex: 1 }, locked && s.numericFieldLocked]}>
                    <Text style={s.numericLabel}>Qty</Text>
                    {locked ? (
                      <Text style={s.lockedNumericValue}>{item.quantity}</Text>
                    ) : (
                      <TextInput style={s.numericInput} value={item.quantity} onChangeText={v => updateItem(item.key, { quantity: v })} keyboardType="decimal-pad" placeholder="1" placeholderTextColor={Colors.textMuted} />
                    )}
                  </View>
                  <View style={[s.numericField, { flex: 1.4 }]}>
                    <Text style={s.numericLabel}>Unit Price</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={s.rupee}>₹</Text>
                      <TextInput style={[s.numericInput, { flex: 1 }]} value={item.unitPrice} onChangeText={v => updateItem(item.key, { unitPrice: v })} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={Colors.textMuted} />
                    </View>
                  </View>
                  {isGst && (
                    <View style={[s.numericField, { flex: 0.9 }]}>
                      <Text style={s.numericLabel}>Tax %</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TextInput style={[s.numericInput, { flex: 1 }]} value={item.taxRate} onChangeText={v => updateItem(item.key, { taxRate: v })} keyboardType="decimal-pad" placeholder="18" placeholderTextColor={Colors.textMuted} />
                        <Text style={s.pctSuffix}>%</Text>
                      </View>
                    </View>
                  )}
                  <View style={s.totalBox}>
                    <Text style={s.totalLabel}>Total</Text>
                    <Text style={s.totalValue}>{fmtCurrency(lt + (isGst ? tax : 0))}</Text>
                    {isGst && tax > 0 && <Text style={s.taxLine}>+{fmtCurrency(tax)} GST</Text>}
                  </View>
                </View>
              </View>
            );
          })}

          {items.length > 0 && (
            <View style={s.grandTotalRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.subtotalHint}>Subtotal: {fmtCurrency(subtotal)}</Text>
                {isGst && <Text style={s.subtotalHint}>GST: {fmtCurrency(taxAmount)}</Text>}
              </View>
              <View style={s.grandTotalBox}>
                <Text style={s.grandTotalLabel}>GRAND TOTAL</Text>
                <Text style={s.grandTotalValue}>{fmtCurrency(grandTotal)}</Text>
              </View>
            </View>
          )}

          {/* Status */}
          <Text style={[s.label, { marginTop: 16 }]}>Status</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', gap: 8, paddingRight: 16 }}>
              {STATUSES.map(st => (
                <TouchableOpacity key={st.key} style={[s.chip, status === st.key && s.chipActive]} onPress={() => setStatus(st.key)}>
                  <Text style={[s.chipText, status === st.key && s.chipTextActive]}>{st.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Paid amount */}
          <Text style={s.label}>Paid Amount</Text>
          <View style={s.inputRow}>
            <Text style={s.rupee}>₹</Text>
            <TextInput style={[s.input, { flex: 1 }]} value={paidAmount} onChangeText={setPaidAmount} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={Colors.textMuted} />
          </View>

          {/* Notes */}
          <Text style={s.label}>Notes <Text style={s.opt}>(optional)</Text></Text>
          <TextInput style={s.textArea} value={notes} onChangeText={setNotes} placeholder="Add notes..." placeholderTextColor={Colors.textMuted} multiline numberOfLines={3} textAlignVertical="top" />

          {saveError ? (
            <View style={s.errorBanner}>
              <Ionicons name="alert-circle-outline" size={15} color={Colors.error} />
              <Text style={s.errorBannerText}>{saveError}</Text>
            </View>
          ) : null}

          <View style={s.actions}>
            <TouchableOpacity style={s.cancelBtn} onPress={onClose} disabled={saving}>
              <Text style={s.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color="#111" /> : <Text style={s.saveText}>{isEdit ? 'Update Purchase' : 'Save Purchase'}</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>

        {pickers}
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Web styles ────────────────────────────────────────────────────────────────
const w = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  dialog:   { width: '100%', maxWidth: 980, backgroundColor: Colors.background, borderRadius: 12, overflow: 'hidden', elevation: 32, ...Platform.select({ web: { boxShadow: '0 12px 32px rgba(0,0,0,0.35)' }, default: { shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.35, shadowRadius: 32 } }) },

  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 14, backgroundColor: Colors.primary, borderBottomWidth: 1, borderBottomColor: Colors.primaryLight },
  headerLeft:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle:   { fontSize: 17, fontWeight: '700', color: '#fff' },
  headerSub:     { fontSize: 12, color: Colors.accent, fontWeight: '600', marginLeft: 4 },
  headerActions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  cancelBtn:     { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  cancelText:    { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.85)' },
  saveBtn:       { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 18, paddingVertical: 8, borderRadius: 6, backgroundColor: Colors.accent },
  saveText:      { fontSize: 13, fontWeight: '700', color: '#111' },

  body: { padding: 24, gap: 0 },

  // Error banner
  errorBanner:     { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.errorLight, borderWidth: 1, borderColor: Colors.error + '40', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16 },
  errorBannerText: { flex: 1, fontSize: 13, color: Colors.error, fontWeight: '600' },

  // GST Banner
  gstBanner:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#EFF8FF', borderWidth: 1, borderColor: '#BFDBFE', borderRadius: 8, padding: 14, marginBottom: 20 },
  gstBannerLeft:  { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  gstIcon:        { width: 34, height: 34, borderRadius: 8, backgroundColor: '#DBEAFE', justifyContent: 'center', alignItems: 'center' },
  gstBannerTitle: { fontSize: 14, fontWeight: '700', color: Colors.info },
  gstBannerSub:   { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  gstActivePill:  { backgroundColor: Colors.info, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  gstActivePillText: { fontSize: 10, fontWeight: '800', color: '#fff' },
  gstToggleLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },

  // 2-column grid
  fieldsGrid: { flexDirection: 'row', gap: 24, marginBottom: 4 },
  col:        { flex: 1 },
  label:      { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, marginBottom: 5, marginTop: 2 },
  opt:        { fontWeight: '400', color: Colors.textMuted },
  req:        { color: Colors.error },
  fieldHint:  { fontSize: 11, color: Colors.textMuted, marginTop: 4, marginBottom: 12 },

  pickerField:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 },
  addVendorBtn:     { width: 40, height: 40, borderRadius: 6, borderWidth: 1, borderColor: Colors.accent, backgroundColor: Colors.accentLight, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  pickerValue:      { fontSize: 14, color: Colors.textPrimary, flex: 1 },
  pickerPlaceholder:{ fontSize: 14, color: Colors.textMuted, flex: 1 },
  inputRow:         { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 6, paddingHorizontal: 10, marginBottom: 12 },
  input:            { fontSize: 14, color: Colors.textPrimary, paddingVertical: 9, ...Platform.select({ web: { outlineStyle: 'none' } }) },
  rupeePrefix:      { fontSize: 13, color: Colors.textMuted, fontWeight: '600', flexShrink: 0 },

  chip:          { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  chipActive:    { backgroundColor: Colors.accent, borderColor: Colors.accent },
  chipText:      { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  chipTextActive:{ color: '#111' },

  textArea: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10, minHeight: 80, fontSize: 14, color: Colors.textPrimary, ...Platform.select({ web: { outlineStyle: 'none' } }) },

  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 20 },

  // Items table
  itemsSection:       {},
  itemsSectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle:       { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  itemCount:          { fontSize: 12, color: Colors.textMuted, fontWeight: '500' },
  addItemBtn:         { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.accent, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 7 },
  addItemBtnText:     { fontSize: 13, fontWeight: '700', color: '#111' },

  table:          { backgroundColor: Colors.surface, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  tableHeaderRow: { backgroundColor: Colors.primary },
  tableRow:       { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: Colors.border },
  tableRowAlt:    { backgroundColor: '#FAFBFB' },
  tableEmpty:     { alignItems: 'center', paddingVertical: 32, gap: 8 },
  tableEmptyText: { fontSize: 13, color: Colors.textMuted },
  thCell:         { paddingHorizontal: 8, paddingVertical: 10, fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: 0.4 },
  thRight:        { textAlign: 'right' },
  tdCell:         { paddingHorizontal: 8, paddingVertical: 8 },

  invPickerWeb:      { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.background, borderRadius: 5, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 8, paddingVertical: 6, minHeight: 34 },
  invValueWeb:       { fontSize: 12, color: Colors.textPrimary, fontWeight: '500' },
  invPlaceholderWeb: { fontSize: 12, color: Colors.textMuted },
  unitTagWeb:        { fontSize: 10, color: Colors.textMuted, fontWeight: '600', marginTop: 2 },
  stockedTagWeb:     { fontSize: 10, color: Colors.success, fontWeight: '700', marginTop: 2 },
  lockedCell:        { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.background, borderRadius: 5, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 8, paddingVertical: 8, minHeight: 34 },
  lockedValue:       { fontSize: 13, fontWeight: '700', color: Colors.textMuted },
  linkInvBtn:        { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, borderWidth: 1, borderColor: Colors.info, backgroundColor: Colors.infoLight },
  linkInvBtnText:    { fontSize: 10, fontWeight: '700', color: Colors.info },

  tableInput: { backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, borderRadius: 5, paddingHorizontal: 8, paddingVertical: 6, fontSize: 13, color: Colors.textPrimary, minHeight: 34, ...Platform.select({ web: { outlineStyle: 'none' } }) },

  priceBox:   { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, borderRadius: 5, minHeight: 34, overflow: 'hidden' },
  priceInput: { flex: 1, minWidth: 0, textAlign: 'right', fontSize: 13, fontWeight: '600', color: Colors.textPrimary, paddingVertical: 6, paddingLeft: 4, paddingRight: 8, borderWidth: 0, backgroundColor: 'transparent', ...Platform.select({ web: { outlineStyle: 'none' } }) },

  taxBox:   { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, borderRadius: 5, minHeight: 34, overflow: 'hidden' },
  taxInput: { flex: 1, minWidth: 0, textAlign: 'right', fontSize: 13, fontWeight: '600', color: Colors.textPrimary, paddingVertical: 6, paddingLeft: 8, paddingRight: 2, borderWidth: 0, backgroundColor: 'transparent', ...Platform.select({ web: { outlineStyle: 'none' } }) },
  taxPct:   { fontSize: 13, color: Colors.textMuted, fontWeight: '600', paddingRight: 7, flexShrink: 0 },

  taxAmtWeb:   { fontSize: 13, color: Colors.info, fontWeight: '600', textAlign: 'right' },
  lineTotalWeb:{ fontSize: 13, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right' },

  grandTotalRow:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12, backgroundColor: Colors.primary, gap: 16 },
  grandTotalHint:    { fontSize: 11, color: 'rgba(255,255,255,0.5)' },
  grandTotalHintVal: { fontWeight: '700', color: 'rgba(255,255,255,0.75)' },
  grandTotalLabel:   { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.6)', letterSpacing: 0.5 },
  grandTotalValue:   { fontSize: 18, fontWeight: '800', color: Colors.accent },
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

  // Error banner
  errorBanner:     { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.errorLight, borderWidth: 1, borderColor: Colors.error + '40', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 },
  errorBannerText: { flex: 1, fontSize: 13, color: Colors.error, fontWeight: '600' },

  // GST Banner
  gstBanner:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#EFF8FF', borderWidth: 1, borderColor: '#BFDBFE', borderRadius: 10, padding: 12, marginBottom: 16, gap: 8 },
  gstBannerLeft:  { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  gstIcon:        { width: 30, height: 30, borderRadius: 6, backgroundColor: '#DBEAFE', justifyContent: 'center', alignItems: 'center' },
  gstBannerTitle: { fontSize: 13, fontWeight: '700', color: Colors.info },
  gstBannerSub:   { fontSize: 11, color: Colors.textSecondary, marginTop: 1 },
  gstActivePill:  { backgroundColor: Colors.info, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  gstActivePillText: { fontSize: 9, fontWeight: '800', color: '#fff' },

  pickerField:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 13, marginBottom: 14 },
  addVendorBtn:     { width: 44, height: 44, borderRadius: 8, borderWidth: 1, borderColor: Colors.accent, backgroundColor: Colors.accentLight, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  pickerValue:      { fontSize: 15, color: Colors.textPrimary, flex: 1 },
  pickerPlaceholder:{ fontSize: 15, color: Colors.textMuted, flex: 1 },
  inputRow:         { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: 12, marginBottom: 14 },
  input:            { fontSize: 15, color: Colors.textPrimary, paddingVertical: 11 },

  sectionHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, marginBottom: 10 },
  sectionTitle:   { fontSize: 14, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  addItemBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.accent, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 },
  addItemBtnText: { fontSize: 13, fontWeight: '700', color: '#111' },

  emptyItems:     { backgroundColor: Colors.surface, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', paddingVertical: 20, marginBottom: 12 },
  emptyItemsText: { fontSize: 13, color: Colors.textMuted },

  itemCard:      { backgroundColor: Colors.surface, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, padding: 12, marginBottom: 10, gap: 8 },
  itemRow:       { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemDeleteBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },

  invPicker:           { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.background, borderRadius: 6, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 10, paddingVertical: 8 },
  invPickerValue:      { flex: 1, fontSize: 13, color: Colors.textPrimary, fontWeight: '500' },
  invPickerPlaceholder:{ flex: 1, fontSize: 13, color: Colors.textMuted },
  unitTag:             { fontSize: 11, color: Colors.textMuted, fontWeight: '600', marginLeft: 2 },
  stockedTag:          { fontSize: 11, color: Colors.success, fontWeight: '700' },
  itemCardLocked:      { borderColor: Colors.successLight, borderWidth: 1.5 },
  numericFieldLocked:  { backgroundColor: Colors.successLight, borderColor: Colors.successLight },
  lockedNumericValue:  { fontSize: 14, fontWeight: '700', color: Colors.textMuted, paddingVertical: 2 },
  descInput:           { backgroundColor: Colors.background, borderRadius: 6, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 10, paddingVertical: 7, fontSize: 13, color: Colors.textPrimary, ...Platform.select({ web: { outlineStyle: 'none' } }) },
  linkInvBtn:          { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 4, borderWidth: 1, borderColor: Colors.info, backgroundColor: Colors.infoLight },
  linkInvBtnText:      { fontSize: 11, fontWeight: '700', color: Colors.info },
  unlinkBtn:           { flexDirection: 'row', alignItems: 'center', gap: 4 },
  unlinkBtnText:       { fontSize: 11, color: Colors.textMuted },

  numericField: { backgroundColor: Colors.background, borderRadius: 6, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 8, paddingVertical: 6 },
  numericLabel: { fontSize: 10, color: Colors.textMuted, fontWeight: '600', marginBottom: 2 },
  numericInput: { fontSize: 14, color: Colors.textPrimary, fontWeight: '600', paddingVertical: 2, ...Platform.select({ web: { outlineStyle: 'none' } }) },
  rupee:        { fontSize: 13, color: Colors.textMuted, fontWeight: '600', marginRight: 2 },
  pctSuffix:    { fontSize: 13, color: Colors.textMuted, fontWeight: '600', marginLeft: 2 },

  totalBox:   { alignItems: 'flex-end', justifyContent: 'center', minWidth: 80 },
  totalLabel: { fontSize: 10, color: Colors.textMuted, fontWeight: '600' },
  totalValue: { fontSize: 14, color: Colors.textPrimary, fontWeight: '800', marginTop: 2 },
  taxLine:    { fontSize: 10, color: Colors.info, fontWeight: '600', marginTop: 1 },

  grandTotalRow:   { backgroundColor: Colors.surface, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
  subtotalHint:    { fontSize: 11, color: Colors.textMuted, fontWeight: '500' },
  grandTotalBox:   { alignItems: 'flex-end' },
  grandTotalLabel: { fontSize: 10, fontWeight: '700', color: Colors.textMuted, letterSpacing: 0.5 },
  grandTotalValue: { fontSize: 20, fontWeight: '800', color: Colors.accent },

  chip:          { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  chipActive:    { backgroundColor: Colors.accent, borderColor: Colors.accent },
  chipText:      { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  chipTextActive:{ color: '#111' },

  textArea: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, minHeight: 80, fontSize: 14, color: Colors.textPrimary, marginBottom: 24, ...Platform.select({ web: { outlineStyle: 'none' } }) },

  actions:    { flexDirection: 'row', gap: 12 },
  cancelBtn:  { flex: 1, paddingVertical: 14, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  cancelText: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
  saveBtn:    { flex: 2, paddingVertical: 14, borderRadius: 8, backgroundColor: Colors.accent, alignItems: 'center' },
  saveText:   { fontSize: 15, fontWeight: '700', color: '#111' },
});
