import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Modal,
  FlatList, ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView, Alert, Dimensions,
} from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { invoicesApi, customersApi, vendorsApi, projectsApi, InvoiceDetail } from '../services/api';
import { Colors } from '../constants/colors';

// ── Types ─────────────────────────────────────────────────────────────────────
interface LocalItem { key: string; description: string; quantity: string; unitPrice: string; taxRate: string }
function makeItem(): LocalItem {
  return { key: `${Date.now()}-${Math.random()}`, description: '', quantity: '1', unitPrice: '', taxRate: '18' };
}
function lineTotal(item: LocalItem): number {
  const q = parseFloat(item.quantity  || '0');
  const p = parseFloat(item.unitPrice || '0');
  return isNaN(q) || isNaN(p) ? 0 : q * p;
}
function lineTax(item: LocalItem): number {
  return lineTotal(item) * (parseFloat(item.taxRate || '0') / 100);
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSaved: (newInvoiceId?: number) => void;
  invoice?: InvoiceDetail | null;
}
interface SearchItem { id: number; label: string; sub?: string }

const TYPES = [
  { key: 'sales',    label: 'Sales'    },
  { key: 'purchase', label: 'Purchase' },
];
const STATUSES = [
  { key: 'draft',     label: 'Draft'     },
  { key: 'sent',      label: 'Sent'      },
  { key: 'paid',      label: 'Paid'      },
  { key: 'overdue',   label: 'Overdue'   },
  { key: 'cancelled', label: 'Cancelled' },
];

