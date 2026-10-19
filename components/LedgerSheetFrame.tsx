import {
  View, Text, TouchableOpacity, StyleSheet, Modal, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView, Dimensions,
} from 'react-native';
import { ReactNode } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

// Shell shared by the ledger's form sheets (ReceiptFormSheet,
// LedgerEntrySheet): the same two layouts InvoiceFormSheet uses — a centred
// dialog with header actions on web, a full-screen slide-up modal with
// bottom buttons on native. Only the form body differs per sheet.

interface Props {
  visible: boolean;
  title: string;
  subtitle?: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  saving: boolean;
  saveLabel: string;
  onSave: () => void;
  onClose: () => void;
  // Optional left-hand footer action, e.g. Delete in edit mode
  extraAction?: { label: string; onPress: () => void; destructive?: boolean };
  children: ReactNode;
}

export default function LedgerSheetFrame({
  visible, title, subtitle, icon, saving, saveLabel, onSave, onClose, extraAction, children,
}: Props) {
  if (Platform.OS === 'web') {
    const maxHeight = Dimensions.get('window').height * 0.92;
    return (
      <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
        <View style={w.backdrop}>
          <View style={[w.dialog, { maxHeight }]}>
            <View style={w.header}>
              <View style={w.headerLeft}>
                <Ionicons name={icon} size={18} color={Colors.accent} />
                <Text style={w.headerTitle}>{title}</Text>
                {subtitle ? <Text style={w.headerSub} numberOfLines={1}>{subtitle}</Text> : null}
              </View>
              <View style={w.headerActions}>
                {extraAction && (
                  <TouchableOpacity style={w.extraBtn} onPress={extraAction.onPress} disabled={saving}>
                    <Text style={[w.extraText, extraAction.destructive && { color: '#FF8A75' }]}>{extraAction.label}</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={w.cancelBtn} onPress={onClose} disabled={saving}>
                  <Text style={w.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[w.saveBtn, saving && { opacity: 0.6 }]} onPress={onSave} disabled={saving}>
                  {saving ? <ActivityIndicator size="small" color="#111" /> : (
                    <><Ionicons name="checkmark" size={15} color="#111" /><Text style={w.saveText}>{saveLabel}</Text></>
                  )}
                </TouchableOpacity>
              </View>
            </View>
            <ScrollView contentContainerStyle={w.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {children}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>{title}</Text>
            {subtitle ? <Text style={s.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
          </View>
          <TouchableOpacity onPress={onClose} style={s.closeBtn}>
            <Ionicons name="close" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <ScrollView style={{ flex: 1, backgroundColor: Colors.background }} contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
          {children}
          <View style={s.actions}>
            <TouchableOpacity style={s.cancelBtn} onPress={onClose} disabled={saving}>
              <Text style={s.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={onSave} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color="#111" /> : <Text style={s.saveText}>{saveLabel}</Text>}
            </TouchableOpacity>
          </View>
          {extraAction && (
            <TouchableOpacity style={s.extraBtn} onPress={extraAction.onPress} disabled={saving}>
              <Text style={[s.extraText, extraAction.destructive && { color: Colors.error }]}>{extraAction.label}</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const w = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  dialog: {
    width: '100%', maxWidth: 640, backgroundColor: Colors.background, borderRadius: 12, overflow: 'hidden',
    ...Platform.select({ web: { boxShadow: '0 12px 32px rgba(0,0,0,0.35)' } }),
  },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 24, paddingVertical: 14, backgroundColor: Colors.primary },
  headerLeft:    { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  headerTitle:   { fontSize: 17, fontWeight: '700', color: '#fff' },
  headerSub:     { fontSize: 12, color: Colors.accent, fontWeight: '600', marginLeft: 4, flexShrink: 1 },
  headerActions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  extraBtn:      { paddingHorizontal: 10, paddingVertical: 8 },
  extraText:     { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.85)' },
  cancelBtn:     { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  cancelText:    { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.85)' },
  saveBtn:       { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 18, paddingVertical: 8, borderRadius: 6, backgroundColor: Colors.accent },
  saveText:      { fontSize: 13, fontWeight: '700', color: '#111' },
  body:          { padding: 24 },
});

const s = StyleSheet.create({
  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 60 : 24, paddingBottom: 14, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title:      { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  subtitle:   { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  closeBtn:   { padding: 4 },
  body:       { padding: 16, paddingBottom: 48 },
  actions:    { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn:  { flex: 1, paddingVertical: 14, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  cancelText: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
  saveBtn:    { flex: 2, paddingVertical: 14, borderRadius: 8, backgroundColor: Colors.accent, alignItems: 'center' },
  saveText:   { fontSize: 15, fontWeight: '700', color: '#111' },
  extraBtn:   { alignItems: 'center', paddingVertical: 14, marginTop: 8 },
  extraText:  { fontSize: 14, fontWeight: '700', color: Colors.textSecondary },
});
