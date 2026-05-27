import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { estimatesApi, EstimateDetail } from '../../../services/api';
import { Colors } from '../../../constants/colors';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft:    { bg: Colors.border,       text: Colors.textMuted },
  sent:     { bg: '#E3F2FD',           text: '#1565C0'        },
  accepted: { bg: Colors.successLight, text: Colors.success   },
  rejected: { bg: Colors.errorLight,  text: Colors.error     },
  expired:  { bg: '#F5F5F5',          text: '#757575'        },
};

function fmtAmt(v: string) {
  const n = parseFloat(v || '0');
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function EstimateDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [estimate, setEstimate] = useState<EstimateDetail | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  useEffect(() => {
    estimatesApi.detail(parseInt(id!))
      .then(({ data }) => setEstimate(data.estimate))
      .catch(() => setError('Could not load estimate.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={Colors.accent} /></View>;
  if (error || !estimate) return (
    <View style={styles.center}>
      <Ionicons name="alert-circle-outline" size={40} color={Colors.textMuted} />
      <Text style={styles.errorText}>{error || 'Not found'}</Text>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Text style={styles.backBtnText}>Go Back</Text>
      </TouchableOpacity>
    </View>
  );

  const sc = STATUS_COLORS[estimate.status] ?? STATUS_COLORS.draft;
  const isExpired = estimate.status !== 'accepted' && estimate.status !== 'rejected' && new Date(estimate.validUntil) < new Date();

  const totalItems = estimate.items.reduce((sum, it) => sum + parseFloat(it.total || '0'), 0);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.estNo}>{estimate.estimateNo}</Text>
            <View style={[styles.badge, { backgroundColor: sc.bg }]}>
              <Text style={[styles.badgeText, { color: sc.text }]}>{estimate.status.toUpperCase()}</Text>
            </View>
          </View>
          {estimate.customer && <Text style={styles.customerName}>{estimate.customer.customerName}</Text>}
          {estimate.project && <Text style={styles.projectName}>{estimate.project.projectNo} · {estimate.project.name}</Text>}
          <View style={styles.dates}>
            <Text style={styles.dateItem}>Date: {fmtDate(estimate.estimateDate)}</Text>
            <Text style={[styles.dateItem, isExpired && { color: Colors.error }]}>
              Valid: {fmtDate(estimate.validUntil)}{isExpired ? ' (Expired)' : ''}
            </Text>
          </View>
        </View>

        {/* Total */}
        <View style={styles.totalBar}>
          <Text style={styles.totalLabel}>Total Amount</Text>
          <Text style={styles.totalValue}>{fmtAmt(estimate.totalAmount)}</Text>
        </View>

        {/* Line items */}
        {estimate.items.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Line Items ({estimate.items.length})</Text>
            <View style={styles.card}>
              {estimate.items.map((it, i) => (
                <View key={it.id} style={[styles.itemRow, i > 0 && styles.itemBorder]}>
                  <View style={styles.itemLeft}>
                    <Text style={styles.itemDesc}>{it.description || '—'}</Text>
                    <Text style={styles.itemMeta}>
                      {parseFloat(it.quantity).toFixed(2)} × {fmtAmt(it.unitPrice)}
                    </Text>
                  </View>
                  <Text style={styles.itemTotal}>{fmtAmt(it.total)}</Text>
                </View>
              ))}
              <View style={[styles.itemRow, styles.itemBorder, { backgroundColor: Colors.background }]}>
                <Text style={[styles.itemDesc, { flex: 1 }]}>Total</Text>
                <Text style={[styles.itemTotal, { color: '#E65100' }]}>{fmtAmt(String(totalItems))}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Customer details */}
        {estimate.customer && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Customer</Text>
            <View style={styles.card}>
              {estimate.customer.phone ? (
                <View style={styles.detailRow}><Ionicons name="call-outline" size={14} color={Colors.textMuted} /><Text style={styles.detailText}>{estimate.customer.phone}</Text></View>
              ) : null}
              {estimate.customer.email ? (
                <View style={styles.detailRow}><Ionicons name="mail-outline" size={14} color={Colors.textMuted} /><Text style={styles.detailText}>{estimate.customer.email}</Text></View>
              ) : null}
              {estimate.customer.address ? (
                <View style={styles.detailRow}><Ionicons name="location-outline" size={14} color={Colors.textMuted} /><Text style={styles.detailText}>{estimate.customer.address}</Text></View>
              ) : null}
            </View>
          </View>
        )}

        {/* Notes */}
        {estimate.notes ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <View style={styles.card}><Text style={styles.notes}>{estimate.notes}</Text></View>
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

  header:     { backgroundColor: Colors.primary, padding: 20 },
  headerTop:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  estNo:      { fontSize: 14, fontWeight: '700', color: Colors.accent, letterSpacing: 0.5 },
  badge:      { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 },
  badgeText:  { fontSize: 10, fontWeight: '800' },
  customerName: { fontSize: 18, fontWeight: '700', color: '#fff' },
  projectName:  { fontSize: 12, color: Colors.accent, marginTop: 2, fontWeight: '600' },
  dates:        { flexDirection: 'row', gap: 14, marginTop: 8, flexWrap: 'wrap' },
  dateItem:     { fontSize: 11, color: 'rgba(255,255,255,0.65)' },

  totalBar:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.surface, padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  totalLabel: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },
  totalValue: { fontSize: 22, fontWeight: '800', color: '#E65100' },

  section:      { marginTop: 16, paddingHorizontal: 14 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  card:         { backgroundColor: Colors.surface, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },

  itemRow:   { padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  itemBorder:{ borderTopWidth: 1, borderTopColor: Colors.border },
  itemLeft:  { flex: 1 },
  itemDesc:  { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  itemMeta:  { fontSize: 11, color: Colors.textMuted, marginTop: 3 },
  itemTotal: { fontSize: 14, fontWeight: '800', color: Colors.textPrimary },

  detailRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  detailText: { fontSize: 13, color: Colors.textPrimary },
  notes:      { padding: 14, fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },
});