// ── Date helpers ─────────────────────────────────────────────────────────────────
function today(): string {
  const d = new Date();
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}
function isoToDisplay(iso: string | null): string {
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
export default function InvoiceFormSheet({ visible, onClose, onSaved, invoice }: Props) {
  const isEdit = !!invoice;
  const isWeb  = Platform.OS === 'web';

  const [customerId,   setCustomerId]   = useState<number | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [vendorId,      setVendorId]      = useState<number | null>(null);
  const [vendorName,    setVendorName]    = useState('');
  const [projectId,    setProjectId]    = useState<number | null>(null);
  const [projectName,  setProjectName]  = useState('');
  const [invoiceType,  setInvoiceType]  = useState('sales');
  const [status,       setStatus]       = useState('draft');
  const [invoiceDate,  setInvoiceDate]  = useState('');
  const [dueDate,      setDueDate]      = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [notes,        setNotes]        = useState('');
  const [saving,       setSaving]       = useState(false);
  const [saveError,    setSaveError]    = useState('');

  const [items, setItems] = useState<LocalItem[]>([]);

  const [customers,        setCustomers]        = useState<SearchItem[]>([]);
  const [vendors,          setVendors]          = useState<SearchItem[]>([]);
  const [projects,         setProjects]         = useState<SearchItem[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [loadingVendors,   setLoadingVendors]   = useState(false);
  const [loadingProjects,  setLoadingProjects]  = useState(false);
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [showVendorPicker,   setShowVendorPicker]   = useState(false);
  const [showProjectPicker,  setShowProjectPicker]  = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (invoice) {
      setCustomerId(invoice.customer?.id ?? null);
      setCustomerName(invoice.customer?.customerName ?? '');
      setVendorId(invoice.vendor?.id ?? null);
      setVendorName(invoice.vendor?.name ?? '');
      setProjectId(invoice.project?.id ?? null);
      setProjectName(invoice.project ? `${invoice.project.projectNo} · ${invoice.project.name}` : '');
      setInvoiceType(invoice.invoiceType);
      setStatus(invoice.status);
      setInvoiceDate(isoToDisplay(invoice.invoiceDate));
      setDueDate(isoToDisplay(invoice.dueDate));
      setPaymentTerms((invoice as any).paymentTerms ?? '');
      setNotes(invoice.notes ?? '');
      setItems((invoice.items ?? []).map(it => ({
        key: String(it.id),
        description: it.description ?? '',
        quantity: parseFloat(it.quantity).toString(),
        unitPrice: parseFloat(it.unitPrice).toString(),
        taxRate: parseFloat(it.taxRate).toString(),
      })));
    } else {
      setCustomerId(null); setCustomerName('');
      setVendorId(null);   setVendorName('');
      setProjectId(null);  setProjectName('');
      setInvoiceType('sales'); setStatus('draft');
      setInvoiceDate(today()); setDueDate('');
      setPaymentTerms(''); setNotes('');
      setItems([]);
    }
    setSaveError('');
  }, [visible, invoice]);

  const subtotal = items.reduce((s, it) => s + lineTotal(it), 0);
  const taxTotal  = items.reduce((s, it) => s + lineTax(it), 0);
  const grandTotal = subtotal + taxTotal;

  const openCustomerPicker = () => {
    if (!customers.length) {
      setLoadingCustomers(true);
      customersApi.list({ limit: 500, active: true })
        .then(({ data }) => setCustomers(data.customers.map(c => ({ id: c.id, label: c.customerName, sub: c.phone }))))
        .catch(() => {}).finally(() => setLoadingCustomers(false));
    }
    setShowCustomerPicker(true);
  };
  const openVendorPicker = () => {
    if (!vendors.length) {
      setLoadingVendors(true);
      vendorsApi.list({ limit: 500, active: true })
        .then(({ data }) => setVendors(data.vendors.map(v => ({ id: v.id, label: v.name, sub: v.phone }))))
        .catch(() => {}).finally(() => setLoadingVendors(false));
    }
    setShowVendorPicker(true);
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

  const addItem = () => setItems(p => [...p, makeItem()]);
  const removeItem = (key: string) => setItems(p => p.filter(it => it.key !== key));
  const updateItem = (key: string, patch: Partial<LocalItem>) =>
    setItems(p => p.map(it => it.key === key ? { ...it, ...patch } : it));

  const handleSave = async () => {
    setSaveError('');
    const isoInvoiceDate = displayToIso(invoiceDate);
    if (!isoInvoiceDate) { setSaveError('Enter invoice date as DD/MM/YYYY'); return; }
    const isoDueDate = displayToIso(dueDate);
    if (!isoDueDate) { setSaveError('Enter due date as DD/MM/YYYY'); return; }

    const itemPayload = items.map(it => ({
      description: it.description,
      quantity:    it.quantity  || '1',
      unitPrice:   it.unitPrice || '0',
      taxRate:     it.taxRate   || '0',
    }));

    setSaving(true);
    try {
      if (isEdit) {
        await invoicesApi.update(invoice!.id, {
          customerId: customerId ?? null, vendorId: vendorId ?? null, projectId: projectId ?? null,
          invoiceType, status, invoiceDate: isoInvoiceDate, dueDate: isoDueDate,
          paymentTerms, notes, items: itemPayload,
        });
        onSaved();
      } else {
        const { data } = await invoicesApi.create({
          customerId: customerId ?? undefined, vendorId: vendorId ?? undefined, projectId: projectId ?? undefined,
          invoiceType, status, invoiceDate: isoInvoiceDate, dueDate: isoDueDate,
          paymentTerms, notes, items: itemPayload,
        });
        onSaved(data.invoice.id);
      }
      onClose();
    } catch (e: any) {
      setSaveError(e?.response?.data?.error ?? 'Could not save invoice.');
    } finally { setSaving(false); }
  };

  const pickers = (
    <>
      <SearchPickerModal visible={showCustomerPicker} title="Select Customer" items={customers} loading={loadingCustomers}
        onSelect={item => { if (item) { setCustomerId(item.id); setCustomerName(item.label); } setShowCustomerPicker(false); }} />
      <SearchPickerModal visible={showVendorPicker} title="Select Vendor" items={vendors} loading={loadingVendors}
        onSelect={item => { if (item) { setVendorId(item.id); setVendorName(item.label); } setShowVendorPicker(false); }} />
      <SearchPickerModal visible={showProjectPicker} title="Select Project" items={projects} loading={loadingProjects}
        onSelect={item => { if (item) { setProjectId(item.id); setProjectName(`${item.sub} · ${item.label}`); } setShowProjectPicker(false); }} />
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

      <Text style={st.label}>Invoice Type</Text>
      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
        {TYPES.map(t => (
          <TouchableOpacity key={t.key} style={[st.chip, invoiceType === t.key && st.chipActive]} onPress={() => setInvoiceType(t.key)}>
            <Text style={[st.chipText, invoiceType === t.key && st.chipTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={st.label}>Customer <Text style={st.opt}>(optional)</Text></Text>
      <TouchableOpacity style={st.pickerField} onPress={openCustomerPicker}>
        <Text style={customerId ? st.pickerValue : st.pickerPlaceholder} numberOfLines={1}>{customerId ? customerName : 'Select customer...'}</Text>
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          {customerId && <TouchableOpacity onPress={() => { setCustomerId(null); setCustomerName(''); }}><Ionicons name="close-circle" size={15} color={Colors.textMuted} /></TouchableOpacity>}
          <Ionicons name="chevron-down" size={15} color={Colors.textMuted} />
        </View>
      </TouchableOpacity>

      <Text style={st.label}>Vendor <Text style={st.opt}>(optional)</Text></Text>
      <TouchableOpacity style={st.pickerField} onPress={openVendorPicker}>
        <Text style={vendorId ? st.pickerValue : st.pickerPlaceholder} numberOfLines={1}>{vendorId ? vendorName : 'Select vendor...'}</Text>
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          {vendorId && <TouchableOpacity onPress={() => { setVendorId(null); setVendorName(''); }}><Ionicons name="close-circle" size={15} color={Colors.textMuted} /></TouchableOpacity>}
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
          <Text style={st.label}>Invoice Date <Text style={st.req}>*</Text></Text>
          <View style={st.inputRow}>
            <Ionicons name="calendar-outline" size={13} color={Colors.textMuted} />
            <TextInput style={[st.input, { flex: 1 }]} value={invoiceDate} onChangeText={t => setInvoiceDate(autoDate(t))} placeholder="DD/MM/YYYY" placeholderTextColor={Colors.textMuted} keyboardType="numeric" maxLength={10} />
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={st.label}>Due Date <Text style={st.req}>*</Text></Text>
          <View style={st.inputRow}>
            <Ionicons name="calendar-outline" size={13} color={Colors.textMuted} />
            <TextInput style={[st.input, { flex: 1 }]} value={dueDate} onChangeText={t => setDueDate(autoDate(t))} placeholder="DD/MM/YYYY" placeholderTextColor={Colors.textMuted} keyboardType="numeric" maxLength={10} />
          </View>
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

      <Text style={st.label}>Payment Terms <Text style={st.opt}>(optional)</Text></Text>
      <TextInput style={st.inputBox} value={paymentTerms} onChangeText={setPaymentTerms} placeholder="e.g. Net 15" placeholderTextColor={Colors.textMuted} />

      <Text style={st.label}>Notes <Text style={st.opt}>(optional)</Text></Text>
      <TextInput style={st.textArea} value={notes} onChangeText={setNotes} placeholder="Add notes..." placeholderTextColor={Colors.textMuted} multiline numberOfLines={3} textAlignVertical="top" />

      <View style={st.divider} />

      {/* Items */}
      <View style={st.itemsHeader}>
        <Text style={st.sectionTitle}>Invoice Items</Text>
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
        return (
          <View key={item.key} style={st.itemRow}>
            <TextInput style={[st.itemInput, { flex: 1.6, minWidth: 0 }]} value={item.description} onChangeText={v => updateItem(item.key, { description: v })} placeholder="Description" placeholderTextColor={Colors.textMuted} />
            <TextInput style={[st.itemInput, { width: 56, flexShrink: 0 }]} value={item.quantity} onChangeText={v => updateItem(item.key, { quantity: v })} keyboardType="decimal-pad" placeholder="Qty" placeholderTextColor={Colors.textMuted} />
            <View style={[st.priceBox, { width: 96, flexShrink: 0 }]}>
              <Text style={st.rupeePrefix}>₹</Text>
              <TextInput style={st.priceInput} value={item.unitPrice} onChangeText={v => updateItem(item.key, { unitPrice: v })} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={Colors.textMuted} />
            </View>
            <View style={[st.taxBox, { width: 60, flexShrink: 0 }]}>
              <TextInput style={st.taxInput} value={item.taxRate} onChangeText={v => updateItem(item.key, { taxRate: v })} keyboardType="decimal-pad" placeholder="18" placeholderTextColor={Colors.textMuted} />
              <Text style={st.taxSuffix}>%</Text>
            </View>
            <Text style={st.itemTotal} numberOfLines={1}>{fmtCurrency(total)}</Text>
            <TouchableOpacity onPress={() => removeItem(item.key)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="trash-outline" size={16} color={Colors.error} />
            </TouchableOpacity>
          </View>
        );
      })}

      {items.length > 0 && (
        <View style={st.totalsBox}>
          <View style={st.totalsRow}><Text style={st.totalsLabel}>Subtotal</Text><Text style={st.totalsValue}>{fmtCurrency(subtotal)}</Text></View>
          <View style={st.totalsRow}><Text style={st.totalsLabel}>Tax</Text><Text style={st.totalsValue}>{fmtCurrency(taxTotal)}</Text></View>
          <View style={[st.totalsRow, st.totalsGrandRow]}>
            <Text style={st.totalsGrandLabel}>TOTAL</Text>
            <Text style={st.totalsGrandValue}>{fmtCurrency(grandTotal)}</Text>
          </View>
        </View>
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
                <Ionicons name="document-text-outline" size={18} color={Colors.accent} />
                <Text style={w.headerTitle}>{isEdit ? 'Edit Invoice' : 'New Invoice'}</Text>
                {isEdit && invoice && <Text style={w.headerSub}>{invoice.invoiceNo}</Text>}
              </View>
              <View style={w.headerActions}>
                <TouchableOpacity style={w.cancelBtn} onPress={onClose} disabled={saving}>
                  <Text style={w.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[w.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                  {saving ? <ActivityIndicator size="small" color="#111" /> : (
                    <><Ionicons name="checkmark" size={15} color="#111" /><Text style={w.saveText}>{isEdit ? 'Update Invoice' : 'Create Invoice'}</Text></>
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
          <Text style={s.title}>{isEdit ? 'Edit Invoice' : 'New Invoice'}</Text>
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
              {saving ? <ActivityIndicator size="small" color="#111" /> : <Text style={s.saveText}>{isEdit ? 'Update Invoice' : 'Create Invoice'}</Text>}
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
  itemInput: { backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, borderRadius: 5, paddingHorizontal: 8, paddingVertical: 7, fontSize: 13, color: Colors.textPrimary, ...Platform.select({ web: { outlineStyle: 'none' as const } }) },
  priceBox: { flexDirection: 'row' as const, alignItems: 'center' as const, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, borderRadius: 5, overflow: 'hidden' as const },
  rupeePrefix: { fontSize: 12, color: Colors.textMuted, fontWeight: '600' as const, paddingLeft: 7, flexShrink: 0 },
  priceInput: { flex: 1, minWidth: 0, textAlign: 'right' as const, fontSize: 13, fontWeight: '600' as const, color: Colors.textPrimary, paddingVertical: 6, paddingLeft: 4, paddingRight: 7, borderWidth: 0, backgroundColor: 'transparent', ...Platform.select({ web: { outlineStyle: 'none' as const } }) },
  taxBox: { flexDirection: 'row' as const, alignItems: 'center' as const, backgroundColor: Colors.accentLight, borderWidth: 1, borderColor: Colors.accent, borderRadius: 5, overflow: 'hidden' as const },
  taxInput: { flex: 1, minWidth: 0, textAlign: 'right' as const, fontSize: 13, fontWeight: '700' as const, color: Colors.accentDark, paddingVertical: 6, paddingLeft: 4, borderWidth: 0, backgroundColor: 'transparent', ...Platform.select({ web: { outlineStyle: 'none' as const } }) },
  taxSuffix: { fontSize: 11, fontWeight: '700' as const, color: Colors.accentDark, paddingRight: 6, flexShrink: 0 },
  itemTotal: { width: 84, fontSize: 13, fontWeight: '700' as const, color: Colors.textPrimary, textAlign: 'right' as const, flexShrink: 0 },

  totalsBox: { backgroundColor: Colors.primary, borderRadius: 8, padding: 12, marginTop: 4 },
  totalsRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, paddingVertical: 3 },
  totalsLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  totalsValue: { fontSize: 12, color: '#fff', fontWeight: '600' as const },
  totalsGrandRow: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)', marginTop: 4, paddingTop: 8 },
  totalsGrandLabel: { fontSize: 12, fontWeight: '700' as const, color: 'rgba(255,255,255,0.85)', letterSpacing: 0.5 },
  totalsGrandValue: { fontSize: 17, fontWeight: '800' as const, color: Colors.accent },
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
