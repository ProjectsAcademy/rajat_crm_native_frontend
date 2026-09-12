import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Modal,
  FlatList, ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView, Alert, Dimensions,
} from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { estimatesApi, customersApi, projectsApi, ordersApi, inventoryApi, EstimateDetail } from '../services/api';
import { Colors } from '../constants/colors';
import DatePickerModal from './DatePickerModal';

// ── Types ─────────────────────────────────────────────────────────────────────
// inventoryId is optional — same convention as InvoiceFormSheet: picking from
// inventory is a convenience (fills description + price) not a requirement,
// since an estimate line is often a quoted service with no catalog item.
interface LocalItem {
  key: string;
  inventoryId: number | null;
  inventoryLabel: string;
  description: string; quantity: string; unitPrice: string;
}
function makeItem(): LocalItem {
  return { key: `${Date.now()}-${Math.random()}`, inventoryId: null, inventoryLabel: '', description: '', quantity: '1', unitPrice: '' };
}
function lineTotal(item: LocalItem): number {
  const q = parseFloat(item.quantity  || '0');
  const p = parseFloat(item.unitPrice || '0');
  return isNaN(q) || isNaN(p) ? 0 : q * p;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSaved: (newEstimateId?: number) => void;
  estimate?: EstimateDetail | null;
}
interface SearchItem { id: number; label: string; sub?: string }

