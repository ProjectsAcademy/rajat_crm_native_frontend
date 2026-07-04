/**
 * VendorFormSheet — Create and Edit modal for Vendors.
 *
 * Web:    centred dialog (max-width 600px)
 * Native: full-screen modal with ScrollView
 *
 * Sections:
 *   1. Basic Info  — name*, contactPerson, phone, email
 *   2. Business    — gstin, pan, address
 *   3. Banking     — bankName, accountNumber, ifscCode (collapsible on mobile)
 *   4. Status      — isActive toggle (edit mode only)
 */
import {
  View, Text, TextInput, TouchableOpacity, Modal,
  ScrollView, ActivityIndicator, StyleSheet,
  Platform, KeyboardAvoidingView, Switch,
} from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { vendorsApi, Vendor } from '../services/api';
import { Colors } from '../constants/colors';

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  visible: boolean;
  onClose: () => void;
  onSaved: (newId?: number) => void;
  vendor?: Vendor | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function VendorFormSheet({ visible, onClose, onSaved, vendor }: Props) {
  const isEdit = !!vendor;

  const [name,          setName]          = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone,         setPhone]         = useState('');
  const [email,         setEmail]         = useState('');
  const [address,       setAddress]       = useState('');
  const [gstin,         setGstin]         = useState('');
  const [pan,           setPan]           = useState('');
  const [bankName,      setBankName]      = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode,      setIfscCode]      = useState('');
  const [isActive,      setIsActive]      = useState(true);
  const [bankExpanded,  setBankExpanded]  = useState(false);
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState('');

  // Pre-fill on edit
  useEffect(() => {
    if (!visible) return;
    if (vendor) {
      setName(vendor.name);
      setContactPerson(vendor.contactPerson ?? '');
      setPhone(vendor.phone ?? '');
      setEmail(vendor.email ?? '');
      setAddress(vendor.address ?? '');
      setGstin(vendor.gstin ?? '');
      setPan(vendor.pan ?? '');
      setBankName(vendor.bankName ?? '');
      setAccountNumber(vendor.accountNumber ?? '');
      setIfscCode(vendor.ifscCode ?? '');
      setIsActive(vendor.isActive);
      // Auto-expand banking section if data exists
      setBankExpanded(!!(vendor.bankName || vendor.accountNumber || vendor.ifscCode));
    } else {
      setName(''); setContactPerson(''); setPhone(''); setEmail('');
      setAddress(''); setGstin(''); setPan('');
      setBankName(''); setAccountNumber(''); setIfscCode('');
      setIsActive(true); setBankExpanded(false);
    }
    setError('');
  }, [visible, vendor]);

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!name.trim()) { setError('Vendor name is required.'); return; }
    setSaving(true);
    setError('');
    try {
      const payload = {
        name: name.trim(),
        contactPerson: contactPerson.trim(),
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
        gstin: gstin.trim(),
        pan: pan.trim().toUpperCase(),
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        ifscCode: ifscCode.trim().toUpperCase(),
        isActive,
      };
      if (isEdit) {
        await vendorsApi.update(vendor!.id, payload);
        onSaved();
      } else {
        const { data } = await vendorsApi.create(payload);
        onSaved(data.vendor.id);
      }
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Could not save vendor. Please try again.');
    } finally {
      setSaving(false);
    }
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

      {isEdit && vendor?.vendorCode ? (
        <View style={s.codeChip}>
          <Ionicons name="pricetag-outline" size={13} color={Colors.textMuted} />
          <Text style={s.codeChipText}>{vendor.vendorCode}</Text>
        </View>
      ) : null}

      {/* Basic Info */}
      <SectionHeader title="Basic Information" icon="business-outline" />

      <Field label="Vendor Name" required>
        <StyledInput value={name} onChangeText={setName} placeholder="Company or individual name" autoCapitalize="words" />
      </Field>
      <Field label="Contact Person">
        <StyledInput value={contactPerson} onChangeText={setContactPerson} placeholder="Primary contact name" autoCapitalize="words" />
      </Field>
      <Field label="Phone">
        <StyledInput value={phone} onChangeText={setPhone} placeholder="+91 XXXXX XXXXX" keyboardType="phone-pad" />
      </Field>
      <Field label="Email">
        <StyledInput value={email} onChangeText={setEmail} placeholder="vendor@example.com" keyboardType="email-address" autoCapitalize="none" />
      </Field>

      {/* Business */}
      <SectionHeader title="Business Details" icon="receipt-outline" />

      <Field label="Address">
        <StyledInput
          value={address} onChangeText={setAddress} placeholder="Full address"
          multiline numberOfLines={3} style={{ height: 72, textAlignVertical: 'top', paddingTop: 10 }}
        />
      </Field>
      <Field label="GSTIN">
        <StyledInput value={gstin} onChangeText={v => setGstin(v.toUpperCase())} placeholder="22AAAAA0000A1Z5" autoCapitalize="characters" maxLength={15} />
      </Field>
      <Field label="PAN">
        <StyledInput value={pan} onChangeText={v => setPan(v.toUpperCase())} placeholder="AAAAA0000A" autoCapitalize="characters" maxLength={10} />
      </Field>

      {/* Banking — collapsible */}
      <TouchableOpacity style={s.bankToggle} onPress={() => setBankExpanded(v => !v)} activeOpacity={0.7}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="card-outline" size={14} color={Colors.accent} />
          <Text style={s.sectionTitle}>Banking Details</Text>
          {(bankName || accountNumber || ifscCode) ? (
            <View style={s.filledBadge}><Text style={s.filledBadgeText}>Filled</Text></View>
          ) : null}
        </View>
        <Ionicons name={bankExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.textMuted} />
      </TouchableOpacity>

      {bankExpanded && (
        <View style={s.bankSection}>
          <Field label="Bank Name">
            <StyledInput value={bankName} onChangeText={setBankName} placeholder="e.g. State Bank of India" autoCapitalize="words" />
          </Field>
          <Field label="Account Number">
            <StyledInput value={accountNumber} onChangeText={setAccountNumber} placeholder="Account number" keyboardType="numeric" />
          </Field>
          <Field label="IFSC Code">
            <StyledInput value={ifscCode} onChangeText={v => setIfscCode(v.toUpperCase())} placeholder="SBIN0001234" autoCapitalize="characters" maxLength={11} />
          </Field>
        </View>
      )}

      {/* Status — edit only */}
      {isEdit && (
        <View style={s.toggleRow}>
          <View>
            <Text style={s.toggleLabel}>Active Status</Text>
            <Text style={s.toggleSub}>Inactive vendors won't appear in purchase pickers</Text>
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
                <Ionicons name="storefront-outline" size={18} color={Colors.accent} />
                <Text style={w.headerTitle}>{isEdit ? 'Edit Vendor' : 'New Vendor'}</Text>
                {isEdit && vendor?.vendorCode ? <Text style={w.headerSub}>{vendor.vendorCode}</Text> : null}
              </View>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                <TouchableOpacity style={w.cancelBtn} onPress={onClose} disabled={saving}>
                  <Text style={w.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[w.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                  {saving
                    ? <ActivityIndicator size="small" color="#111" />
                    : <><Ionicons name="checkmark" size={15} color="#111" /><Text style={w.saveText}>{isEdit ? 'Update' : 'Create Vendor'}</Text></>}
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
          <Text style={s.headerTitle}>{isEdit ? 'Edit Vendor' : 'New Vendor'}</Text>
          <TouchableOpacity onPress={onClose} style={s.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>
        {formBody}
        <View style={s.footer}>
          <TouchableOpacity style={s.cancelBtn} onPress={onClose} disabled={saving}>
            <Text style={s.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
            {saving
              ? <ActivityIndicator size="small" color="#111" />
              : <Text style={s.saveText}>{isEdit ? 'Update Vendor' : 'Create Vendor'}</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Shared styles ─────────────────────────────────────────────────────────────

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

  bankToggle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 4, marginTop: 8,
  },
  bankSection: {
    borderLeftWidth: 2, borderLeftColor: Colors.accent,
    paddingLeft: 12, marginBottom: 8, marginTop: 4,
  },
  filledBadge: {
    backgroundColor: Colors.successLight, borderRadius: 10,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  filledBadgeText: { fontSize: 9, fontWeight: '700', color: Colors.success },

  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 6, padding: 14, marginTop: 8, marginBottom: 16,
  },
  toggleLabel: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  toggleSub:   { fontSize: 12, color: Colors.textMuted, marginTop: 2 },

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
    justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 6,
  },
  saveText: { fontSize: 14, fontWeight: '700', color: '#111' },
});

const w = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  dialog: {
    width: '100%', maxWidth: 600, maxHeight: '90%',
    backgroundColor: Colors.background, borderRadius: 12, overflow: 'hidden',
    ...Platform.select({ web: { boxShadow: '0 12px 32px rgba(0,0,0,0.35)' }, default: { elevation: 20 } }),
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, paddingVertical: 14,
    backgroundColor: Colors.primary, borderBottomWidth: 1, borderBottomColor: Colors.primaryLight,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 12, color: Colors.accent, fontWeight: '600', marginLeft: 4 },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  cancelText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.85)' },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 18, paddingVertical: 8, borderRadius: 6, backgroundColor: Colors.accent,
  },
  saveText: { fontSize: 13, fontWeight: '700', color: '#111' },
});
