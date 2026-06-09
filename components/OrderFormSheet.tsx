import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Modal,
  FlatList, ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView, Alert, Dimensions,
} from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ordersApi, customersApi, projectsApi, inventoryApi, OrderDetail } from '../services/api';
import { Colors } from '../constants/colors';

// ── Types ───────────────────────────────────────────────────────────────────────
interface LocalItem {
  key: string;
  inventoryId: number | null;
  inventoryLabel: string;
  inventoryUnit: string;
  inventoryStock: number | null;
  description: string;
  quantity: string;
  unitPrice: string;
  isRental: boolean;
  rentalDays: string;
}
function makeItem(): LocalItem {
  return {
    key: `${Date.now()}-${Math.random()}`,
    inventoryId: null, inventoryLabel: '', inventoryUnit: 'pcs', inventoryStock: null,
    description: '', quantity: '1', unitPrice: '', isRental: true, rentalDays: '1',
  };
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSaved: (newOrderId?: number) => void;
  order?: OrderDetail | null;
}
interface SearchItem { id: number; label: string; sub?: string }
interface InvExtra   { unit: string; stock: number; price: string }

// ── Constants ───────────────────────────────────────────────────────────────────
const STATUSES = [
  { key: 'pending',     label: 'Pending'     },
  { key: 'confirmed',   label: 'Confirmed'   },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'ready',       label: 'Ready'       },
  { key: 'delivered',   label: 'Delivered'   },
  { key: 'cancelled',   label: 'Cancelled'   },
];

// ── Date helpers ─────────────────────────────────────────────────────────────────
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
  const q = parseFloat(item.quantity  || '0');
  const p = parseFloat(item.unitPrice || '0');
  const d = item.isRental ? (parseInt(item.rentalDays || '1') || 1) : 1;
  return isNaN(q) || isNaN(p) ? 0 : q * p * d;
}

// ── SearchPickerModal ────────────────────────────────────────────────────────────
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