const STATUSES = [
  { key: 'draft',    label: 'Draft'    },
  { key: 'sent',     label: 'Sent'     },
  { key: 'accepted', label: 'Accepted' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'expired',  label: 'Expired'  },
];

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function isoToDisplay(iso: string | null): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('T')[0].split('-');
  return `${d}/${m}/${y}`;
}
function fmtCurrency(n: number): string {
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ── SearchPickerModal — same shape as the one in OrderFormSheet/InvoiceFormSheet,
// duplicated locally rather than shared (each form sheet is self-contained,
// matching this codebase's existing convention). ──────────────────────────────
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
export default function EstimateFormSheet({ visible, onClose, onSaved, estimate }: Props) {
  const isEdit = !!estimate;
  const isWeb  = Platform.OS === 'web';

  const [customerId,   setCustomerId]   = useState<number | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [projectId,    setProjectId]    = useState<number | null>(null);
  const [projectName,  setProjectName]  = useState('');
  // Linking an order is optional: picking one copies the order's customer,
  // project and items into this form (see onOrderSelected) — same "fast
  // path" InvoiceFormSheet offers for billing an order that already exists.
  const [orderId,      setOrderId]      = useState<number | null>(null);
  const [orderLabel,   setOrderLabel]   = useState('');
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [status,       setStatus]       = useState('draft');
  const [estimateDate, setEstimateDate] = useState('');
  const [validUntil,   setValidUntil]   = useState('');
  const [notes,        setNotes]        = useState('');
  // Off by default — percent is kept even while disabled (see schema note)
  // so toggling back on restores the last value instead of resetting to 0.
  const [discountEnabled, setDiscountEnabled] = useState(false);
  const [discountPercent, setDiscountPercent] = useState('');
  const [saving,       setSaving]       = useState(false);
  const [saveError,    setSaveError]    = useState('');

  const [items, setItems] = useState<LocalItem[]>([]);

  const [customers,        setCustomers]        = useState<SearchItem[]>([]);
  const [projects,         setProjects]         = useState<SearchItem[]>([]);
  const [orders,           setOrders]           = useState<SearchItem[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [loadingProjects,  setLoadingProjects]  = useState(false);
  const [loadingOrders,    setLoadingOrders]    = useState(false);
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [showProjectPicker,  setShowProjectPicker]  = useState(false);
  const [showOrderPicker,    setShowOrderPicker]    = useState(false);
  const [inventoryList,    setInventoryList]    = useState<SearchItem[]>([]);
  const [inventoryMap,     setInventoryMap]     = useState<Record<number, { unit: string; price: string }>>({});
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [showInventoryPicker, setShowInventoryPicker] = useState(false);
  const [editingItemKey, setEditingItemKey] = useState<string | null>(null);
  // Which date field the shared DatePickerModal is currently editing
  const [activeDateField, setActiveDateField] = useState<'estimate' | 'validUntil' | null>(null);

  useEffect(() => {
    if (!visible) return;
    if (estimate) {
      setCustomerId(estimate.customer?.id ?? null);
      setCustomerName(estimate.customer?.customerName ?? '');
      setProjectId(estimate.project?.id ?? null);
      setProjectName(estimate.project ? `${estimate.project.projectNo} · ${estimate.project.name}` : '');
      setOrderId(estimate.order?.id ?? null);
      setOrderLabel(estimate.order?.orderNo ?? '');
      setStatus(estimate.status);
      setEstimateDate(estimate.estimateDate.slice(0, 10));
      setValidUntil(estimate.validUntil.slice(0, 10));
      setNotes(estimate.notes ?? '');
      setDiscountEnabled(estimate.discountEnabled ?? false);
      setDiscountPercent(estimate.discountPercent && parseFloat(estimate.discountPercent) > 0 ? estimate.discountPercent : '');
      setItems((estimate.items ?? []).map(it => ({
        key: String(it.id),
        inventoryId: it.inventory?.id ?? null,
        inventoryLabel: it.inventory ? `${it.inventory.itemCode} - ${it.inventory.name}` : '',
        description: it.description ?? '',
        quantity: parseFloat(it.quantity).toString(),
        unitPrice: parseFloat(it.unitPrice).toString(),
      })));
    } else {
      setCustomerId(null); setCustomerName('');
      setProjectId(null);  setProjectName('');
      setOrderId(null);    setOrderLabel('');
      setStatus('draft');
      setEstimateDate(todayIso()); setValidUntil('');
      setNotes('');
      setDiscountEnabled(false); setDiscountPercent('');
      setItems([]);
    }
    setSaveError('');
  }, [visible, estimate]);

  const subtotal = items.reduce((s, it) => s + lineTotal(it), 0);
  const discountPct = parseFloat(discountPercent || '0') || 0;
  const discountAmount = discountEnabled && discountPct > 0 ? subtotal * (discountPct / 100) : 0;
  const grandTotal = subtotal - discountAmount;

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
  const openOrderPicker = () => {
    if (!orders.length) {
      setLoadingOrders(true);
      ordersApi.list({ limit: 500 })
        .then(({ data }) => setOrders(data.orders.map(o => ({ id: o.id, label: o.orderNo, sub: o.customer?.customerName ?? '' }))))
        .catch(() => {}).finally(() => setLoadingOrders(false));
    }
    setShowOrderPicker(true);
  };
  const openInventoryPicker = (key: string) => {
    setEditingItemKey(key);
    if (!inventoryList.length) {
      setLoadingInventory(true);
      inventoryApi.list({ limit: 500, active: true })
        .then(({ data }) => {
          const map: Record<number, { unit: string; price: string }> = {};
          const list = data.inventory.map(inv => {
            map[inv.id] = { unit: inv.unit, price: inv.unitPrice };
            return { id: inv.id, label: `${inv.itemCode} - ${inv.name}`, sub: inv.unit };
          });
          setInventoryList(list);
          setInventoryMap(map);
        })
        .catch(() => {}).finally(() => setLoadingInventory(false));
    }
    setShowInventoryPicker(true);
  };

  // Same confirm convention used elsewhere (InvoiceFormSheet's order-copy,
  // the delete flows): window.confirm on web (synchronous), Alert.alert with
  // Cancel/destructive on native.
  const confirmAsync = (title: string, message: string): Promise<boolean> => {
    if (Platform.OS === 'web') return Promise.resolve(window.confirm(message));
    return new Promise((resolve) => {
      Alert.alert(title, message, [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Replace', style: 'destructive', onPress: () => resolve(true) },
      ]);
    });
  };

  // Picking an order copies its customer/project and items into this
  // estimate — same "fast path" InvoiceFormSheet offers, items typed by hand
  // otherwise. Order items carry no tax rate (irrelevant here anyway —
  // estimates have no tax concept) and rental items' per-day unitPrice is
  // flattened by rentalDays, mirroring InvoiceFormSheet's own conversion.
  const onOrderSelected = async (item: SearchItem | null) => {
    setShowOrderPicker(false);
    if (!item) return;

    if (items.length > 0) {
      const ok = await confirmAsync(
        'Replace estimate items?',
        `Order ${item.label} has its own items. Replace the ${items.length} item${items.length === 1 ? '' : 's'} already on this estimate with them?`
      );
      if (!ok) { setOrderId(item.id); setOrderLabel(item.label); return; }
    }

    setLoadingOrder(true);
    try {
      const { data } = await ordersApi.detail(item.id);
      const order = data.order;
      setOrderId(order.id);
      setOrderLabel(order.orderNo);
      if (order.customer) { setCustomerId(order.customer.id); setCustomerName(order.customer.customerName); }
      if (order.project)  { setProjectId(order.project.id);  setProjectName(`${order.project.projectNo} · ${order.project.name}`); }
      setItems(order.items.map(it => {
        const days = it.isRental ? (it.rentalDays || 1) : 1;
        const unitPrice = (parseFloat(it.unitPrice || '0') || 0) * days;
        return {
          key: `order-${it.id}`,
          inventoryId: it.inventory?.id ?? null,
          inventoryLabel: it.inventory ? `${it.inventory.itemCode} - ${it.inventory.name}` : '',
          description: it.description || (it.inventory ? `${it.inventory.itemCode} - ${it.inventory.name}` : ''),
          quantity: it.quantity,
          unitPrice: unitPrice ? String(unitPrice) : '',
        };
      }));
    } catch {
      setSaveError('Could not load the selected order.');
    } finally { setLoadingOrder(false); }
  };

  const addItem = () => setItems(p => [...p, makeItem()]);
  const removeItem = (key: string) => setItems(p => p.filter(it => it.key !== key));
  const updateItem = (key: string, patch: Partial<LocalItem>) =>
    setItems(p => p.map(it => it.key === key ? { ...it, ...patch } : it));

  const handleSave = async () => {
    setSaveError('');
    if (!estimateDate) { setSaveError('Pick an estimate date'); return; }
    if (!validUntil)    { setSaveError('Pick a valid-until date'); return; }

    const itemPayload = items.map(it => ({
      inventoryId: it.inventoryId ?? undefined,
      description: it.description,
      quantity:    it.quantity  || '1',
      unitPrice:   it.unitPrice || '0',
    }));

    setSaving(true);
    try {
      if (isEdit) {
        await estimatesApi.update(estimate!.id, {
          customerId: customerId ?? null, projectId: projectId ?? null, orderId: orderId ?? null,
          status, estimateDate, validUntil, notes, items: itemPayload,
          discountEnabled, discountPercent: discountPercent || '0',
        });
        onSaved();
      } else {
        const { data } = await estimatesApi.create({
          customerId: customerId ?? undefined, projectId: projectId ?? undefined, orderId: orderId ?? undefined,
          status, estimateDate, validUntil, notes, items: itemPayload,
          discountEnabled, discountPercent: discountPercent || '0',
        });
        onSaved(data.estimate.id);
      }
      onClose();
    } catch (e: any) {
      setSaveError(e?.response?.data?.error ?? 'Could not save estimate.');
    } finally { setSaving(false); }
  };

  const pickers = (
    <>
      <SearchPickerModal visible={showCustomerPicker} title="Select Customer" items={customers} loading={loadingCustomers}
        onSelect={item => { if (item) { setCustomerId(item.id); setCustomerName(item.label); } setShowCustomerPicker(false); }} />
      <SearchPickerModal visible={showProjectPicker} title="Select Project" items={projects} loading={loadingProjects}
        onSelect={item => { if (item) { setProjectId(item.id); setProjectName(`${item.sub} · ${item.label}`); } setShowProjectPicker(false); }} />
      <SearchPickerModal visible={showOrderPicker} title="Select Order" items={orders} loading={loadingOrders}
        onSelect={onOrderSelected} />
      <SearchPickerModal visible={showInventoryPicker} title="Select Inventory Item" items={inventoryList} loading={loadingInventory}
        onSelect={item => {
          if (item && editingItemKey) {
            const extra = inventoryMap[item.id];
            const patch = { inventoryId: item.id, inventoryLabel: item.label, description: item.label, unitPrice: extra?.price ?? '' };
            if (editingItemKey === '__new__') {
              setItems(p => [...p, { ...makeItem(), ...patch }]);
            } else {
              updateItem(editingItemKey, patch);
            }
          }
          setShowInventoryPicker(false); setEditingItemKey(null);
        }} />
      <DatePickerModal
        visible={activeDateField !== null}
        title={activeDateField === 'estimate' ? 'Estimate Date' : 'Valid Until'}
        value={activeDateField === 'estimate' ? estimateDate : validUntil}
        onSelect={(iso) => {
          if (iso) { if (activeDateField === 'estimate') setEstimateDate(iso); else setValidUntil(iso); }
          setActiveDateField(null);
        }}
        onClose={() => setActiveDateField(null)}
      />
    </>
  );

  // ── Shared body — same fields/items rendered inside either wrapper below ─────────
  const formBody = (st: any) => (
    <>
      {saveError ? (
        <View style={st.errorBanner}>
          <Ionicons name="alert-circle" size={18} color={Colors.error} />
          <Text style={st.errorBannerText}>{saveError}</Text>
        </View>
      ) : null}

      <Text style={st.label}>
        Order <Text style={st.opt}>(optional — copies its customer, project and items in)</Text>
      </Text>
      <TouchableOpacity style={st.pickerField} onPress={openOrderPicker} disabled={loadingOrder}>
        <Text style={orderId ? st.pickerValue : st.pickerPlaceholder} numberOfLines={1}>
          {loadingOrder ? 'Loading order...' : orderId ? orderLabel : 'Select order...'}
        </Text>
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          {loadingOrder ? <ActivityIndicator size="small" color={Colors.accent} /> : (
            <>
              {orderId && <TouchableOpacity onPress={() => { setOrderId(null); setOrderLabel(''); }}><Ionicons name="close-circle" size={15} color={Colors.textMuted} /></TouchableOpacity>}
              <Ionicons name="chevron-down" size={15} color={Colors.textMuted} />
            </>
          )}
        </View>
      </TouchableOpacity>

      <Text style={st.label}>Customer <Text style={st.opt}>(optional)</Text></Text>
      <TouchableOpacity style={st.pickerField} onPress={openCustomerPicker}>
        <Text style={customerId ? st.pickerValue : st.pickerPlaceholder} numberOfLines={1}>{customerId ? customerName : 'Select customer...'}</Text>
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          {customerId && <TouchableOpacity onPress={() => { setCustomerId(null); setCustomerName(''); }}><Ionicons name="close-circle" size={15} color={Colors.textMuted} /></TouchableOpacity>}
          <Ionicons name="chevron-down" size={15} color={Colors.textMuted} />
        </View>
      </TouchableOpacity>

      <Text style={st.label}>Project <Text style={st.opt}>(optional)</Text></Text>
      <TouchableOpacity style={st.pickerField} onPress={openProjectPicker}>
        <Text style={projectId ? st.pickerValue : st.pickerPlaceholder} numberOfLines={1}>{projectId ? projectName : 'Select project...'}</Text>
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          {projectId && <TouchableOpacity onPress={() => { setProjectId(null); setProjectName(''); }}><Ionicons name="close-circle" size={15} color={Colors.textMuted} /></TouchableOpacity>}
          <Ionicons name="chevron-down" size={15} color={Colors.textMuted} />
        </View>
      </TouchableOpacity>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={st.label}>Estimate Date <Text style={st.req}>*</Text></Text>
          <TouchableOpacity style={st.inputRow} onPress={() => setActiveDateField('estimate')} activeOpacity={0.7}>
            <Ionicons name="calendar-outline" size={13} color={Colors.textMuted} />
            <Text style={[st.input, { flex: 1 }, !estimateDate && { color: Colors.textMuted }]}>
              {estimateDate ? isoToDisplay(estimateDate) : 'DD/MM/YYYY'}
            </Text>
            <Ionicons name="chevron-down" size={13} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={st.label}>Valid Until <Text style={st.req}>*</Text></Text>
          <TouchableOpacity style={st.inputRow} onPress={() => setActiveDateField('validUntil')} activeOpacity={0.7}>
            <Ionicons name="calendar-outline" size={13} color={Colors.textMuted} />
            <Text style={[st.input, { flex: 1 }, !validUntil && { color: Colors.textMuted }]}>
              {validUntil ? isoToDisplay(validUntil) : 'DD/MM/YYYY'}
            </Text>
            <Ionicons name="chevron-down" size={13} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      <Text style={st.label}>Status</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
        {STATUSES.map(stt => (
          <TouchableOpacity key={stt.key} style={[st.chip, status === stt.key && st.chipActive]} onPress={() => setStatus(stt.key)}>
            <Text style={[st.chipText, status === stt.key && st.chipTextActive]}>{stt.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={st.label}>Notes <Text style={st.opt}>(optional)</Text></Text>
      <TextInput style={st.textArea} value={notes} onChangeText={setNotes} placeholder="Add notes..." placeholderTextColor={Colors.textMuted} multiline numberOfLines={3} textAlignVertical="top" />

      <View style={st.divider} />

      {/* Items */}
      <View style={st.itemsHeader}>
        <Text style={st.sectionTitle}>Estimate Items</Text>
        <TouchableOpacity style={st.addBtn} onPress={addItem}>
          <Ionicons name="add" size={14} color="#111" />
          <Text style={st.addBtnText}>Add Item</Text>
        </TouchableOpacity>
      </View>

      {items.length === 0 && (
        <View style={st.empty}><Text style={st.emptyText}>No items yet. Tap "Add Item" to begin.</Text></View>
      )}

      {items.map(item => {
        const total = lineTotal(item);
        const invPickIcon = (
          <TouchableOpacity
            style={[st.invPickBtn, item.inventoryId && st.invPickBtnActive]}
            onPress={() => openInventoryPicker(item.key)}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons name="cube-outline" size={15} color={item.inventoryId ? '#111' : Colors.accent} />
          </TouchableOpacity>
        );
        const descriptionInput = (
          <TextInput style={[st.itemInput, { flex: 1, minWidth: 0 }]} value={item.description} onChangeText={v => updateItem(item.key, { description: v, inventoryId: null })} placeholder="Description, or pick from inventory" placeholderTextColor={Colors.textMuted} />
        );
        const deleteBtn = (
          <TouchableOpacity onPress={() => removeItem(item.key)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="trash-outline" size={16} color={Colors.error} />
          </TouchableOpacity>
        );
        const qtyInput = (
          <TextInput style={[st.itemInput, { width: 56, flexShrink: 0 }]} value={item.quantity} onChangeText={v => updateItem(item.key, { quantity: v })} keyboardType="decimal-pad" placeholder="Qty" placeholderTextColor={Colors.textMuted} />
        );
        const priceInput = (
          <View style={[st.priceBox, { width: 100, flexShrink: 0 }]}>
            <Text style={st.rupeePrefix}>₹</Text>
            <TextInput style={st.priceInput} value={item.unitPrice} onChangeText={v => updateItem(item.key, { unitPrice: v })} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={Colors.textMuted} />
          </View>
        );

        // Same fix as InvoiceFormSheet's identical item row — the fixed-width
        // columns (pick button + qty + price + total + delete) fit web's
        // 640px dialog fine but squeeze Description to nothing and push the
        // total/delete off a ~360-400dp phone's right edge. Stacked on native.
        if (isWeb) {
          return (
            <View key={item.key} style={st.itemRow}>
              {invPickIcon}
              {descriptionInput}
              {qtyInput}
              {priceInput}
              <Text style={st.itemTotal} numberOfLines={1}>{fmtCurrency(total)}</Text>
              {deleteBtn}
            </View>
          );
        }
        return (
          <View key={item.key} style={st.itemRowMobile}>
            <View style={st.itemRowTop}>
              {invPickIcon}
              {descriptionInput}
              {deleteBtn}
            </View>
            <View style={st.itemRowBottom}>
              {qtyInput}
              {priceInput}
              <Text style={st.itemTotalMobile} numberOfLines={1}>{fmtCurrency(total)}</Text>
            </View>
          </View>
        );
      })}

      {items.length > 0 && (
        <>
          <TouchableOpacity style={st.discountToggleRow} onPress={() => setDiscountEnabled(v => !v)}>
            <Ionicons name={discountEnabled ? 'checkbox' : 'square-outline'} size={19} color={discountEnabled ? Colors.accent : Colors.textMuted} />
            <Text style={st.discountToggleLabel}>Apply a discount</Text>
          </TouchableOpacity>
          {discountEnabled && (
            <View style={st.discountPercentRow}>
              <TextInput
                style={st.discountPercentInput}
                value={discountPercent}
                onChangeText={setDiscountPercent}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={Colors.textMuted}
              />
              <Text style={st.discountPercentSuffix}>% off subtotal</Text>
            </View>
          )}
          <View style={st.totalsBox}>
            <View style={st.totalsRow}><Text style={st.totalsLabel}>Subtotal</Text><Text style={st.totalsValue}>{fmtCurrency(subtotal)}</Text></View>
            {discountEnabled && discountAmount > 0 && (
              <View style={st.totalsRow}>
                <Text style={st.totalsLabel}>Discount ({discountPct}%)</Text>
                <Text style={[st.totalsValue, { color: Colors.error }]}>−{fmtCurrency(discountAmount)}</Text>
              </View>
            )}
            <View style={[st.totalsRow, st.totalsGrandRow]}>
              <Text style={st.totalsGrandLabel}>TOTAL</Text>
              <Text style={st.totalsGrandValue}>{fmtCurrency(grandTotal)}</Text>
            </View>
          </View>
        </>
      )}
    </>
  );

  // ── Web dialog ──────────────────────────────────────────────────────────────
  if (isWeb) {
    const SCREEN_H = Dimensions.get('window').height;
    return (
      <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
        <View style={w.backdrop}>
          <View style={[w.dialog, { maxHeight: SCREEN_H * 0.92 }]}>
            <View style={w.header}>
              <View style={w.headerLeft}>
                <Ionicons name="document-outline" size={18} color={Colors.accent} />
                <Text style={w.headerTitle}>{isEdit ? 'Edit Estimate' : 'New Estimate'}</Text>
                {isEdit && estimate && <Text style={w.headerSub}>{estimate.estimateNo}</Text>}
              </View>
              <View style={w.headerActions}>
                <TouchableOpacity style={w.cancelBtn} onPress={onClose} disabled={saving}>
                  <Text style={w.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[w.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                  {saving ? <ActivityIndicator size="small" color="#111" /> : (
                    <><Ionicons name="checkmark" size={15} color="#111" /><Text style={w.saveText}>{isEdit ? 'Update Estimate' : 'Create Estimate'}</Text></>
                  )}
                </TouchableOpacity>
              </View>
            </View>
            <ScrollView contentContainerStyle={w.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {formBody(w)}
            </ScrollView>
          </View>
          {pickers}
        </View>
      </Modal>
    );
  }

  // ── Mobile ──────────────────────────────────────────────────────────────────
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.header}>
          <Text style={s.title}>{isEdit ? 'Edit Estimate' : 'New Estimate'}</Text>
          <TouchableOpacity onPress={onClose} style={s.closeBtn}>
            <Ionicons name="close" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <ScrollView style={{ flex: 1, backgroundColor: Colors.background }} contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
          {formBody(s)}
          <View style={s.actions}>
            <TouchableOpacity style={s.cancelBtn} onPress={onClose} disabled={saving}>
              <Text style={s.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color="#111" /> : <Text style={s.saveText}>{isEdit ? 'Update Estimate' : 'Create Estimate'}</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
        {pickers}
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Shared style shape used by both `w` and `s` ────────────────────────────────
const shared = {
  label: { fontSize: 12, fontWeight: '600' as const, color: Colors.textSecondary, marginBottom: 5, marginTop: 2 },
  opt: { fontWeight: '400' as const, color: Colors.textMuted },
  req: { color: Colors.error },

  errorBanner: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10, backgroundColor: Colors.errorLight, borderWidth: 1, borderColor: Colors.error + '40', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16 },
  errorBannerText: { flex: 1, fontSize: 13, color: Colors.error, fontWeight: '600' as const },

  pickerField: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 },
  pickerValue: { fontSize: 14, color: Colors.textPrimary, flex: 1 },
  pickerPlaceholder: { fontSize: 14, color: Colors.textMuted, flex: 1 },
  inputRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 7, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 6, paddingHorizontal: 10, marginBottom: 12 },
  input: { fontSize: 14, color: Colors.textPrimary, paddingVertical: 9, ...Platform.select({ web: { outlineStyle: 'none' as const } }) },
  inputBox: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, color: Colors.textPrimary, marginBottom: 12, ...Platform.select({ web: { outlineStyle: 'none' as const } }) },
  textArea: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10, minHeight: 72, fontSize: 14, color: Colors.textPrimary, marginBottom: 12, ...Platform.select({ web: { outlineStyle: 'none' as const } }) },

  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  chipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  chipText: { fontSize: 12, fontWeight: '600' as const, color: Colors.textSecondary },
  chipTextActive: { color: '#111' },

  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 16 },

  itemsHeader: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, marginBottom: 10 },
  sectionTitle: { fontSize: 12, fontWeight: '700' as const, color: Colors.textSecondary, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  addBtn: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 5, backgroundColor: Colors.accent, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 7 },
  addBtnText: { fontSize: 13, fontWeight: '700' as const, color: '#111' },

  empty: { backgroundColor: Colors.surface, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' as const, paddingVertical: 20, marginBottom: 12 },
  emptyText: { fontSize: 13, color: Colors.textMuted },

  itemRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, padding: 8, marginBottom: 8 },
  // "Pick from inventory" — fills in a plain description column when tapped;
  // fills solid once linked so it doubles as a status indicator, not just a button.
  invPickBtn: { width: 30, height: 30, borderRadius: 6, alignItems: 'center' as const, justifyContent: 'center' as const, backgroundColor: Colors.accentLight, borderWidth: 1, borderColor: Colors.accent, flexShrink: 0 },
  invPickBtnActive: { backgroundColor: Colors.accent },
  itemInput: { backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, borderRadius: 5, paddingHorizontal: 8, paddingVertical: 7, fontSize: 13, color: Colors.textPrimary, ...Platform.select({ web: { outlineStyle: 'none' as const } }) },
  priceBox: { flexDirection: 'row' as const, alignItems: 'center' as const, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, borderRadius: 5, overflow: 'hidden' as const },
  rupeePrefix: { fontSize: 12, color: Colors.textMuted, fontWeight: '600' as const, paddingLeft: 7, flexShrink: 0 },
  priceInput: { flex: 1, minWidth: 0, textAlign: 'right' as const, fontSize: 13, fontWeight: '600' as const, color: Colors.textPrimary, paddingVertical: 6, paddingLeft: 4, paddingRight: 7, borderWidth: 0, backgroundColor: 'transparent', ...Platform.select({ web: { outlineStyle: 'none' as const } }) },
  itemTotal: { width: 84, fontSize: 13, fontWeight: '700' as const, color: Colors.textPrimary, textAlign: 'right' as const, flexShrink: 0 },

  // Mobile-only stacked item card — see the isWeb branch above for why.
  itemRowMobile: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, padding: 8, marginBottom: 8, gap: 8 },
  itemRowTop:    { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8 },
  itemRowBottom: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8 },
  itemTotalMobile: { flex: 1, minWidth: 0, fontSize: 14, fontWeight: '700' as const, color: Colors.textPrimary, textAlign: 'right' as const },

  discountToggleRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8, paddingVertical: 6 },
  discountToggleLabel: { fontSize: 13, fontWeight: '600' as const, color: Colors.textPrimary },
  discountPercentRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8, marginTop: 6, marginBottom: 4 },
  discountPercentInput: { width: 70, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, fontWeight: '600' as const, color: Colors.textPrimary, textAlign: 'right' as const, ...Platform.select({ web: { outlineStyle: 'none' as const } }) },
  discountPercentSuffix: { fontSize: 12, color: Colors.textSecondary },
  totalsBox: { backgroundColor: Colors.primary, borderRadius: 8, padding: 12, marginTop: 4 },
  totalsRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, paddingVertical: 3 },
  totalsLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  totalsValue: { fontSize: 12, color: '#fff', fontWeight: '600' as const },
  totalsGrandRow: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)', marginTop: 4, paddingTop: 8 },
  totalsGrandLabel: { fontSize: 12, fontWeight: '700' as const, color: 'rgba(255,255,255,0.85)', letterSpacing: 0.5 },
  totalsGrandValue: { fontSize: 17, fontWeight: '800' as const, color: '#E65100' },
};

