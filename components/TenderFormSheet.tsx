import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Modal,
  ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView, Dimensions,
} from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { tendersApi, Tender } from '../services/api';
import { Colors } from '../constants/colors';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSaved: (newTenderId?: number) => void;
  tender?: Tender | null;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUSES = [
  { key: 'draft',     label: 'Draft'     },
  { key: 'published', label: 'Published' },
  { key: 'closed',    label: 'Closed'    },
  { key: 'awarded',   label: 'Awarded'   },
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

// ── Main Component ────────────────────────────────────────────────────────────

export default function TenderFormSheet({ visible, onClose, onSaved, tender }: Props) {
  const isEdit = !!tender;
  const isWeb  = Platform.OS === 'web';

  // Form fields
  const [tenderNo,    setTenderNo]    = useState('');
  const [title,       setTitle]       = useState('');
  const [description, setDescription] = useState('');
  const [status,      setStatus]      = useState('draft');
  const [tenderDate,  setTenderDate]  = useState('');
  const [closingDate, setClosingDate] = useState('');
  const [tenderAmount, setTenderAmount] = useState('');
  const [biddingPct,  setBiddingPct]  = useState('');
  const [workOrderNo, setWorkOrderNo] = useState('');
  const [maintPeriod, setMaintPeriod] = useState('');
  const [tenderRemark, setTenderRemark] = useState('');
  const [saving,      setSaving]      = useState(false);
  const [saveError,   setSaveError]   = useState('');

  // Reset / pre-fill
  useEffect(() => {
    if (!visible) return;
    if (tender) {
      setTenderNo(tender.tenderNo);
      setTitle(tender.title);
      setDescription(tender.description ?? '');
      setStatus(tender.status);
      setTenderDate(isoToDisplay(tender.tenderDate));
      setClosingDate(isoToDisplay(tender.closingDate));
      setTenderAmount(tender.tenderAmount ? parseFloat(tender.tenderAmount).toString() : '');
      setBiddingPct(parseFloat(tender.biddingPercentage) > 0 ? parseFloat(tender.biddingPercentage).toString() : '');
      setWorkOrderNo(tender.workOrderNo ?? '');
      setMaintPeriod(tender.maintenancePeriod != null ? String(tender.maintenancePeriod) : '');
      setTenderRemark(tender.tenderRemark ?? '');
    } else {
      setTenderNo('');     setTitle('');
      setDescription('');  setStatus('draft');
      setTenderDate(today()); setClosingDate('');
      setTenderAmount(''); setBiddingPct('');
      setWorkOrderNo('');  setMaintPeriod('');
      setTenderRemark('');
    }
    setSaveError('');
  }, [visible, tender]);

  // Save
  const handleSave = async () => {
    setSaveError('');

    if (!title.trim()) { setSaveError('Tender title is required'); return; }

    const isoTender = displayToIso(tenderDate);
    if (!isoTender) { setSaveError('Enter tender date as DD/MM/YYYY'); return; }
    const isoClosing = displayToIso(closingDate);
    if (!isoClosing) { setSaveError('Enter closing date as DD/MM/YYYY'); return; }
    if (isoClosing < isoTender) { setSaveError('Closing date cannot be before tender date'); return; }

    if (tenderAmount.trim() !== '') {
      const amt = parseFloat(tenderAmount);
      if (isNaN(amt) || amt < 0) { setSaveError('Tender amount must be a number greater than or equal to 0'); return; }
    }
    if (biddingPct.trim() !== '') {
      const pct = parseFloat(biddingPct);
      if (isNaN(pct) || pct < 0 || pct >= 100) { setSaveError('Bidding % must be between 0 and 99.999'); return; }
    }
    if (maintPeriod.trim() !== '') {
      const mp = parseInt(maintPeriod);
      if (isNaN(mp) || mp < 0) { setSaveError('Maintenance period must be a whole number of months'); return; }
    }

    const payload = {
      ...(tenderNo.trim() ? { tenderNo: tenderNo.trim() } : {}),
      title:             title.trim(),
      description,
      status,
      tenderDate:        isoTender,
      closingDate:       isoClosing,
      tenderAmount:      tenderAmount.trim() === '' ? null : parseFloat(tenderAmount),
      biddingPercentage: biddingPct.trim() === '' ? 0 : parseFloat(biddingPct),
      workOrderNo:       workOrderNo.trim() || null,
      maintenancePeriod: maintPeriod.trim() === '' ? null : parseInt(maintPeriod),
      tenderRemark:      tenderRemark.trim() || null,
    };

    setSaving(true);
    try {
      if (isEdit) {
        await tendersApi.update(tender!.id, payload);
        onSaved();
      } else {
        const { data } = await tendersApi.create(payload);
        onSaved(data.tender.id);
      }
      onClose();
    } catch (e: any) {
      setSaveError(e?.response?.data?.error || 'Could not save tender. Check your connection and try again.');
    } finally { setSaving(false); }
  };

  // Shared field fragments used by both layouts (styles differ per layout)
  const renderStatusChips = (st: typeof w | typeof s) => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
      {STATUSES.map(opt => (
        <TouchableOpacity key={opt.key} style={[st.chip, status === opt.key && st.chipActive]} onPress={() => setStatus(opt.key)}>
          <Text style={[st.chipText, status === opt.key && st.chipTextActive]}>{opt.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderDatePair = (st: typeof w | typeof s) => (
    <View style={{ flexDirection: 'row', gap: 12 }}>
      <View style={{ flex: 1 }}>
        <Text style={st.label}>Tender Date <Text style={st.req}>*</Text></Text>
        <View style={st.inputRow}>
          <Ionicons name="calendar-outline" size={13} color={Colors.textMuted} />
          <TextInput style={[st.input, { flex: 1 }]} value={tenderDate} onChangeText={t => setTenderDate(autoDate(t))} placeholder="DD/MM/YYYY" placeholderTextColor={Colors.textMuted} keyboardType="numeric" maxLength={10} />
        </View>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={st.label}>Closing Date <Text style={st.req}>*</Text></Text>
        <View style={st.inputRow}>
          <Ionicons name="calendar-outline" size={13} color={Colors.textMuted} />
          <TextInput style={[st.input, { flex: 1 }]} value={closingDate} onChangeText={t => setClosingDate(autoDate(t))} placeholder="DD/MM/YYYY" placeholderTextColor={Colors.textMuted} keyboardType="numeric" maxLength={10} />
        </View>
      </View>
    </View>
  );

  const renderAmountPctPair = (st: typeof w | typeof s) => (
    <View style={{ flexDirection: 'row', gap: 12 }}>
      <View style={{ flex: 1.4 }}>
        <Text style={st.label}>Tender Amount <Text style={st.opt}>(optional)</Text></Text>
        <View style={st.inputRow}>
          <Text style={st.rupeePrefix}>₹</Text>
          <TextInput style={[st.input, { flex: 1 }]} value={tenderAmount} onChangeText={setTenderAmount} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={Colors.textMuted} />
        </View>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={st.label}>Bidding % <Text style={st.opt}>(opt)</Text></Text>
        <View style={st.inputRow}>
          <TextInput style={[st.input, { flex: 1 }]} value={biddingPct} onChangeText={setBiddingPct} keyboardType="decimal-pad" placeholder="0.000" placeholderTextColor={Colors.textMuted} />
          <Text style={st.rupeePrefix}>%</Text>
        </View>
      </View>
    </View>
  );

  const renderWorkOrderMaintPair = (st: typeof w | typeof s) => (
    <View style={{ flexDirection: 'row', gap: 12 }}>
      <View style={{ flex: 1.4 }}>
        <Text style={st.label}>Work Order No <Text style={st.opt}>(optional)</Text></Text>
        <TextInput style={st.inputBox} value={workOrderNo} onChangeText={setWorkOrderNo} placeholder="Work order number..." placeholderTextColor={Colors.textMuted} autoComplete="new-password" textContentType="none" importantForAutofill="no" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={st.label}>Maintenance <Text style={st.opt}>(opt)</Text></Text>
        <View style={st.inputRow}>
          <TextInput style={[st.input, { flex: 1 }]} value={maintPeriod} onChangeText={setMaintPeriod} keyboardType="numeric" placeholder="0" placeholderTextColor={Colors.textMuted} />
          <Text style={st.rupeePrefix}>months</Text>
        </View>
      </View>
    </View>
  );

  const renderErrorBanner = (st: typeof w | typeof s) => saveError ? (
    <View style={st.errorBanner}>
      <Ionicons name="alert-circle-outline" size={16} color={Colors.error} />
      <Text style={st.errorBannerText}>{saveError}</Text>
      <TouchableOpacity onPress={() => setSaveError('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="close" size={14} color={Colors.error} />
      </TouchableOpacity>
    </View>
  ) : null;

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
                <Ionicons name="document-text-outline" size={18} color={Colors.accent} />
                <Text style={w.headerTitle}>{isEdit ? 'Edit Tender' : 'New Tender'}</Text>
                {isEdit && tender && <Text style={w.headerSub}>{tender.tenderNo}</Text>}
              </View>
              <View style={w.headerActions}>
                <TouchableOpacity style={w.cancelBtn} onPress={onClose} disabled={saving}>
                  <Text style={w.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[w.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                  {saving ? <ActivityIndicator size="small" color="#111" /> : (
                    <><Ionicons name="checkmark" size={15} color="#111" /><Text style={w.saveText}>{isEdit ? 'Update Tender' : 'Create Tender'}</Text></>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView contentContainerStyle={w.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

              {renderErrorBanner(w)}

              {/* Two-column fields */}
              <View style={w.fieldsGrid}>

                {/* LEFT COLUMN */}
                <View style={w.col}>
                  <Text style={w.label}>Tender No <Text style={w.opt}>(optional)</Text></Text>
                  <TextInput style={w.inputBox} value={tenderNo} onChangeText={setTenderNo} placeholder="Leave blank to auto-generate" placeholderTextColor={Colors.textMuted} autoComplete="new-password" textContentType="none" importantForAutofill="no" />

                  <Text style={w.label}>Title <Text style={w.req}>*</Text></Text>
                  <TextInput style={w.inputBox} value={title} onChangeText={setTitle} placeholder="Enter tender title..." placeholderTextColor={Colors.textMuted} />

                  <Text style={w.label}>Description <Text style={w.opt}>(optional)</Text></Text>
                  <TextInput style={w.textArea} value={description} onChangeText={setDescription} placeholder="Add description..." placeholderTextColor={Colors.textMuted} multiline numberOfLines={4} textAlignVertical="top" />

                  <Text style={w.label}>Remark <Text style={w.opt}>(optional)</Text></Text>
                  <TextInput style={[w.textArea, { minHeight: 70 }]} value={tenderRemark} onChangeText={setTenderRemark} placeholder="Add remark..." placeholderTextColor={Colors.textMuted} multiline numberOfLines={3} textAlignVertical="top" />
                </View>

                {/* RIGHT COLUMN */}
                <View style={w.col}>
                  <Text style={w.label}>Status</Text>
                  {renderStatusChips(w)}
                  {renderDatePair(w)}
                  {renderAmountPctPair(w)}
                  {renderWorkOrderMaintPair(w)}
                </View>
              </View>
            </ScrollView>
          </View>
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
          <Text style={s.title}>{isEdit ? 'Edit Tender' : 'New Tender'}</Text>
          <TouchableOpacity onPress={onClose} style={s.closeBtn}>
            <Ionicons name="close" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1, backgroundColor: Colors.background }} contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">

          {/* Tender No */}
          <Text style={s.label}>Tender No <Text style={s.opt}>(optional)</Text></Text>
          <TextInput style={s.inputBox} value={tenderNo} onChangeText={setTenderNo} placeholder="Leave blank to auto-generate" placeholderTextColor={Colors.textMuted} autoComplete="new-password" textContentType="none" importantForAutofill="no" />

          {/* Title */}
          <Text style={s.label}>Title <Text style={s.req}>*</Text></Text>
          <TextInput style={s.inputBox} value={title} onChangeText={setTitle} placeholder="Enter tender title..." placeholderTextColor={Colors.textMuted} />

          {/* Status */}
          <Text style={s.label}>Status</Text>
          {renderStatusChips(s)}

          {/* Dates */}
          {renderDatePair(s)}

          {/* Amount + Bidding % */}
          {renderAmountPctPair(s)}

          {/* Work order + maintenance */}
          {renderWorkOrderMaintPair(s)}

          {/* Description */}
          <Text style={s.label}>Description <Text style={s.opt}>(optional)</Text></Text>
          <TextInput style={s.textArea} value={description} onChangeText={setDescription} placeholder="Add description..." placeholderTextColor={Colors.textMuted} multiline numberOfLines={4} textAlignVertical="top" />

          {/* Remark */}
          <Text style={s.label}>Remark <Text style={s.opt}>(optional)</Text></Text>
          <TextInput style={[s.textArea, { minHeight: 70 }]} value={tenderRemark} onChangeText={setTenderRemark} placeholder="Add remark..." placeholderTextColor={Colors.textMuted} multiline numberOfLines={3} textAlignVertical="top" />

          {renderErrorBanner(s)}

          <View style={s.actions}>
            <TouchableOpacity style={s.cancelBtn} onPress={onClose} disabled={saving}>
              <Text style={s.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color="#111" /> : <Text style={s.saveText}>{isEdit ? 'Update Tender' : 'Save Tender'}</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Web styles ────────────────────────────────────────────────────────────────
const w = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  dialog:   { width: '100%', maxWidth: 760, backgroundColor: Colors.background, borderRadius: 12, overflow: 'hidden', elevation: 32, ...Platform.select({ web: { boxShadow: '0 12px 32px rgba(0,0,0,0.35)' }, default: { shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.35, shadowRadius: 32 } }) },

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

  errorBanner:     { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.errorLight, borderWidth: 1, borderColor: Colors.error + '40', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16 },
  errorBannerText: { flex: 1, fontSize: 13, color: Colors.error, fontWeight: '600' },

  fieldsGrid: { flexDirection: 'row', gap: 24 },
  col:        { flex: 1 },
  label:      { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, marginBottom: 5, marginTop: 2 },
  opt:        { fontWeight: '400', color: Colors.textMuted },
  req:        { color: Colors.error },

  inputBox:  { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, color: Colors.textPrimary, marginBottom: 12, ...Platform.select({ web: { outlineStyle: 'none' } }) },
  inputRow:  { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 6, paddingHorizontal: 10, marginBottom: 12 },
  input:     { fontSize: 14, color: Colors.textPrimary, paddingVertical: 9, ...Platform.select({ web: { outlineStyle: 'none' } }) },
  rupeePrefix: { fontSize: 13, color: Colors.textMuted, fontWeight: '600', flexShrink: 0 },

  chip:          { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  chipActive:    { backgroundColor: Colors.accent, borderColor: Colors.accent },
  chipText:      { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  chipTextActive:{ color: '#111' },

  textArea: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10, minHeight: 90, fontSize: 14, color: Colors.textPrimary, marginBottom: 12, ...Platform.select({ web: { outlineStyle: 'none' } }) },
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

  errorBanner:     { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.errorLight, borderWidth: 1, borderColor: Colors.error + '40', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 },
  errorBannerText: { flex: 1, fontSize: 13, color: Colors.error, fontWeight: '600' },

  inputBox:  { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, color: Colors.textPrimary, marginBottom: 14, ...Platform.select({ web: { outlineStyle: 'none' } }) },
  inputRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: 12, marginBottom: 14 },
  input:     { fontSize: 15, color: Colors.textPrimary, paddingVertical: 11 },
  rupeePrefix: { fontSize: 13, color: Colors.textMuted, fontWeight: '600', flexShrink: 0 },

  chip:          { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  chipActive:    { backgroundColor: Colors.accent, borderColor: Colors.accent },
  chipText:      { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  chipTextActive:{ color: '#111' },

  textArea: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, minHeight: 90, fontSize: 14, color: Colors.textPrimary, marginBottom: 16, ...Platform.select({ web: { outlineStyle: 'none' } }) },

  actions:    { flexDirection: 'row', gap: 12 },
  cancelBtn:  { flex: 1, paddingVertical: 14, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  cancelText: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
  saveBtn:    { flex: 2, paddingVertical: 14, borderRadius: 8, backgroundColor: Colors.accent, alignItems: 'center' },
  saveText:   { fontSize: 15, fontWeight: '700', color: '#111' },
});