// ── Main Component ───────────────────────────────────────────────────────────────
export default function OrderFormSheet({ visible, onClose, onSaved, order }: Props) {
  const isEdit = !!order;
  const isWeb  = Platform.OS === 'web';

  // Order fields
  const [customerId,   setCustomerId]   = useState<number | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [projectId,    setProjectId]    = useState<number | null>(null);
  const [projectName,  setProjectName]  = useState('');
  const [orderDate,    setOrderDate]    = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [status,       setStatus]       = useState('pending');
  const [notes,        setNotes]        = useState('');
  const [saving,       setSaving]       = useState(false);

  // Items
  const [items,               setItems]               = useState<LocalItem[]>([]);
  const [editingItemKey,      setEditingItemKey]      = useState<string | null>(null);
  const [showInventoryPicker, setShowInventoryPicker] = useState(false);
  const [inventoryList,       setInventoryList]       = useState<SearchItem[]>([]);
  const [inventoryMap,        setInventoryMap]        = useState<Record<number, InvExtra>>({});
  const [loadingInventory,    setLoadingInventory]    = useState(false);

  // Pickers
  const [customers,        setCustomers]        = useState<SearchItem[]>([]);
  const [projects,         setProjects]         = useState<SearchItem[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [loadingProjects,  setLoadingProjects]  = useState(false);
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [showProjectPicker,  setShowProjectPicker]  = useState(false);

  // Reset / pre-fill
  useEffect(() => {
    if (!visible) return;
    if (order) {
      setCustomerId(order.customer?.id ?? null);
      setCustomerName(order.customer?.customerName ?? '');
      setProjectId(order.project?.id ?? null);
      setProjectName(order.project ? `${order.project.projectNo} · ${order.project.name}` : '');
      setOrderDate(isoToDisplay(order.orderDate));
      setDeliveryDate(order.deliveryDate ? isoToDisplay(order.deliveryDate) : '');
      setStatus(order.status);
      setNotes(order.notes ?? '');
      setItems((order.items ?? []).map(it => ({
        key:            String(it.id),
        inventoryId:    it.inventory?.id ?? null,
        inventoryLabel: it.inventory ? `${it.inventory.itemCode} - ${it.inventory.name}` : '',
        inventoryUnit:  it.inventory?.unit ?? 'pcs',
        inventoryStock: null,
        description:    it.description ?? '',
        quantity:       parseFloat(it.quantity).toString(),
        unitPrice:      parseFloat(it.unitPrice).toString(),
        isRental:       it.isRental,
        rentalDays:     String(it.rentalDays ?? 1),
      })));
    } else {
      setCustomerId(null); setCustomerName('');
      setProjectId(null);  setProjectName('');
      setOrderDate(today()); setDeliveryDate('');
      setStatus('pending'); setNotes('');
      setItems([]);
    }
  }, [visible, order]);

  const grandTotal = items.reduce((s, it) => s + lineTotal(it), 0);

  // Pickers
  const openCustomerPicker = () => {
    if (!customers.length) {
      setLoadingCustomers(true);
      customersApi.list({ limit: 500, active: true })
        .then(({ data }) => setCustomers(data.customers.map(c => ({ id: c.id, label: c.customerName, sub: c.phone }))))
        .catch(() => {}).finally(() => setLoadingCustomers(false));
    }
    setShowCustomerPicker(true);
  };
  const openProjectPicker = () => {
    if (!projects.length) {
      setLoadingProjects(true);
      projectsApi.list({ limit: 500 })
        .then(({ data }) => setProjects(data.projects.map(p => ({ id: p.id, label: p.name, sub: p.projectNo }))))
        .catch(() => {}).finally(() => setLoadingProjects(false));
    }
    setShowProjectPicker(true);
  };
  const openInventoryPicker = (key: string) => {
    setEditingItemKey(key);
    if (!inventoryList.length) {
      setLoadingInventory(true);
      inventoryApi.list({ limit: 500, active: true })
        .then(({ data }) => {
          const map: Record<number, InvExtra> = {};
          const list = data.inventory.map(inv => {
            map[inv.id] = { unit: inv.unit, stock: inv.currentStock, price: inv.unitPrice };
            return { id: inv.id, label: `${inv.itemCode} - ${inv.name}`, sub: `Avail: ${inv.currentStock} ${inv.unit}` };
          });
          setInventoryList(list);
          setInventoryMap(map);
        })
        .catch(() => {}).finally(() => setLoadingInventory(false));
    }
    setShowInventoryPicker(true);
  };

  // Item helpers
  const addItem = () => {
    // Open picker directly — item is only created after inventory is selected.
    // This prevents blank/empty rows appearing in the list.
    openInventoryPicker('__new__');
  };
  const removeItem = (key: string) => setItems(p => p.filter(it => it.key !== key));
  const updateItem = (key: string, patch: Partial<LocalItem>) =>
    setItems(p => p.map(it => it.key === key ? { ...it, ...patch } : it));

  const updateQty = (key: string, value: string) => {
    const item = items.find(it => it.key === key);
    if (!item) return;
    const qty = parseFloat(value);
    if (item.inventoryStock !== null && !isNaN(qty) && qty > item.inventoryStock) {
      Alert.alert('Exceeds stock', `Maximum available: ${item.inventoryStock} ${item.inventoryUnit}`);
      updateItem(key, { quantity: String(item.inventoryStock) });
      return;
    }
    updateItem(key, { quantity: value });
  };

  // Save
  const handleSave = async () => {
    const isoDate = displayToIso(orderDate);
    if (!isoDate) { Alert.alert('Invalid date', 'Enter order date as DD/MM/YYYY'); return; }
    const isoDelivery = deliveryDate ? displayToIso(deliveryDate) : null;
    if (deliveryDate && !isoDelivery) { Alert.alert('Invalid date', 'Enter delivery date as DD/MM/YYYY'); return; }

    const itemPayload = items.map(it => ({
      inventoryId: it.inventoryId ?? undefined,
      description: it.description,
      quantity:    it.quantity   || '1',
      unitPrice:   it.unitPrice  || '0',
      isRental:    it.isRental,
      rentalDays:  it.isRental ? (parseInt(it.rentalDays || '1') || 1) : 1,
    }));

    setSaving(true);
    try {
      if (isEdit) {
        await ordersApi.update(order!.id, { customerId: customerId ?? null, projectId: projectId ?? null, orderDate: isoDate, deliveryDate: isoDelivery, status, notes, items: itemPayload });
        onSaved();
      } else {
        const { data } = await ordersApi.create({ customerId: customerId ?? undefined, projectId: projectId ?? undefined, orderDate: isoDate, deliveryDate: isoDelivery ?? undefined, status, notes, items: itemPayload });
        onSaved(data.order.id);
      }
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error || 'Could not save order.');
    } finally { setSaving(false); }
  };

  // ── Shared picker JSX ────────────────────────────────────────────────────────
  const pickers = (
    <>
      <SearchPickerModal visible={showCustomerPicker} title="Select Customer" items={customers} loading={loadingCustomers}
        onSelect={item => { if (item) { setCustomerId(item.id); setCustomerName(item.label); } setShowCustomerPicker(false); }} />
      <SearchPickerModal visible={showProjectPicker} title="Select Project" items={projects} loading={loadingProjects}
        onSelect={item => { if (item) { setProjectId(item.id); setProjectName(`${item.sub} · ${item.label}`); } setShowProjectPicker(false); }} />
      <SearchPickerModal visible={showInventoryPicker} title="Select Inventory Item" items={inventoryList} loading={loadingInventory}
        onSelect={item => {
          if (item && editingItemKey) {
            const extra = inventoryMap[item.id];
            const patch = { inventoryId: item.id, inventoryLabel: item.label, inventoryUnit: extra?.unit ?? 'pcs', inventoryStock: extra?.stock ?? null, unitPrice: extra?.price ?? '' };
            if (editingItemKey === '__new__') {
              // Create a brand-new item pre-filled with this inventory
              setItems(p => [...p, { ...makeItem(), ...patch }]);
            } else {
              updateItem(editingItemKey, patch);
            }
          }
          setShowInventoryPicker(false); setEditingItemKey(null);
        }} />
    </>
  );

  // ════════════════════════════════════════════════════════════════════════════
  //  WEB LAYOUT
  // ════════════════════════════════════════════════════════════════════════════
  if (isWeb) {
    const SCREEN_H = Dimensions.get('window').height;

    return (
      <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
        <View style={w.backdrop}>
          <View style={[w.dialog, { maxHeight: SCREEN_H * 0.92 }]}>

            {/* ── Dialog header ──────────────────────────────────────────── */}
            <View style={w.header}>
              <View style={w.headerLeft}>
                <Ionicons name="receipt-outline" size={18} color={Colors.accent} />
                <Text style={w.headerTitle}>{isEdit ? 'Edit Order' : 'New Order'}</Text>
                {isEdit && order && <Text style={w.headerSub}>{(order as any).orderNo}</Text>}
              </View>
              <View style={w.headerActions}>
                <TouchableOpacity style={w.cancelBtn} onPress={onClose} disabled={saving}>
                  <Text style={w.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[w.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                  {saving ? <ActivityIndicator size="small" color="#111" /> : (
                    <><Ionicons name="checkmark" size={15} color="#111" /><Text style={w.saveText}>{isEdit ? 'Update Order' : 'Create Order'}</Text></>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView contentContainerStyle={w.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

              {/* ── Two-column fields ─────────────────────────────────────── */}
              <View style={w.fieldsGrid}>
                {/* LEFT COLUMN */}
                <View style={w.col}>
                  <Text style={w.label}>Customer</Text>
                  <TouchableOpacity style={w.pickerField} onPress={openCustomerPicker}>
                    <Text style={customerId ? w.pickerValue : w.pickerPlaceholder} numberOfLines={1}>
                      {customerId ? customerName : 'Select customer...'}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                      {customerId && (
                        <TouchableOpacity onPress={() => { setCustomerId(null); setCustomerName(''); }}>
                          <Ionicons name="close-circle" size={15} color={Colors.textMuted} />
                        </TouchableOpacity>
                      )}
                      <Ionicons name="chevron-down" size={15} color={Colors.textMuted} />
                    </View>
                  </TouchableOpacity>

                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={w.label}>Order Date <Text style={w.req}>*</Text></Text>
                      <View style={w.inputRow}>
                        <Ionicons name="calendar-outline" size={13} color={Colors.textMuted} />
                        <TextInput style={[w.input, { flex: 1 }]} value={orderDate} onChangeText={t => setOrderDate(autoDate(t))} placeholder="DD/MM/YYYY" placeholderTextColor={Colors.textMuted} keyboardType="numeric" maxLength={10} />
                      </View>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={w.label}>Delivery <Text style={w.opt}>(optional)</Text></Text>
                      <View style={w.inputRow}>
                        <Ionicons name="calendar-outline" size={13} color={Colors.textMuted} />
                        <TextInput style={[w.input, { flex: 1 }]} value={deliveryDate} onChangeText={t => setDeliveryDate(autoDate(t))} placeholder="DD/MM/YYYY" placeholderTextColor={Colors.textMuted} keyboardType="numeric" maxLength={10} />
                      </View>
                    </View>
                  </View>
                </View>

                {/* RIGHT COLUMN */}
                <View style={w.col}>
                  <Text style={w.label}>Project <Text style={w.opt}>(optional)</Text></Text>
                  <TouchableOpacity style={w.pickerField} onPress={openProjectPicker}>
                    <Text style={projectId ? w.pickerValue : w.pickerPlaceholder} numberOfLines={1}>
                      {projectId ? projectName : 'Select project...'}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                      {projectId && (
                        <TouchableOpacity onPress={() => { setProjectId(null); setProjectName(''); }}>
                          <Ionicons name="close-circle" size={15} color={Colors.textMuted} />
                        </TouchableOpacity>
                      )}
                      <Ionicons name="chevron-down" size={15} color={Colors.textMuted} />
                    </View>
                  </TouchableOpacity>

                  <Text style={w.label}>Status</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                    {STATUSES.map(st => (
                      <TouchableOpacity key={st.key} style={[w.chip, status === st.key && w.chipActive]} onPress={() => setStatus(st.key)}>
                        <Text style={[w.chipText, status === st.key && w.chipTextActive]}>{st.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={w.label}>Notes <Text style={w.opt}>(optional)</Text></Text>
                  <TextInput style={w.textArea} value={notes} onChangeText={setNotes} placeholder="Add notes..." placeholderTextColor={Colors.textMuted} multiline numberOfLines={3} textAlignVertical="top" />
                </View>
              </View>

              {/* ── Divider ───────────────────────────────────────────────── */}
              <View style={w.divider} />

              {/* ── Items table ───────────────────────────────────────────── */}
              <View style={w.itemsSection}>
                <View style={w.itemsSectionHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="list-outline" size={16} color={Colors.textSecondary} />
                    <Text style={w.sectionTitle}>Order Items</Text>
                    <Text style={w.itemCount}>{items.length} item{items.length !== 1 ? 's' : ''}</Text>
                  </View>
                  <TouchableOpacity style={w.addItemBtn} onPress={addItem}>
                    <Ionicons name="add" size={14} color="#111" />
                    <Text style={w.addItemBtnText}>Add Item</Text>
                  </TouchableOpacity>
                </View>

                {/* Table */}
                <View style={w.table}>
                  {/* Table header */}
                  <View style={[w.tableRow, w.tableHeaderRow]}>
                    <Text style={[w.thCell, { flex: 1.6 }]}>Item / Inventory</Text>
                    <Text style={[w.thCell, { flex: 1 }]}>Description</Text>
                    <Text style={[w.thCell, { width: 90 }]}>Qty</Text>
                    <Text style={[w.thCell, { width: 150 }]}>Unit Price</Text>
                    <Text style={[w.thCell, { width: 80, textAlign: 'center' }]}>Rental</Text>
                    <Text style={[w.thCell, { width: 80 }]}>Days</Text>
                    <Text style={[w.thCell, w.thRight, { width: 110 }]}>Total</Text>
                    <View style={{ width: 44 }} />
                  </View>

                  {/* Empty state */}
                  {items.length === 0 && (
                    <View style={w.tableEmpty}>
                      <Ionicons name="cube-outline" size={24} color={Colors.textMuted} />
                      <Text style={w.tableEmptyText}>No items yet. Click "Add Item" to begin.</Text>
                    </View>
                  )}

                  {/* Item rows */}
                  {items.map((item, idx) => {
                    const total = lineTotal(item);
                    const isEven = idx % 2 === 0;
                    return (
                      <View key={item.key} style={[w.tableRow, isEven && w.tableRowAlt]}>

                        {/* Inventory picker — stock tag lives INSIDE the button so all cells stay same height */}
                        <View style={[{ flex: 1.6, minWidth: 0 }, w.tdCell]}>
                          <TouchableOpacity style={w.invPickerWeb} onPress={() => openInventoryPicker(item.key)}>
                            <View style={{ flex: 1, minWidth: 0 }}>
                              <Text style={item.inventoryId ? w.invValueWeb : w.invPlaceholderWeb} numberOfLines={1}>
                                {item.inventoryId ? item.inventoryLabel : 'Select item...'}
                              </Text>
                              {item.inventoryId && item.inventoryStock !== null && (
                                <Text style={w.stockTagWeb} numberOfLines={1}>
                                  Avail: {item.inventoryStock} {item.inventoryUnit}
                                </Text>
                              )}
                            </View>
                            <Ionicons name="chevron-down" size={12} color={Colors.textMuted} style={{ flexShrink: 0 }} />
                          </TouchableOpacity>
                        </View>

                        {/* Description */}
                        <View style={[{ flex: 1, minWidth: 0 }, w.tdCell]}>
                          <TextInput
                            style={w.tableInput}
                            value={item.description}
                            onChangeText={v => updateItem(item.key, { description: v })}
                            placeholder="Optional..."
                            placeholderTextColor={Colors.textMuted}
                          />
                        </View>

                        {/* Qty — left-aligned */}
                        <View style={[{ width: 90, flexShrink: 0 }, w.tdCell]}>
                          <TextInput
                            style={w.tableInput}
                            value={item.quantity}
                            onChangeText={v => updateQty(item.key, v)}
                            keyboardType="decimal-pad"
                            placeholder="1"
                            placeholderTextColor={Colors.textMuted}
                          />
                          {item.inventoryStock !== null && (
                            <Text style={w.maxHint} numberOfLines={1}>max {item.inventoryStock}</Text>
                          )}
                        </View>

                        {/* Unit price — ₹ prefix and TextInput share one bordered box */}
                        <View style={[{ width: 150, flexShrink: 0 }, w.tdCell]}>
                          <View style={w.priceBox}>
                            <Text style={w.rupeePrefix}>₹</Text>
                            <TextInput
                              style={w.priceInput}
                              value={item.unitPrice}
                              onChangeText={v => updateItem(item.key, { unitPrice: v })}
                              keyboardType="decimal-pad"
                              placeholder="0.00"
                              placeholderTextColor={Colors.textMuted}
                            />
                          </View>
                        </View>

                        {/* Rental toggle */}
                        <View style={[{ width: 80, flexShrink: 0 }, w.tdCell]}>
                          <TouchableOpacity
                            style={[w.rentalToggle, item.isRental ? w.rentalToggleOn : w.rentalToggleOff]}
                            onPress={() => updateItem(item.key, { isRental: !item.isRental })}
                          >
                            <Text style={[w.rentalToggleText, item.isRental ? w.rentalToggleTextOn : w.rentalToggleTextOff]}>
                              {item.isRental ? 'Rental' : 'Sale'}
                            </Text>
                          </TouchableOpacity>
                        </View>

                        {/* Rental days — only active when isRental */}
                        <View style={[{ width: 80, flexShrink: 0 }, w.tdCell]}>
                          {item.isRental ? (
                            <View style={w.daysBox}>
                              <TextInput
                                style={w.daysInput}
                                value={item.rentalDays}
                                onChangeText={v => updateItem(item.key, { rentalDays: v })}
                                keyboardType="number-pad"
                                placeholder="1"
                                placeholderTextColor={Colors.textMuted}
                              />
                              <Text style={w.daysSuffix}>d</Text>
                            </View>
                          ) : (
                            <Text style={w.daysNa}>—</Text>
                          )}
                        </View>

                        {/* Line total */}
                        <View style={[{ width: 110, flexShrink: 0 }, w.tdCell]}>
                          <Text style={w.lineTotalWeb} numberOfLines={1}>{fmtCurrency(total)}</Text>
                          {item.isRental && parseInt(item.rentalDays || '1') > 1 && (
                            <Text style={w.lineTotalHint}>{item.rentalDays}d × ₹{parseFloat(item.unitPrice||'0').toFixed(0)}</Text>
                          )}
                        </View>

                        {/* Delete */}
                        <View style={[{ width: 44, flexShrink: 0 }, w.tdCell]}>
                          <TouchableOpacity onPress={() => removeItem(item.key)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <Ionicons name="trash-outline" size={16} color={Colors.error} />
                          </TouchableOpacity>
                        </View>

                      </View>
                    );
                  })}

                  {/* Grand total row */}
                  {items.length > 0 && (
                    <View style={w.grandTotalRow}>
                      <Text style={w.grandTotalHint}>Totals are calculated automatically as you enter quantities and prices.</Text>
                      <Text style={w.grandTotalLabel}>GRAND TOTAL</Text>
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

  // ════════════════════════════════════════════════════════════════════════════
  //  MOBILE LAYOUT  (unchanged from before)
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.header}>
          <Text style={s.title}>{isEdit ? 'Edit Order' : 'New Order'}</Text>
          <TouchableOpacity onPress={onClose} style={s.closeBtn}>
            <Ionicons name="close" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1, backgroundColor: Colors.background }} contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">

          <Text style={s.label}>Customer</Text>
          <TouchableOpacity style={s.pickerField} onPress={openCustomerPicker}>
            <Text style={customerId ? s.pickerValue : s.pickerPlaceholder} numberOfLines={1}>{customerId ? customerName : 'Select customer...'}</Text>
            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
              {customerId && <TouchableOpacity onPress={() => { setCustomerId(null); setCustomerName(''); }}><Ionicons name="close-circle" size={16} color={Colors.textMuted} /></TouchableOpacity>}
              <Ionicons name="chevron-down" size={16} color={Colors.textMuted} />
            </View>
          </TouchableOpacity>

          <Text style={s.label}>Project <Text style={s.opt}>(optional)</Text></Text>
          <TouchableOpacity style={s.pickerField} onPress={openProjectPicker}>
            <Text style={projectId ? s.pickerValue : s.pickerPlaceholder} numberOfLines={1}>{projectId ? projectName : 'Select project...'}</Text>
            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
              {projectId && <TouchableOpacity onPress={() => { setProjectId(null); setProjectName(''); }}><Ionicons name="close-circle" size={16} color={Colors.textMuted} /></TouchableOpacity>}
              <Ionicons name="chevron-down" size={16} color={Colors.textMuted} />
            </View>
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Order Date <Text style={s.req}>*</Text></Text>
              <View style={s.inputRow}><Ionicons name="calendar-outline" size={14} color={Colors.textMuted} /><TextInput style={[s.input, { flex: 1 }]} value={orderDate} onChangeText={t => setOrderDate(autoDate(t))} placeholder="DD/MM/YYYY" placeholderTextColor={Colors.textMuted} keyboardType="numeric" maxLength={10} /></View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Delivery <Text style={s.opt}>(opt)</Text></Text>
              <View style={s.inputRow}><Ionicons name="calendar-outline" size={14} color={Colors.textMuted} /><TextInput style={[s.input, { flex: 1 }]} value={deliveryDate} onChangeText={t => setDeliveryDate(autoDate(t))} placeholder="DD/MM/YYYY" placeholderTextColor={Colors.textMuted} keyboardType="numeric" maxLength={10} /></View>
            </View>
          </View>

          {/* Items section */}
          <View style={s.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Ionicons name="list-outline" size={16} color={Colors.textSecondary} /><Text style={s.sectionTitle}>Order Items</Text></View>
            <TouchableOpacity style={s.addItemBtn} onPress={addItem}><Ionicons name="add" size={14} color="#111" /><Text style={s.addItemBtnText}>Add Item</Text></TouchableOpacity>
          </View>

          {items.length === 0 && <View style={s.emptyItems}><Text style={s.emptyItemsText}>No items added yet. Tap "Add Item" to start.</Text></View>}

          {items.map(item => {
            const total = lineTotal(item);
            return (
              <View key={item.key} style={s.itemCard}>
                <View style={s.itemRow}>
                  <TouchableOpacity style={[s.invPicker, { flex: 1 }]} onPress={() => openInventoryPicker(item.key)}>
                    <Ionicons name="cube-outline" size={14} color={Colors.textMuted} />
                    <Text style={item.inventoryId ? s.invPickerValue : s.invPickerPlaceholder} numberOfLines={1}>{item.inventoryId ? item.inventoryLabel : 'Select inventory item...'}</Text>
                    <Ionicons name="chevron-down" size={13} color={Colors.textMuted} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => removeItem(item.key)} style={s.itemDeleteBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}><Ionicons name="trash-outline" size={16} color={Colors.error} /></TouchableOpacity>
                </View>
                {item.inventoryId && <Text style={s.stockTag}>Available: {item.inventoryStock !== null ? `${item.inventoryStock} ${item.inventoryUnit}` : item.inventoryUnit}</Text>}
                <TextInput style={s.descInput} value={item.description} onChangeText={v => updateItem(item.key, { description: v })} placeholder="Optional description" placeholderTextColor={Colors.textMuted} />
                <View style={s.itemRow}>
                  <View style={[s.numericField, { flex: 1 }]}>
                    <Text style={s.numericLabel}>Qty</Text>
                    <TextInput style={s.numericInput} value={item.quantity} onChangeText={v => updateQty(item.key, v)} keyboardType="decimal-pad" placeholder="1" placeholderTextColor={Colors.textMuted} />
                  </View>
                  <View style={[s.numericField, { flex: 1.4 }]}>
                    <Text style={s.numericLabel}>Unit Price</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}><Text style={s.rupee}>₹</Text><TextInput style={[s.numericInput, { flex: 1 }]} value={item.unitPrice} onChangeText={v => updateItem(item.key, { unitPrice: v })} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={Colors.textMuted} /></View>
                  </View>
                  <View style={s.totalBox}><Text style={s.totalLabel}>Total</Text><Text style={s.totalValue}>{fmtCurrency(isNaN(total) ? 0 : total)}</Text></View>
                </View>
                <View style={s.rentalRow}>
                  <Text style={s.rentalLabel}>Rental?</Text>
                  <TouchableOpacity style={s.radioBtn} onPress={() => updateItem(item.key, { isRental: true })}>
                    <View style={[s.radioOuter, item.isRental && s.radioOuterActive]}>{item.isRental && <View style={s.radioInner} />}</View>
                    <Text style={s.radioText}>Yes</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.radioBtn} onPress={() => updateItem(item.key, { isRental: false })}>
                    <View style={[s.radioOuter, !item.isRental && s.radioOuterActive]}>{!item.isRental && <View style={s.radioInner} />}</View>
                    <Text style={s.radioText}>No</Text>
                  </TouchableOpacity>
                  {item.isRental && (
                    <View style={s.rentalDaysField}>
                      <Text style={s.rentalLabel}>Days</Text>
                      <View style={s.rentalDaysInput}>
                        <TextInput
                          style={s.numericInput}
                          value={item.rentalDays}
                          onChangeText={v => updateItem(item.key, { rentalDays: v })}
                          keyboardType="number-pad"
                          placeholder="1"
                          placeholderTextColor={Colors.textMuted}
                        />
                      </View>
                    </View>
                  )}
                </View>
              </View>
            );
          })}

          {items.length > 0 && (
            <View style={s.grandTotalRow}>
              <Text style={s.grandTotalHint}>Totals are calculated automatically.</Text>
              <View style={s.grandTotalBox}><Text style={s.grandTotalLabel}>GRAND TOTAL</Text><Text style={s.grandTotalValue}>{fmtCurrency(grandTotal)}</Text></View>
            </View>
          )}

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

          <Text style={s.label}>Notes <Text style={s.opt}>(optional)</Text></Text>
          <TextInput style={s.textArea} value={notes} onChangeText={setNotes} placeholder="Add notes..." placeholderTextColor={Colors.textMuted} multiline numberOfLines={3} textAlignVertical="top" />

          <View style={s.actions}>
            <TouchableOpacity style={s.cancelBtn} onPress={onClose} disabled={saving}><Text style={s.cancelText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color="#111" /> : <Text style={s.saveText}>{isEdit ? 'Update Order' : 'Create Order'}</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>

        {pickers}
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Web styles ───────────────────────────────────────────────────────────────────
const w = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  dialog:   { width: '100%', maxWidth: 960, backgroundColor: Colors.background, borderRadius: 12, overflow: 'hidden', elevation: 32, ...Platform.select({ web: { boxShadow: '0 12px 32px rgba(0,0,0,0.35)' }, default: { shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.35, shadowRadius: 32 } }) },

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

  // 2-column grid
  fieldsGrid: { flexDirection: 'row', gap: 24, marginBottom: 4 },
  col:        { flex: 1 },
  label:      { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, marginBottom: 5, marginTop: 2 },
  opt:        { fontWeight: '400', color: Colors.textMuted },
  req:        { color: Colors.error },

  pickerField:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 },
  pickerValue:      { fontSize: 14, color: Colors.textPrimary, flex: 1 },
  pickerPlaceholder:{ fontSize: 14, color: Colors.textMuted, flex: 1 },
  inputRow:         { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 6, paddingHorizontal: 10, marginBottom: 12 },
  input:            { fontSize: 14, color: Colors.textPrimary, paddingVertical: 9, ...Platform.select({ web: { outlineStyle: 'none' } }) },

  chip:          { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  chipActive:    { backgroundColor: Colors.accent, borderColor: Colors.accent },
  chipText:      { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  chipTextActive:{ color: '#111' },

  textArea: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10, minHeight: 72, fontSize: 14, color: Colors.textPrimary, ...Platform.select({ web: { outlineStyle: 'none' } }) },

  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 20 },

  // Items table
  itemsSection:       { },
  itemsSectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle:       { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  itemCount:          { fontSize: 12, color: Colors.textMuted, fontWeight: '500' },
  addItemBtn:         { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.accent, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 7 },
  addItemBtnText:     { fontSize: 13, fontWeight: '700', color: '#111' },

  table:          { backgroundColor: Colors.surface, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  tableHeaderRow: { backgroundColor: Colors.primary },
  // alignItems: 'center' works now because stock tag lives inside the picker button
  // — all cells have the same single-line height so centering is consistent.
  tableRow:       { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: Colors.border },
  tableRowAlt:    { backgroundColor: '#FAFBFB' },
  tableEmpty:     { alignItems: 'center', paddingVertical: 32, gap: 8 },
  tableEmptyText: { fontSize: 13, color: Colors.textMuted },

  thCell:  { paddingHorizontal: 8, paddingVertical: 10, fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: 0.4 },
  thRight: { textAlign: 'right' },
  tdCell:  { paddingHorizontal: 8, paddingVertical: 8 },

  invPickerWeb:      { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.background, borderRadius: 5, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 8, paddingVertical: 6, minHeight: 34 },
  invValueWeb:       { fontSize: 12, color: Colors.textPrimary, fontWeight: '500' },
  invPlaceholderWeb: { fontSize: 12, color: Colors.textMuted },
  stockTagWeb:       { fontSize: 10, color: Colors.success, fontWeight: '600', marginTop: 2 },

  tableInput:  { backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, borderRadius: 5, paddingHorizontal: 8, paddingVertical: 6, fontSize: 13, color: Colors.textPrimary, minHeight: 34, ...Platform.select({ web: { outlineStyle: 'none' } }) },
  maxHint:     { fontSize: 10, color: Colors.textMuted, marginTop: 3 },

  // priceBox: one bordered container housing ₹ prefix + TextInput.
  // minWidth: 0 on priceInput is critical — prevents the HTML <input> element
  // from ignoring flex and refusing to shrink below its intrinsic width on web.
  priceBox:    { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, borderRadius: 5, minHeight: 34, overflow: 'hidden' },
  rupeePrefix: { fontSize: 13, color: Colors.textMuted, fontWeight: '600', paddingLeft: 8, flexShrink: 0 },
  priceInput:  { flex: 1, minWidth: 0, textAlign: 'right', fontSize: 13, fontWeight: '600', color: Colors.textPrimary, paddingVertical: 6, paddingLeft: 4, paddingRight: 8, borderWidth: 0, backgroundColor: 'transparent', ...Platform.select({ web: { outlineStyle: 'none' } }) },
  lineTotalWeb:{ fontSize: 13, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right' },

  rentalToggle:       { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, borderWidth: 1 },
  rentalToggleOn:     { backgroundColor: Colors.accentLight, borderColor: Colors.accent },
  rentalToggleOff:    { backgroundColor: Colors.surface, borderColor: Colors.border },
  rentalToggleText:   { fontSize: 11, fontWeight: '700' },
  rentalToggleTextOn: { color: Colors.accentDark },
  rentalToggleTextOff:{ color: Colors.textMuted },

  daysBox:     { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.accentLight, borderWidth: 1, borderColor: Colors.accent, borderRadius: 5, minHeight: 34, overflow: 'hidden' },
  daysInput:   { flex: 1, minWidth: 0, textAlign: 'center', fontSize: 13, fontWeight: '700', color: Colors.accentDark, paddingVertical: 6, paddingHorizontal: 6, borderWidth: 0, backgroundColor: 'transparent', ...Platform.select({ web: { outlineStyle: 'none' } }) },
  daysSuffix:  { fontSize: 11, fontWeight: '700', color: Colors.accentDark, paddingRight: 7, flexShrink: 0 },
  daysNa:      { fontSize: 12, color: Colors.textMuted, textAlign: 'center' },
  lineTotalHint: { fontSize: 10, color: Colors.textMuted, marginTop: 2 },

  grandTotalRow:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12, backgroundColor: Colors.primary, gap: 12 },
  grandTotalHint:  { flex: 1, fontSize: 11, color: 'rgba(255,255,255,0.5)' },
  grandTotalLabel: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.6)', letterSpacing: 0.5 },
  grandTotalValue: { fontSize: 18, fontWeight: '800', color: Colors.accent },
});

// ── Mobile styles ────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  header:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 60 : 24, paddingBottom: 14, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title:    { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  closeBtn: { padding: 4 },
  body:     { padding: 16, paddingBottom: 48 },
  label:    { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6, marginTop: 4 },
  opt:      { fontSize: 12, fontWeight: '400', color: Colors.textMuted },
  req:      { color: Colors.error },

  pickerField:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 13, marginBottom: 14 },
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
  stockTag:            { fontSize: 11, fontWeight: '600', color: Colors.success, marginLeft: 2 },
  descInput:           { backgroundColor: Colors.background, borderRadius: 6, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 10, paddingVertical: 7, fontSize: 13, color: Colors.textPrimary },

  numericField: { backgroundColor: Colors.background, borderRadius: 6, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 8, paddingVertical: 6 },
  numericLabel: { fontSize: 10, color: Colors.textMuted, fontWeight: '600', marginBottom: 2 },
  numericInput: { fontSize: 14, color: Colors.textPrimary, fontWeight: '600', paddingVertical: 2 },
  rupee:        { fontSize: 13, color: Colors.textMuted, fontWeight: '600', marginRight: 2 },
  totalBox:     { alignItems: 'flex-end', justifyContent: 'center', minWidth: 80 },
  totalLabel:   { fontSize: 10, color: Colors.textMuted, fontWeight: '600' },
  totalValue:   { fontSize: 14, color: Colors.textPrimary, fontWeight: '800', marginTop: 2 },

  rentalRow:        { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  rentalLabel:      { fontSize: 12, color: Colors.textSecondary, fontWeight: '600' },
  rentalDaysField:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 8 },
  rentalDaysInput:  { backgroundColor: Colors.accentLight, borderRadius: 6, borderWidth: 1, borderColor: Colors.accent, paddingHorizontal: 8, paddingVertical: 4, minWidth: 52 },
  radioBtn:         { flexDirection: 'row', alignItems: 'center', gap: 6 },
  radioOuter:       { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: Colors.border, justifyContent: 'center', alignItems: 'center' },
  radioOuterActive: { borderColor: Colors.accent },
  radioInner:       { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.accent },
  radioText:        { fontSize: 13, color: Colors.textSecondary },

  grandTotalRow:   { backgroundColor: Colors.surface, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  grandTotalHint:  { fontSize: 11, color: Colors.textMuted, flex: 1 },
  grandTotalBox:   { alignItems: 'flex-end' },
  grandTotalLabel: { fontSize: 10, fontWeight: '700', color: Colors.textMuted, letterSpacing: 0.5 },
  grandTotalValue: { fontSize: 20, fontWeight: '800', color: Colors.accent },

  chip:          { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  chipActive:    { backgroundColor: Colors.accent, borderColor: Colors.accent },
  chipText:      { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  chipTextActive:{ color: '#111' },

  textArea: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, minHeight: 80, fontSize: 14, color: Colors.textPrimary, marginBottom: 24 },

  actions:    { flexDirection: 'row', gap: 12 },
  cancelBtn:  { flex: 1, paddingVertical: 14, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  cancelText: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
  saveBtn:    { flex: 2, paddingVertical: 14, borderRadius: 8, backgroundColor: Colors.accent, alignItems: 'center' },
  saveText:   { fontSize: 15, fontWeight: '700', color: '#111' },
});