// ── Web styles ───────────────────────────────────────────────────────────────────
const w = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  dialog:   { width: '100%', maxWidth: 640, backgroundColor: Colors.background, borderRadius: 12, overflow: 'hidden', elevation: 32, ...Platform.select({ web: { boxShadow: '0 12px 32px rgba(0,0,0,0.35)' }, default: { shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.35, shadowRadius: 32 } }) },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 14, backgroundColor: Colors.primary, borderBottomWidth: 1, borderBottomColor: Colors.primaryLight },
  headerLeft:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle:   { fontSize: 17, fontWeight: '700', color: '#fff' },
  headerSub:     { fontSize: 12, color: Colors.accent, fontWeight: '600', marginLeft: 4 },
  headerActions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  cancelBtn:     { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  cancelText:    { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.85)' },
  saveBtn:       { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 18, paddingVertical: 8, borderRadius: 6, backgroundColor: Colors.accent },
  saveText:      { fontSize: 13, fontWeight: '700', color: '#111' },
  body: { padding: 24 },
  ...shared,
});

// ── Mobile styles ────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  header:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 60 : 24, paddingBottom: 14, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title:    { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  closeBtn: { padding: 4 },
  body:     { padding: 16, paddingBottom: 48 },
  actions:    { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn:  { flex: 1, paddingVertical: 14, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  cancelText: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
  saveBtn:    { flex: 2, paddingVertical: 14, borderRadius: 8, backgroundColor: Colors.accent, alignItems: 'center' },
  saveText:   { fontSize: 15, fontWeight: '700', color: '#111' },
  ...shared,
});
