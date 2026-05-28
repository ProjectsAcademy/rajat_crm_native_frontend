import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ordersApi, OrderDetail, OrderPayment } from '../../../services/api';
import { Colors } from '../../../constants/colors';
import MediaSection from '../../../components/MediaSection';
import OrderFormSheet from '../../../components/OrderFormSheet';
import PaymentFormSheet from '../../../components/PaymentFormSheet';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending:     { bg: '#FFF8E1', text: '#F57F17' },
  confirmed:   { bg: '#E3F2FD', text: '#1565C0' },
  in_progress: { bg: '#E8EAF6', text: '#283593' },
  ready:       { bg: '#FFF3E0', text: '#E65100' },
  delivered:   { bg: Colors.successLight, text: Colors.success },
  cancelled:   { bg: Colors.errorLight,   text: Colors.error   },
};
const PAY_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: Colors.errorLight,   text: Colors.error   },
  partial: { bg: '#FFF3E0',           text: '#E65100'      },
  paid:    { bg: Colors.successLight, text: Colors.success },
};
const MODE_ICONS: Record<string, any> = {
  cash: 'cash-outline', upi: 'phone-portrait-outline', neft: 'swap-horizontal-outline',
  check: 'document-outline', other: 'ellipsis-horizontal-outline',
};

