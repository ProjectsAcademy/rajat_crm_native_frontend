import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { invoicesApi, InvoiceDetail } from '../../../services/api';
import { Colors } from '../../../constants/colors';
import MediaSection from '../../../components/MediaSection';
import InvoiceFormSheet from '../../../components/InvoiceFormSheet';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft:     { bg: Colors.border,       text: Colors.textMuted },
  sent:      { bg: '#E3F2FD',           text: '#1565C0'        },
  paid:      { bg: Colors.successLight, text: Colors.success   },
  overdue:   { bg: Colors.errorLight,   text: Colors.error     },
  cancelled: { bg: '#F5F5F5',           text: '#757575'        },
};

function fmtAmt(v: string) { const n=parseFloat(v||'0'); if(n>=100000) return `₹${(n/100000).toFixed(2)}L`; return `₹${n.toLocaleString('en-IN',{minimumFractionDigits:2})}`; }
function fmtDate(d: string) { return new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}); }

export default function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [showEdit, setShowEdit] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadInvoice = useCallback(() => {
    invoicesApi.detail(parseInt(id!))
      .then(({ data }) => setInvoice(data.invoice))
      .catch(() => setError('Could not load invoice.'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { loadInvoice(); }, [loadInvoice]);

  const handleDelete = () => {
    const doIt = async () => {
      setDeleting(true);
      try {
        await invoicesApi.remove(parseInt(id!));
        router.back();
      } catch (e: any) {
        const msg = e?.response?.data?.error ?? 'Could not delete invoice.';
        setDeleting(false);
        if (Platform.OS === 'web') window.alert(msg); else Alert.alert('Cannot Delete', msg);
      }
    };
    const label = invoice?.invoiceNo ?? 'this invoice';
    if (Platform.OS === 'web') {
      if (window.confirm(`Permanently delete "${label}"? This cannot be undone.`)) doIt();
      return;
    }
    Alert.alert('Delete Invoice', `Permanently delete "${label}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: doIt },
    ]);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={Colors.accent} /></View>;
  if (error || !invoice) return (
    <View style={styles.center}>
      <Ionicons name="alert-circle-outline" size={40} color={Colors.textMuted} />
      <Text style={styles.errorText}>{error || 'Not found'}</Text>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Text style={styles.backBtnText}>Go Back</Text></TouchableOpacity>
    </View>
  );

  const sc = STATUS_COLORS[invoice.status] ?? STATUS_COLORS.draft;
  const isOverdue = invoice.status === 'overdue' || (invoice.status !== 'paid' && invoice.status !== 'cancelled' && new Date(invoice.dueDate) < new Date());
  const counterpart = invoice.customer ?? invoice.vendor;
  const counterLabel = invoice.customer ? invoice.customer.customerName : invoice.vendor?.name ?? '—';

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.invoiceNo}>{invoice.invoiceNo}</Text>
              <View style={[styles.typeBadge, invoice.invoiceType === 'purchase' ? styles.typePurchase : styles.typeSales]}>
                <Text style={styles.typeText}>{invoice.invoiceType.toUpperCase()}</Text>
              </View>
            </View>
            <View style={[styles.badge, { backgroundColor: sc.bg }]}>
              <Text style={[styles.badgeText, { color: sc.text }]}>{invoice.status.toUpperCase()}</Text>
            </View>
          </View>
          <Text style={styles.counterName}>{counterLabel}</Text>
          {invoice.project && <Text style={styles.projectName}>{invoice.project.projectNo} · {invoice.project.name}</Text>}
          <View style={styles.dates}>
            <Text style={styles.dateItem}>Invoice: {fmtDate(invoice.invoiceDate)}</Text>
            <Text style={[styles.dateItem, isOverdue && { color: Colors.error }]}>Due: {fmtDate(invoice.dueDate)}</Text>
            {invoice.gstDate && <Text style={styles.dateItem}>GST: {fmtDate(invoice.gstDate)}</Text>}
          </View>
          {invoice.order && (
            <TouchableOpacity style={styles.orderLink} onPress={() => router.push(`/(app)/orders/${invoice.order!.id}` as any)}>
              <Ionicons name="receipt-outline" size={13} color={Colors.accent} />
              <Text style={styles.orderLinkText}>Created from order {invoice.order.orderNo}</Text>
            </TouchableOpacity>
          )}

          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.editBtn} onPress={() => setShowEdit(true)}>
              <Ionicons name="create-outline" size={15} color={Colors.accent} />
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.deleteBtn, deleting && { opacity: 0.6 }]} onPress={handleDelete} disabled={deleting}>
              {deleting ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="trash-outline" size={15} color="#fff" />}
              <Text style={styles.deleteBtnText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Totals */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Subtotal</Text>
            <Text style={styles.statValue}>{fmtAmt(invoice.subtotal)}</Text>
          </View>
          <View style={[styles.statBox, styles.statBorder]}>
            <Text style={styles.statLabel}>Tax</Text>
            <Text style={styles.statValue}>{fmtAmt(invoice.taxAmount)}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Total</Text>
            <Text style={[styles.statValue, { color: '#6A1B9A' }]}>{fmtAmt(invoice.totalAmount)}</Text>
          </View>
        </View>

        {/* Items */}
        {invoice.items.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Line Items ({invoice.items.length})</Text>
            <View style={styles.card}>
              {invoice.items.map((it, i) => (
                <View key={it.id} style={[styles.itemRow, i > 0 && styles.itemBorder]}>
                  <View style={styles.itemLeft}>
                    <Text style={styles.itemDesc}>{it.description || '—'}</Text>
                    <Text style={styles.itemMeta}>{parseFloat(it.quantity).toFixed(2)} × {fmtAmt(it.unitPrice)}{parseFloat(it.taxRate)>0 ? ` + ${it.taxRate}% tax` : ''}</Text>
                  </View>
                  <Text style={styles.itemTotal}>{fmtAmt(it.total)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Counterpart details */}
        {counterpart && (counterpart.phone || counterpart.email || (counterpart as any).gstin) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{invoice.customer ? 'Customer' : 'Vendor'}</Text>
            <View style={styles.card}>
              {counterpart.phone ? (
                <View style={styles.detailRow}><Ionicons name="call-outline" size={14} color={Colors.textMuted} /><Text style={styles.detailText}>{counterpart.phone}</Text></View>
              ) : null}
              {counterpart.email ? (
                <View style={styles.detailRow}><Ionicons name="mail-outline" size={14} color={Colors.textMuted} /><Text style={styles.detailText}>{counterpart.email}</Text></View>
              ) : null}
              {(counterpart as any).gstin ? (
                <View style={styles.detailRow}><Ionicons name="business-outline" size={14} color={Colors.textMuted} /><Text style={styles.detailText}>GST: {(counterpart as any).gstin}</Text></View>
              ) : null}
            </View>
          </View>
        )}

        {/* Notes */}
        {invoice.notes ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <View style={styles.card}><Text style={styles.notes}>{invoice.notes}</Text></View>
          </View>
        ) : null}

        {/* Attachments */}
        <View style={styles.section}>
          <MediaSection
            entity="invoice"
            entityId={invoice.id}
            files={invoice.mediaFiles ?? []}
            onRefresh={loadInvoice}
          />
        </View>
      </ScrollView>

      <InvoiceFormSheet
        visible={showEdit}
        invoice={invoice}
        onClose={() => setShowEdit(false)}
        onSaved={() => { setShowEdit(false); loadInvoice(); }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  errorText: { color: Colors.textSecondary, fontSize: 14 },
  backBtn: { backgroundColor: Colors.accent, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 4 },
  backBtnText: { color: '#111', fontWeight: '700' },

  header: { backgroundColor: Colors.primary, padding: 20 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  invoiceNo: { fontSize: 14, fontWeight: '700', color: Colors.accent, letterSpacing: 0.5, marginBottom: 4 },
  typeBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  typeSales:    { backgroundColor: '#E8F5E9' },
  typePurchase: { backgroundColor: '#FFF3E0' },
  typeText: { fontSize: 9, fontWeight: '800' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 },
  badgeText: { fontSize: 10, fontWeight: '800' },
  counterName: { fontSize: 18, fontWeight: '700', color: '#fff', lineHeight: 24 },
  projectName: { fontSize: 12, color: Colors.accent, marginTop: 2, fontWeight: '600' },
  dates: { flexDirection: 'row', gap: 14, marginTop: 8, flexWrap: 'wrap' },
  dateItem: { fontSize: 11, color: 'rgba(255,255,255,0.65)' },
  orderLink: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  orderLinkText: { fontSize: 12, color: Colors.accent, fontWeight: '600' },

  headerActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,153,0,0.15)', paddingHorizontal: 16,
    paddingVertical: 8, borderRadius: 6, borderWidth: 1,
    borderColor: 'rgba(255,153,0,0.4)',
  },
  editBtnText: { fontSize: 13, fontWeight: '700', color: Colors.accent },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.error, paddingHorizontal: 16,
    paddingVertical: 8, borderRadius: 6,
  },
  deleteBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  statsRow: { flexDirection: 'row', backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  statBox:  { flex: 1, padding: 14, alignItems: 'center' },
  statBorder: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: Colors.border },
  statLabel: { fontSize: 10, color: Colors.textMuted, marginBottom: 4, fontWeight: '500' },
  statValue: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center' },

  section:      { marginTop: 16, paddingHorizontal: 14 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  card:         { backgroundColor: Colors.surface, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },

  itemRow:   { padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  itemBorder:{ borderTopWidth: 1, borderTopColor: Colors.border },
  itemLeft:  { flex: 1 },
  itemDesc:  { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  itemMeta:  { fontSize: 11, color: Colors.textMuted, marginTop: 3 },
  itemTotal: { fontSize: 14, fontWeight: '800', color: Colors.textPrimary },

  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderTopWidth: 0 },
  detailText:{ fontSize: 13, color: Colors.textPrimary },
  notes: { padding: 14, fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },
});
