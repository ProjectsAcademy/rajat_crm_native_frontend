import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { purchasesApi, PurchaseDetail } from '../../../services/api';
import { Colors } from '../../../constants/colors';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft:     { bg: Colors.border,        text: Colors.textMuted },
  ordered:   { bg: '#E3F2FD',            text: '#1565C0'        },
  received:  { bg: Colors.successLight,  text: Colors.success   },
  partial:   { bg: '#FFF3E0',            text: '#E65100'        },
  cancelled: { bg: Colors.errorLight,    text: Colors.error     },
};
const PAY_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: Colors.errorLight,   text: Colors.error   },
  partial: { bg: '#FFF3E0',           text: '#E65100'      },
  paid:    { bg: Colors.successLight, text: Colors.success },
};

function fmtAmt(v: string) { const n=parseFloat(v||'0'); if(n>=100000) return `₹${(n/100000).toFixed(2)}L`; return `₹${n.toLocaleString('en-IN',{minimumFractionDigits:2})}`; }
function fmtDate(d: string) { return new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}); }

export default function PurchaseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [purchase, setPurchase] = useState<PurchaseDetail | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  useEffect(() => {
    purchasesApi.detail(parseInt(id!))
      .then(({ data }) => setPurchase(data.purchase))
      .catch(() => setError('Could not load purchase.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={Colors.accent} /></View>;
  if (error || !purchase) return (
    <View style={styles.center}>
      <Ionicons name="alert-circle-outline" size={40} color={Colors.textMuted} />
      <Text style={styles.errorText}>{error || 'Not found'}</Text>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Text style={styles.backBtnText}>Go Back</Text></TouchableOpacity>
    </View>
  );

  const sc = STATUS_COLORS[purchase.status] ?? STATUS_COLORS.draft;
  const pc = PAY_COLORS[purchase.paymentStatus] ?? PAY_COLORS.pending;
  const balance = parseFloat(purchase.totalAmount) - parseFloat(purchase.paidAmount);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.purchaseNo}>{purchase.purchaseNo}</Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {purchase.isGst && <View style={styles.gstBadge}><Text style={styles.gstText}>GST</Text></View>}
              <View style={[styles.badge, { backgroundColor: sc.bg }]}>
                <Text style={[styles.badgeText, { color: sc.text }]}>{purchase.status.toUpperCase()}</Text>
              </View>
            </View>
          </View>
          <Text style={styles.vendorName}>{purchase.vendor?.name ?? 'Unknown Vendor'}</Text>
          {purchase.vendor && <Text style={styles.vendorCode}>{purchase.vendor.vendorCode}</Text>}
          <Text style={styles.dateText}>
            Date: {fmtDate(purchase.purchaseDate)}
            {purchase.deliveryDate ? `  ·  Delivery: ${fmtDate(purchase.deliveryDate)}` : ''}
          </Text>
        </View>

        {/* Financials */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Total</Text>
            <Text style={styles.statValue}>{fmtAmt(purchase.totalAmount)}</Text>
          </View>
          <View style={[styles.statBox, styles.statBorder]}>
            <Text style={styles.statLabel}>Paid</Text>
            <Text style={[styles.statValue, { color: Colors.success }]}>{fmtAmt(purchase.paidAmount)}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Balance</Text>
            <Text style={[styles.statValue, { color: balance > 0 ? Colors.error : Colors.success }]}>{fmtAmt(balance.toString())}</Text>
          </View>
        </View>

        {/* Payment chip */}
        <View style={styles.chipRow}>
          <View style={[styles.chip, { backgroundColor: pc.bg }]}>
            <View style={[styles.dot, { backgroundColor: pc.text }]} />
            <Text style={[styles.chipText, { color: pc.text }]}>{purchase.paymentStatus.toUpperCase()}</Text>
          </View>
          {purchase.taxAmount && parseFloat(purchase.taxAmount) > 0 && (
            <View style={[styles.chip, { backgroundColor: Colors.infoLight }]}>
              <Text style={[styles.chipText, { color: Colors.info }]}>Tax: {fmtAmt(purchase.taxAmount)}</Text>
            </View>
          )}
        </View>

        {/* Items */}
        {purchase.items.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Items ({purchase.items.length})</Text>
            <View style={styles.card}>
              {purchase.items.map((it, i) => (
                <View key={it.id} style={[styles.itemRow, i > 0 && styles.itemBorder]}>
                  <View style={styles.itemLeft}>
                    {it.inventory && <Text style={styles.itemCode}>{it.inventory.itemCode}</Text>}
                    <Text style={styles.itemName}>{it.inventory?.name ?? '—'}</Text>
                    <Text style={styles.itemMeta}>
                      {parseFloat(it.quantity).toFixed(2)} {it.inventory?.unit ?? 'pcs'} × {fmtAmt(it.unitPrice)}
                      {parseFloat(it.taxRate) > 0 ? ` + ${it.taxRate}% GST` : ''}
                    </Text>
                  </View>
                  <Text style={styles.itemTotal}>{fmtAmt(it.total)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Vendor contact */}
        {purchase.vendor && (purchase.vendor.phone || purchase.vendor.email || purchase.vendor.gstin) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Vendor</Text>
            <View style={styles.card}>
              {purchase.vendor.phone ? (
                <View style={styles.detailRow}><Ionicons name="call-outline" size={14} color={Colors.textMuted} /><Text style={styles.detailText}>{purchase.vendor.phone}</Text></View>
              ) : null}
              {purchase.vendor.email ? (
                <View style={styles.detailRow}><Ionicons name="mail-outline" size={14} color={Colors.textMuted} /><Text style={styles.detailText}>{purchase.vendor.email}</Text></View>
              ) : null}
              {purchase.vendor.gstin ? (
                <View style={styles.detailRow}><Ionicons name="business-outline" size={14} color={Colors.textMuted} /><Text style={styles.detailText}>GST: {purchase.vendor.gstin}</Text></View>
              ) : null}
            </View>
          </View>
        )}

        {/* Notes */}
        {purchase.notes ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <View style={styles.card}><Text style={styles.notes}>{purchase.notes}</Text></View>
          </View>
        ) : null}
      </ScrollView>
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
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  purchaseNo: { fontSize: 13, fontWeight: '700', color: Colors.accent, letterSpacing: 0.5 },
  gstBadge: { backgroundColor: '#E3F2FD', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  gstText:  { fontSize: 10, fontWeight: '800', color: '#1565C0' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 },
  badgeText: { fontSize: 10, fontWeight: '800' },
  vendorName: { fontSize: 18, fontWeight: '700', color: '#fff', lineHeight: 24 },
  vendorCode: { fontSize: 12, color: Colors.accent, marginTop: 2, fontWeight: '600' },
  dateText:   { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 6 },

  statsRow: { flexDirection: 'row', backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  statBox:  { flex: 1, padding: 14, alignItems: 'center' },
  statBorder: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: Colors.border },
  statLabel: { fontSize: 10, color: Colors.textMuted, marginBottom: 4, fontWeight: '500' },
  statValue: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center' },

  chipRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingTop: 14, flexWrap: 'wrap' },
  chip:    { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  dot:     { width: 7, height: 7, borderRadius: 4 },
  chipText:{ fontSize: 12, fontWeight: '700' },

  section:      { marginTop: 16, paddingHorizontal: 14 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  card:         { backgroundColor: Colors.surface, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },

  itemRow:   { padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  itemBorder:{ borderTopWidth: 1, borderTopColor: Colors.border },
  itemLeft:  { flex: 1 },
  itemCode:  { fontSize: 10, fontWeight: '700', color: Colors.accent, marginBottom: 2 },
  itemName:  { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  itemMeta:  { fontSize: 11, color: Colors.textMuted, marginTop: 3 },
  itemTotal: { fontSize: 14, fontWeight: '800', color: Colors.textPrimary },

  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  detailText:{ fontSize: 13, color: Colors.textPrimary },
  notes: { padding: 14, fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },
});
