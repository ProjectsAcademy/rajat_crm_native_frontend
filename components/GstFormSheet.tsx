import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Modal,
  FlatList, ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView, Dimensions, Switch,
} from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { gstApi, customersApi, vendorsApi, GstRecord } from '../services/api';
import { Colors } from '../constants/colors';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSaved: (newRecordId?: number) => void;
  record?: GstRecord | null;
}
interface SearchItem { id: number; label: string; sub?: string }

const TYPES = [
  { key: 'sales',    label: 'Sales'    },
  { key: 'purchase', label: 'Purchase' },
  { key: 'expense',  label: 'Expense'  },
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
export default function GstFormSheet({ visible, onClose, onSaved, record }: Props) {
  const isEdit = !!record;
  const isWeb  = Platform.OS === 'web';

  const [transactionType, setTransactionType] = useState('sales');
  const [customerId,   setCustomerId]   = useState<number | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [vendorId,     setVendorId]     = useState<number | null>(null);
  const [vendorName,   setVendorName]   = useState('');
  const [invoiceNo,    setInvoiceNo]    = useState('');
  const [gstNo,        setGstNo]        = useState('');
  const [transactionDate, setTransactionDate] = useState('');
  const [taxableAmount, setTaxableAmount] = useState('');
  const [gstRate,       setGstRate]       = useState('18');
  const [isInterstate,  setIsInterstate]  = useState(false);
  const [isFiled,       setIsFiled]       = useState(false);
  const [filingDate,    setFilingDate]    = useState('');
  const [notes,         setNotes]         = useState('');
  const [saving,        setSaving]        = useState(false);
  const [saveError,     setSaveError]     = useState('');

  const [customers,        setCustomers]        = useState<SearchItem[]>([]);
  const [vendors,          setVendors]          = useState<SearchItem[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [loadingVendors,   setLoadingVendors]   = useState(false);
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [showVendorPicker,   setShowVendorPicker]   = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (record) {
      setTransactionType(record.transactionType);
      setCustomerId(record.customer?.id ?? null);
      setCustomerName(record.customer?.customerName ?? '');
      setVendorId(record.vendor?.id ?? null);
      setVendorName(record.vendor?.name ?? '');
      setInvoiceNo(record.invoiceNo ?? '');
      setGstNo(record.gstNo ?? '');
      setTransactionDate(isoToDisplay(record.transactionDate));
      setTaxableAmount(parseFloat(record.taxableAmount).toString());
      setGstRate(parseFloat(record.gstRate).toString());
      setIsInterstate(parseFloat(record.igst) > 0);
      setIsFiled(record.isFiled);
      setFilingDate(isoToDisplay(record.filingDate));
      setNotes(record.notes ?? '');
    } else {
      setTransactionType('sales');
      setCustomerId(null); setCustomerName('');
      setVendorId(null);   setVendorName('');
      setInvoiceNo(''); setGstNo('');
      setTransactionDate(today());
      setTaxableAmount(''); setGstRate('18'); setIsInterstate(false);
      setIsFiled(false); setFilingDate('');
      setNotes('');
    }
    setSaveError('');
  }, [visible, record]);

  const taxable = parseFloat(taxableAmount || '0') || 0;
  const rate    = parseFloat(gstRate || '0') || 0;
  const totalGst = taxable * (rate / 100);
  const total    = taxable + totalGst;
  const cgstPreview = isInterstate ? 0 : totalGst / 2;
  const sgstPreview = isInterstate ? 0 : totalGst / 2;
  const igstPreview = isInterstate ? totalGst : 0;

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

  const handleSave = async () => {
    setSaveError('');
    if (!transactionDate) { setSaveError('Transaction date is required.'); return; }
    const isoDate = displayToIso(transactionDate);
    if (!isoDate) { setSaveError('Enter transaction date as DD/MM/YYYY'); return; }
    if (!taxableAmount || taxable < 0) { setSaveError('Enter a valid taxable amount.'); return; }
    if (isFiled && !filingDate) { setSaveError('Enter a filing date, or turn off "Filed".'); return; }
    const isoFilingDate = filingDate ? displayToIso(filingDate) : null;
    if (filingDate && !isoFilingDate) { setSaveError('Enter filing date as DD/MM/YYYY'); return; }

    setSaving(true);
    try {
      const payload = {
        transactionType, invoiceNo, gstNo,
        customerId: customerId ?? undefined, vendorId: vendorId ?? undefined,
        transactionDate: isoDate, taxableAmount: taxableAmount, gstRate: gstRate,
        isInterstate, isFiled, filingDate: isoFilingDate ?? undefined, notes,
      };
      if (isEdit) {
        await gstApi.update(record!.id, {
          ...payload,
          customerId: customerId ?? null, vendorId: vendorId ?? null,
          filingDate: isoFilingDate,
        });
        onSaved();
      } else {
        const { data } = await gstApi.create(payload);
        onSaved(data.record.id);
      }
      onClose();
    } catch (e: any) {
      setSaveError(e?.response?.data?.error ?? 'Could not save GST record.');
    } finally { setSaving(false); }
  };

  const pickers = (
    <>
      <SearchPickerModal visible={showCustomerPicker} title="Select Customer" items={customers} loading={loadingCustomers}
        onSelect={item => { if (item) { setCustomerId(item.id); setCustomerName(item.label); setVendorId(null); setVendorName(''); } setShowCustomerPicker(false); }} />
      <SearchPickerModal visible={showVendorPicker} title="Select Vendor" items={vendors} loading={loadingVendors}
        onSelect={item => { if (item) { setVendorId(item.id); setVendorName(item.label); setCustomerId(null); setCustomerName(''); } setShowVendorPicker(false); }} />
    </>
  );

  // ── Shared body ────────────────────────────────────────────────────────────────
  const formBody = (st: any) => (
    <>
      {saveError ? (
        <View style={st.errorBanner}>
          <Ionicons name="alert-circle" size={18} color={Colors.error} />
          <Text style={st.errorBannerText}>{saveError}</Text>
        </View>
      ) : null}

      <Text style={st.label}>Transaction Type</Text>
      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
        {TYPES.map(t => (
          <TouchableOpacity key={t.key} style={[st.chip, transactionType === t.key && st.chipActive]} onPress={() => setTransactionType(t.key)}>
            <Text style={[st.chipText, transactionType === t.key && st.chipTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={st.label}>Customer <Text style={st.opt}>(pick one — customer or vendor)</Text></Text>
      <TouchableOpacity style={st.pickerField} onPress={openCustomerPicker}>
        <Text style={customerId ? st.pickerValue : st.pickerPlaceholder} numberOfLines={1}>{customerId ? customerName : 'Select customer...'}</Text>
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          {customerId && <TouchableOpacity onPress={() => { setCustomerId(null); setCustomerName(''); }}><Ionicons name="close-circle" size={15} color={Colors.textMuted} /></TouchableOpacity>}
          <Ionicons name="chevron-down" size={15} color={Colors.textMuted} />
        </View>
      </TouchableOpacity>

      <Text style={st.label}>Vendor</Text>
      <TouchableOpacity style={st.pickerField} onPress={openVendorPicker}>
        <Text style={vendorId ? st.pickerValue : st.pickerPlaceholder} numberOfLines={1}>{vendorId ? vendorName : 'Select vendor...'}</Text>
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          {vendorId && <TouchableOpacity onPress={() => { setVendorId(null); setVendorName(''); }}><Ionicons name="close-circle" size={15} color={Colors.textMuted} /></TouchableOpacity>}
          <Ionicons name="chevron-down" size={15} color={Colors.textMuted} />
        </View>
      </TouchableOpacity>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={st.label}>Transaction Date <Text style={st.req}>*</Text></Text>
          <View style={st.inputRow}>
            <Ionicons name="calendar-outline" size={13} color={Colors.textMuted} />
            <TextInput style={[st.input, { flex: 1 }]} value={transactionDate} onChangeText={t => setTransactionDate(autoDate(t))} placeholder="DD/MM/YYYY" placeholderTextColor={Colors.textMuted} keyboardType="numeric" maxLength={10} />
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={st.label}>Invoice No <Text style={st.opt}>(optional)</Text></Text>
          <View style={st.inputRow}>
            <TextInput style={[st.input, { flex: 1 }]} value={invoiceNo} onChangeText={setInvoiceNo} placeholder="INV-..." placeholderTextColor={Colors.textMuted} autoCapitalize="characters" />
          </View>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={st.label}>Taxable Amount <Text style={st.req}>*</Text></Text>
          <View style={st.priceRow}>
            <Text style={st.rupeePrefix}>₹</Text>
            <TextInput style={[st.input, { flex: 1 }]} value={taxableAmount} onChangeText={setTaxableAmount} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={Colors.textMuted} />
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={st.label}>GST Rate <Text style={st.opt}>(%)</Text></Text>
          <View style={st.inputRow}>
            <TextInput style={[st.input, { flex: 1 }]} value={gstRate} onChangeText={setGstRate} keyboardType="decimal-pad" placeholder="18" placeholderTextColor={Colors.textMuted} />
          </View>
        </View>
      </View>

      <Text style={st.label}>GST Number <Text style={st.opt}>(optional)</Text></Text>
      <TextInput style={st.inputBox} value={gstNo} onChangeText={setGstNo} placeholder="27ABCDE1234F1Z5" placeholderTextColor={Colors.textMuted} autoCapitalize="characters" />

      <TouchableOpacity style={st.switchRow} onPress={() => setIsInterstate(v => !v)} activeOpacity={0.7}>
        <View style={{ flex: 1 }}>
          <Text style={st.switchLabel}>Interstate Transaction</Text>
          <Text style={st.switchSub}>IGST instead of CGST + SGST</Text>
        </View>
        <Switch value={isInterstate} onValueChange={setIsInterstate} trackColor={{ true: Colors.accent, false: Colors.border }} thumbColor="#fff" />
      </TouchableOpacity>

      <View style={st.gstPreview}>
        <View style={st.gstPreviewRow}><Text style={st.gstPreviewLabel}>Taxable Amount</Text><Text style={st.gstPreviewValue}>{fmtCurrency(taxable)}</Text></View>
        {isInterstate ? (
          <View style={st.gstPreviewRow}><Text style={st.gstPreviewLabel}>IGST ({rate}%)</Text><Text style={st.gstPreviewValue}>{fmtCurrency(igstPreview)}</Text></View>
        ) : (
          <>
            <View style={st.gstPreviewRow}><Text style={st.gstPreviewLabel}>CGST ({(rate/2).toFixed(1)}%)</Text><Text style={st.gstPreviewValue}>{fmtCurrency(cgstPreview)}</Text></View>
            <View style={st.gstPreviewRow}><Text style={st.gstPreviewLabel}>SGST ({(rate/2).toFixed(1)}%)</Text><Text style={st.gstPreviewValue}>{fmtCurrency(sgstPreview)}</Text></View>
          </>
        )}
        <View style={[st.gstPreviewRow, st.gstPreviewTotalRow]}>
          <Text style={st.gstPreviewTotalLabel}>Total Amount</Text>
          <Text style={st.gstPreviewTotalValue}>{fmtCurrency(total)}</Text>
        </View>
      </View>

      <TouchableOpacity style={st.switchRow} onPress={() => setIsFiled(v => !v)} activeOpacity={0.7}>
        <View style={{ flex: 1 }}>
          <Text style={st.switchLabel}>Filed</Text>
          <Text style={st.switchSub}>Has this GST return already been filed?</Text>
        </View>
        <Switch value={isFiled} onValueChange={setIsFiled} trackColor={{ true: Colors.accent, false: Colors.border }} thumbColor="#fff" />
      </TouchableOpacity>

      {isFiled && (
        <>
          <Text style={st.label}>Filing Date <Text style={st.req}>*</Text></Text>
          <View style={st.inputRow}>
            <Ionicons name="calendar-outline" size={13} color={Colors.textMuted} />
            <TextInput style={[st.input, { flex: 1 }]} value={filingDate} onChangeText={t => setFilingDate(autoDate(t))} placeholder="DD/MM/YYYY" placeholderTextColor={Colors.textMuted} keyboardType="numeric" maxLength={10} />
          </View>
        </>
      )}

      <Text style={st.label}>Notes <Text style={st.opt}>(optional)</Text></Text>
      <TextInput style={st.textArea} value={notes} onChangeText={setNotes} placeholder="Add notes..." placeholderTextColor={Colors.textMuted} multiline numberOfLines={3} textAlignVertical="top" />
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
                <Ionicons name="pricetags-outline" size={18} color={Colors.accent} />
                <Text style={w.headerTitle}>{isEdit ? 'Edit GST Record' : 'New GST Record'}</Text>
                {isEdit && record && <Text style={w.headerSub}>{record.gstNo || `#${record.id}`}</Text>}
              </View>
              <View style={w.headerActions}>
                <TouchableOpacity style={w.cancelBtn} onPress={onClose} disabled={saving}>
                  <Text style={w.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[w.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                  {saving ? <ActivityIndicator size="small" color="#111" /> : (
                    <><Ionicons name="checkmark" size={15} color="#111" /><Text style={w.saveText}>{isEdit ? 'Update Record' : 'Create Record'}</Text></>
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
          <Text style={s.title}>{isEdit ? 'Edit GST Record' : 'New GST Record'}</Text>
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
              {saving ? <ActivityIndicator size="small" color="#111" /> : <Text style={s.saveText}>{isEdit ? 'Update Record' : 'Create Record'}</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
        {pickers}
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Shared style shape ─────────────────────────────────────────────────────────
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
  priceRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 6, paddingHorizontal: 10, marginBottom: 12 },
  rupeePrefix: { fontSize: 13, color: Colors.textMuted, fontWeight: '600' as const },
  input: { fontSize: 14, color: Colors.textPrimary, paddingVertical: 9, ...Platform.select({ web: { outlineStyle: 'none' as const } }) },
  inputBox: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, color: Colors.textPrimary, marginBottom: 12, ...Platform.select({ web: { outlineStyle: 'none' as const } }) },
  textArea: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10, minHeight: 72, fontSize: 14, color: Colors.textPrimary, marginBottom: 4, ...Platform.select({ web: { outlineStyle: 'none' as const } }) },

  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  chipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  chipText: { fontSize: 12, fontWeight: '600' as const, color: Colors.textSecondary },
  chipTextActive: { color: '#111' },

  switchRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 },
  switchLabel: { fontSize: 13, fontWeight: '600' as const, color: Colors.textPrimary },
  switchSub: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },

  gstPreview: { backgroundColor: Colors.accentLight, borderRadius: 8, borderWidth: 1, borderColor: Colors.accent + '40', padding: 12, marginBottom: 12 },
  gstPreviewRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, paddingVertical: 3 },
  gstPreviewLabel: { fontSize: 12, color: Colors.textSecondary },
  gstPreviewValue: { fontSize: 12, color: Colors.textPrimary, fontWeight: '600' as const },
  gstPreviewTotalRow: { borderTopWidth: 1, borderTopColor: Colors.accent + '40', marginTop: 4, paddingTop: 8 },
  gstPreviewTotalLabel: { fontSize: 13, color: Colors.textPrimary, fontWeight: '700' as const },
  gstPreviewTotalValue: { fontSize: 15, color: Colors.accentDark, fontWeight: '800' as const },
};

// ── Web styles ───────────────────────────────────────────────────────────────────
const w = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  dialog:   { width: '100%', maxWidth: 600, backgroundColor: Colors.background, borderRadius: 12, overflow: 'hidden', elevation: 32, ...Platform.select({ web: { boxShadow: '0 12px 32px rgba(0,0,0,0.35)' }, default: { shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.35, shadowRadius: 32 } }) },
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
