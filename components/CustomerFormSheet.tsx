/**
 * CustomerFormSheet — Create and Edit modal for Customers.
 *
 * Web:    centred dialog (max-width 560px)
 * Native: full-screen modal with ScrollView
 *
 * Usage:
 *   <CustomerFormSheet
 *     visible={showForm}
 *     onClose={() => setShowForm(false)}
 *     onSaved={() => { setShowForm(false); reload(); }}
 *     customer={existingCustomer}   // undefined → create mode
 *   />
 */
import {
  View, Text, TextInput, TouchableOpacity, Modal,
  ScrollView, ActivityIndicator, Alert, StyleSheet,
  Platform, KeyboardAvoidingView, Switch,
} from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { customersApi, Customer } from '../services/api';
import { Colors } from '../constants/colors';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Field({
  label, required, children,
}: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <View style={s.fieldWrap}>
      <Text style={s.label}>
        {label}
        {required ? <Text style={s.req}> *</Text> : null}
      </Text>
      {children}
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
  customer?: Customer | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CustomerFormSheet({ visible, onClose, onSaved, customer }: Props) {
  const isEdit = !!customer;

  // Form state
  const [customerName, setCustomerName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [phone,        setPhone]        = useState('');
  const [email,        setEmail]        = useState('');
  const [address,      setAddress]      = useState('');
  const [gstin,        setGstin]        = useState('');
  const [isActive,     setIsActive]     = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState('');

  // Pre-fill on edit
  useEffect(() => {
    if (!visible) return;
    if (customer) {
      setCustomerName(customer.customerName);
      setBusinessName(customer.businessName ?? '');
      setPhone(customer.phone ?? '');
      setEmail(customer.email ?? '');
      setAddress(customer.address ?? '');
      setGstin(customer.gstin ?? '');
      setIsActive(customer.isActive);
    } else {
      setCustomerName('');
      setBusinessName('');
      setPhone('');
      setEmail('');
      setAddress('');
      setGstin('');
      setIsActive(true);
    }
    setError('');
  }, [visible, customer]);

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!customerName.trim()) {
      setError('Customer name is required.'); return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        customerName: customerName.trim(),
        businessName: businessName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
        gstin: gstin.trim(),
        isActive,
      };
      if (isEdit) {
        await customersApi.update(customer!.id, payload);
        onSaved();
      } else {
        const { data } = await customersApi.create(payload);
        onSaved(data.customer.id); // pass new ID so caller can navigate
      }
    } catch (e: any) {
      const msg = e?.response?.data?.error ?? 'Could not save customer. Please try again.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  // ── Form body (shared between web dialog and native modal) ────────────────
  const formBody = (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={s.body}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Error banner */}
      {error ? (
        <View style={s.errorBox}>
          <Ionicons name="alert-circle-outline" size={15} color={Colors.error} />
          <Text style={s.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Customer code — read-only in edit mode */}
      {isEdit && customer?.customerCode ? (
        <View style={s.codeChip}>
          <Ionicons name="pricetag-outline" size={13} color={Colors.textMuted} />
          <Text style={s.codeChipText}>{customer.customerCode}</Text>
        </View>
      ) : null}

      <Field label="Customer Name" required>
        <StyledInput
          value={customerName}
          onChangeText={setCustomerName}
          placeholder="Enter customer name"
          autoCapitalize="words"
          returnKeyType="next"
        />
      </Field>

      <Field label="Business / Company Name">
        <StyledInput
          value={businessName}
          onChangeText={setBusinessName}
          placeholder="Optional"
          autoCapitalize="words"
          returnKeyType="next"
        />
      </Field>

      <Field label="Phone">
        <StyledInput
          value={phone}
          onChangeText={setPhone}
          placeholder="+91 XXXXX XXXXX"
          keyboardType="phone-pad"
          returnKeyType="next"
        />
      </Field>

      <Field label="Email">
        <StyledInput
          value={email}
          onChangeText={setEmail}
          placeholder="customer@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          returnKeyType="next"
        />
      </Field>

      <Field label="Address">
        <StyledInput
          value={address}
          onChangeText={setAddress}
          placeholder="Full address"
          multiline
          numberOfLines={3}
          style={{ height: 80, textAlignVertical: 'top', paddingTop: 10 }}
          returnKeyType="next"
        />
      </Field>

      <Field label="GSTIN">
        <StyledInput
          value={gstin}
          onChangeText={v => setGstin(v.toUpperCase())}
          placeholder="22AAAAA0000A1Z5"
          autoCapitalize="characters"
          maxLength={15}
          returnKeyType="done"
        />
      </Field>

      {/* isActive toggle — only meaningful in edit mode */}
      {isEdit && (
        <View style={s.toggleRow}>
          <View>
            <Text style={s.toggleLabel}>Active Status</Text>
            <Text style={s.toggleSub}>Inactive customers cannot receive new orders</Text>
          </View>
          <Switch
            value={isActive}
            onValueChange={setIsActive}
            trackColor={{ true: Colors.success, false: Colors.border }}
            thumbColor={isActive ? '#fff' : '#fff'}
          />
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
            {/* Header */}
            <View style={w.header}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="person-outline" size={18} color={Colors.accent} />
                <Text style={w.headerTitle}>{isEdit ? 'Edit Customer' : 'New Customer'}</Text>
                {isEdit && customer?.customerCode ? (
                  <Text style={w.headerSub}>{customer.customerCode}</Text>
                ) : null}
              </View>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                <TouchableOpacity style={w.cancelBtn} onPress={onClose} disabled={saving}>
                  <Text style={w.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[w.saveBtn, saving && { opacity: 0.6 }]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#111" />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={15} color="#111" />
                      <Text style={w.saveText}>{isEdit ? 'Update' : 'Create Customer'}</Text>
                    </>
                  )}
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
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={s.header}>
          <Text style={s.headerTitle}>{isEdit ? 'Edit Customer' : 'New Customer'}</Text>
          <TouchableOpacity onPress={onClose} style={s.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {formBody}

        {/* Footer actions */}
        <View style={s.footer}>
          <TouchableOpacity style={s.cancelBtn} onPress={onClose} disabled={saving}>
            <Text style={s.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.saveBtn, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#111" />
            ) : (
              <Text style={s.saveText}>{isEdit ? 'Update Customer' : 'Create Customer'}</Text>
            )}
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
  fieldWrap: { marginBottom: 16 },
  label:     { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6 },
  req:       { color: Colors.error },

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
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-start', backgroundColor: Colors.background,
    borderWidth: 1, borderColor: Colors.border, borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4, marginBottom: 16,
  },
  codeChipText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },

  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 6, padding: 14, marginBottom: 16,
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
    justifyContent: 'center', alignItems: 'center',
    flexDirection: 'row', gap: 6,
  },
  saveText: { fontSize: 14, fontWeight: '700', color: '#111' },
});

// ─── Web-only styles ───────────────────────────────────────────────────────────

const w = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center', alignItems: 'center', padding: 20,
  },
  dialog: {
    width: '100%', maxWidth: 560, maxHeight: '90%',
    backgroundColor: Colors.background, borderRadius: 12, overflow: 'hidden',
    ...Platform.select({
      web: { boxShadow: '0 12px 32px rgba(0,0,0,0.35)' },
      default: { elevation: 20 },
    }),
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