function fmtAmt(v: string) { const n = parseFloat(v||'0'); if(n>=100000) return `₹${(n/100000).toFixed(2)}L`; return `₹${n.toLocaleString('en-IN',{minimumFractionDigits:2})}`; }
function fmtDate(d: string) { return new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}); }

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order,       setOrder]       = useState<OrderDetail | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [showEdit,    setShowEdit]    = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [editPayment, setEditPayment] = useState<OrderPayment | null>(null);
  const [deleting,    setDeleting]    = useState(false);

  const loadOrder = useCallback(() => {
    ordersApi.detail(parseInt(id!))
      .then(({ data }) => setOrder(data.order))
      .catch(() => setError('Could not load order.'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { loadOrder(); }, [loadOrder]);

  const handleDelete = () => {
    const msg = `Delete order "${order?.orderNo}"? This will also remove all items, payments and attachments. This cannot be undone.`;

    const doDelete = async () => {
      setDeleting(true);
      try {
        await ordersApi.remove(parseInt(id!));
        router.back();
      } catch {
        Alert.alert('Error', 'Could not delete order.');
        setDeleting(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(msg)) doDelete();
      return;
    }

    Alert.alert('Delete Order', msg, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: doDelete },
    ]);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={Colors.accent} /></View>;
  if (error || !order) return (
    <View style={styles.center}>
      <Ionicons name="alert-circle-outline" size={40} color={Colors.textMuted} />
      <Text style={styles.errorText}>{error || 'Not found'}</Text>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Text style={styles.backBtnText}>Go Back</Text></TouchableOpacity>
    </View>
  );

  const sc = STATUS_COLORS[order.status] ?? STATUS_COLORS.pending;
  const pc = PAY_COLORS[order.paymentStatus] ?? PAY_COLORS.pending;
  const balance = parseFloat(order.totalAmount) - parseFloat(order.paidAmount);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.orderNo}>{order.orderNo}</Text>
            <View style={[styles.badge, { backgroundColor: sc.bg }]}>
              <Text style={[styles.badgeText, { color: sc.text }]}>{order.status.replace('_',' ').toUpperCase()}</Text>
            </View>
          </View>
          {order.customer && <Text style={styles.customerName}>{order.customer.customerName}</Text>}
          {order.project  && <Text style={styles.projectName}>{order.project.projectNo} · {order.project.name}</Text>}
          <Text style={styles.dateText}>Date: {fmtDate(order.orderDate)}{order.deliveryDate ? `  ·  Due: ${fmtDate(order.deliveryDate)}` : ''}</Text>

          {/* Action buttons */}
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.editBtn} onPress={() => setShowEdit(true)}>
              <Ionicons name="pencil-outline" size={14} color={Colors.accent} />
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} disabled={deleting}>
              {deleting
                ? <ActivityIndicator size="small" color={Colors.error} />
                : <><Ionicons name="trash-outline" size={14} color={Colors.error} /><Text style={styles.deleteBtnText}>Delete</Text></>
              }
            </TouchableOpacity>
          </View>
        </View>

        {/* Financials */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Total</Text>
            <Text style={styles.statValue}>{fmtAmt(order.totalAmount)}</Text>
          </View>
          <View style={[styles.statBox, styles.statBorder]}>
            <Text style={styles.statLabel}>Paid</Text>
            <Text style={[styles.statValue, { color: Colors.success }]}>{fmtAmt(order.paidAmount)}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Balance</Text>
            <Text style={[styles.statValue, { color: balance > 0 ? Colors.error : Colors.success }]}>{fmtAmt(balance.toString())}</Text>
          </View>
        </View>

        {/* Payment status chip */}
        <View style={styles.chipRow}>
          <View style={[styles.chip, { backgroundColor: pc.bg }]}>
            <View style={[styles.dot, { backgroundColor: pc.text }]} />
            <Text style={[styles.chipText, { color: pc.text }]}>{order.paymentStatus.toUpperCase()}</Text>
          </View>
          {order.taxAmount && parseFloat(order.taxAmount) > 0 && (
            <View style={[styles.chip, { backgroundColor: Colors.infoLight }]}>
              <Text style={[styles.chipText, { color: Colors.info }]}>Tax: {fmtAmt(order.taxAmount)}</Text>
            </View>
          )}
        </View>

        {/* Items */}
        {order.items.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Items ({order.items.length})</Text>
            <View style={styles.card}>
              {order.items.map((it, i) => (
                <View key={it.id} style={[styles.itemRow, i > 0 && styles.itemBorder]}>
                  <View style={styles.itemLeft}>
                    {it.inventory && <Text style={styles.itemCode}>{it.inventory.itemCode}</Text>}
                    <Text style={styles.itemDesc}>{it.description || it.inventory?.name || '—'}</Text>
                    <Text style={styles.itemMeta}>{parseFloat(it.quantity).toFixed(2)} {it.inventory?.unit ?? 'pcs'} × {fmtAmt(it.unitPrice)}</Text>
                  </View>
                  <View style={styles.itemRight}>
                    <Text style={styles.itemTotal}>{fmtAmt(it.totalPrice)}</Text>
                    {it.isRental && <Text style={styles.rentalTag}>RENTAL</Text>}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Payments */}
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Payments ({order.payments.length})</Text>
            <TouchableOpacity style={styles.addPayBtn} onPress={() => setShowPayment(true)}>
              <Ionicons name="add" size={14} color={Colors.accent} />
              <Text style={styles.addPayBtnText}>Add Payment</Text>
            </TouchableOpacity>
          </View>
          {order.payments.length > 0 && (
            <View style={styles.card}>
              {order.payments.map((p, i) => (
                <View key={p.id} style={[styles.payRow, i > 0 && styles.itemBorder]}>
                  <View style={styles.payIconBox}>
                    <Ionicons name={MODE_ICONS[p.paymentMode] ?? 'cash-outline'} size={16} color={Colors.success} />
                  </View>
                  <View style={styles.payBody}>
                    <Text style={styles.payMode}>{p.paymentMode.toUpperCase()}</Text>
                    {p.referenceNo ? <Text style={styles.payRef}>{p.referenceNo}</Text> : null}
                    <Text style={styles.payDate}>{fmtDate(p.paymentDate)}</Text>
                  </View>
                  <Text style={styles.payAmt}>{fmtAmt(p.amount)}</Text>
                  <TouchableOpacity
                    style={styles.payEditBtn}
                    onPress={() => { setEditPayment(p); setShowPayment(true); }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="pencil-outline" size={14} color={Colors.accent} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Notes */}
        {order.notes ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <View style={styles.card}><Text style={styles.notes}>{order.notes}</Text></View>
          </View>
        ) : null}

        {/* Attachments */}
        <View style={styles.section}>
          <MediaSection entity="order" entityId={order.id} files={order.mediaFiles ?? []} onRefresh={loadOrder} />
        </View>
      </ScrollView>

      <OrderFormSheet
        visible={showEdit}
        onClose={() => setShowEdit(false)}
        onSaved={() => loadOrder()}
        order={order}
      />
      <PaymentFormSheet
        visible={showPayment}
        orderId={order.id}
        payment={editPayment}
        onClose={() => { setShowPayment(false); setEditPayment(null); }}
        onSaved={loadOrder}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: Colors.background },
  content:   { paddingBottom: 40 },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  errorText: { color: Colors.textSecondary, fontSize: 14 },
  backBtn:   { backgroundColor: Colors.accent, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 4 },
  backBtnText:{ color: '#111', fontWeight: '700' },

  header:        { backgroundColor: Colors.primary, padding: 20 },
  headerTop:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  orderNo:       { fontSize: 13, fontWeight: '700', color: Colors.accent, letterSpacing: 0.5 },
  badge:         { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 },
  badgeText:     { fontSize: 10, fontWeight: '800' },
  customerName:  { fontSize: 18, fontWeight: '700', color: '#fff', lineHeight: 24 },
  projectName:   { fontSize: 12, color: Colors.accent, marginTop: 2, fontWeight: '600' },
  dateText:      { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 6 },

  headerActions: { flexDirection: 'row', gap: 8, marginTop: 14 },
  editBtn:       { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,153,0,0.15)', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: Colors.accent },
  editBtnText:   { fontSize: 13, fontWeight: '600', color: Colors.accent },
  deleteBtn:     { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(209,50,18,0.12)', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: Colors.error },
  deleteBtnText: { fontSize: 13, fontWeight: '600', color: Colors.error },

  statsRow:   { flexDirection: 'row', backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  statBox:    { flex: 1, padding: 14, alignItems: 'center' },
  statBorder: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: Colors.border },
  statLabel:  { fontSize: 10, color: Colors.textMuted, marginBottom: 4, fontWeight: '500' },
  statValue:  { fontSize: 16, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center' },

  chipRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingTop: 14, flexWrap: 'wrap' },
  chip:    { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  dot:     { width: 7, height: 7, borderRadius: 4 },
  chipText:{ fontSize: 12, fontWeight: '700' },

  section:      { marginTop: 16, paddingHorizontal: 14 },
  sectionRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8 },
  addPayBtn:    { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.accentLight, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 },
  addPayBtnText:{ fontSize: 12, fontWeight: '600', color: Colors.accent },
  card:         { backgroundColor: Colors.surface, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },

  itemRow:   { padding: 14, flexDirection: 'row', gap: 12 },
  itemBorder:{ borderTopWidth: 1, borderTopColor: Colors.border },
  itemLeft:  { flex: 1 },
  itemCode:  { fontSize: 10, fontWeight: '700', color: Colors.accent, marginBottom: 2 },
  itemDesc:  { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  itemMeta:  { fontSize: 11, color: Colors.textMuted, marginTop: 3 },
  itemRight: { alignItems: 'flex-end', gap: 4 },
  itemTotal: { fontSize: 14, fontWeight: '800', color: Colors.textPrimary },
  rentalTag: { fontSize: 9, fontWeight: '700', color: '#6A1B9A', backgroundColor: '#F3E5F5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3 },

  payRow:    { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  payIconBox:{ width: 32, height: 32, borderRadius: 8, backgroundColor: Colors.successLight, justifyContent: 'center', alignItems: 'center' },
  payBody:   { flex: 1 },
  payMode:   { fontSize: 11, fontWeight: '800', color: Colors.textPrimary, letterSpacing: 0.3 },
  payRef:    { fontSize: 11, color: Colors.textSecondary, marginTop: 1 },
  payDate:   { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  payAmt:    { fontSize: 14, fontWeight: '800', color: Colors.success },
  payEditBtn:{ width: 28, height: 28, justifyContent: 'center', alignItems: 'center' },

  notes: { padding: 14, fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },
});
