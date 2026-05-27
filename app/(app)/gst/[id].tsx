import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { gstApi, GstRecord } from '../../../services/api';
import { Colors } from '../../../constants/colors';

function fmtAmt(v: string) {
  const n = parseFloat(v || '0');
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function GstDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [record, setRecord] = useState<GstRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    gstApi.detail(parseInt(id!))
      .then(({ data }) => setRecord(data.record))
      .catch(() => setError('Could not load GST record.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={Colors.accent} /></View>;
  if (error || !record) return (
    <View style={styles.center}>
      <Ionicons name="alert-circle-outline" size={40} color={Colors.textMuted} />
      <Text style={styles.errorText}>{error || 'Not found'}</Text>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Text style={styles.backBtnText}>Go Back</Text>
      </TouchableOpacity>
    </View>
  );

  const party = record.customer?.customerName ?? record.vendor?.name ?? '—';
  const partyLabel = record.customer ? 'Customer' : 'Vendor';

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.gstNo}>{record.gstNo || 'No GST No.'}</Text>
              <Text style={styles.type}>{record.transactionType.toUpperCase()}</Text>
            </View>
            <View style={[styles.filedBadge, { backgroundColor: record.isFiled ? Colors.successLight : Colors.warningLight }]}>
              <Ionicons
                name={record.isFiled ? 'checkmark-circle' : 'time-outline'}
                size={12}
                color={record.isFiled ? Colors.success : '#7A5400'}
              />
              <Text style={[styles.filedText, { color: record.isFiled ? Colors.success : '#7A5400' }]}>
                {record.isFiled ? 'Filed' : 'Pending'}
              </Text>
            </View>
          </View>
          <Text style={styles.party}>{party}</Text>
          {record.invoiceNo ? <Text style={styles.invoiceNo}>Invoice: {record.invoiceNo}</Text> : null}
          <View style={styles.dates}>
            <Text style={styles.dateItem}>Date: {fmtDate(record.transactionDate)}</Text>
            {record.filingDate && <Text style={styles.dateItem}>Filed: {fmtDate(record.filingDate)}</Text>}
          </View>
        </View>

        {/* Tax breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tax Breakdown</Text>
          <View style={styles.card}>
            <View style={styles.taxRow}>
              <Text style={styles.taxLabel}>Taxable Amount</Text>
              <Text style={styles.taxValue}>{fmtAmt(record.taxableAmount)}</Text>
            </View>
            <View style={[styles.taxRow, styles.taxBorder]}>
              <Text style={styles.taxLabel}>GST Rate</Text>
              <Text style={styles.taxValue}>{record.gstRate}%</Text>
            </View>
            {parseFloat(record.cgst) > 0 && (
              <View style={[styles.taxRow, styles.taxBorder]}>
                <Text style={styles.taxLabel}>CGST</Text>
                <Text style={styles.taxValue}>{fmtAmt(record.cgst)}</Text>
              </View>
            )}
            {parseFloat(record.sgst) > 0 && (
              <View style={[styles.taxRow, styles.taxBorder]}>
                <Text style={styles.taxLabel}>SGST</Text>
                <Text style={styles.taxValue}>{fmtAmt(record.sgst)}</Text>
              </View>
            )}
            {parseFloat(record.igst) > 0 && (
              <View style={[styles.taxRow, styles.taxBorder]}>
                <Text style={styles.taxLabel}>IGST</Text>
                <Text style={styles.taxValue}>{fmtAmt(record.igst)}</Text>
              </View>
            )}
            <View style={[styles.taxRow, styles.taxBorder, { backgroundColor: Colors.background }]}>
              <Text style={[styles.taxLabel, { fontWeight: '700', color: Colors.textPrimary }]}>Total GST</Text>
              <Text style={[styles.taxValue, { color: '#1565C0', fontSize: 16 }]}>{fmtAmt(record.totalGst)}</Text>
            </View>
            <View style={[styles.taxRow, styles.taxBorder]}>
              <Text style={[styles.taxLabel, { fontWeight: '700', color: Colors.textPrimary }]}>Total Amount</Text>
              <Text style={[styles.taxValue, { fontSize: 18, fontWeight: '800' }]}>{fmtAmt(record.totalAmount)}</Text>
            </View>
          </View>
        </View>

        {/* Party details */}
        {(record.customer || record.vendor) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{partyLabel}</Text>
            <View style={styles.card}>
              {record.customer?.gstin || record.vendor?.gstin ? (
                <View style={styles.detailRow}>
                  <Ionicons name="business-outline" size={14} color={Colors.textMuted} />
                  <Text style={styles.detailText}>GSTIN: {record.customer?.gstin ?? record.vendor?.gstin}</Text>
                </View>
              ) : null}
              {record.customer?.phone || record.vendor?.phone ? (
                <View style={styles.detailRow}>
                  <Ionicons name="call-outline" size={14} color={Colors.textMuted} />
                  <Text style={styles.detailText}>{record.customer?.phone ?? record.vendor?.phone}</Text>
                </View>
              ) : null}
            </View>
          </View>
        )}

        {/* Notes */}
        {record.notes ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <View style={styles.card}><Text style={styles.notes}>{record.notes}</Text></View>
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

  header:    { backgroundColor: Colors.primary, padding: 20 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  gstNo:     { fontSize: 14, fontWeight: '700', color: Colors.accent, letterSpacing: 0.5 },
  type:      { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2, fontWeight: '600' },
  filedBadge:{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 },
  filedText: { fontSize: 11, fontWeight: '700' },
  party:     { fontSize: 18, fontWeight: '700', color: '#fff' },
  invoiceNo: { fontSize: 12, color: Colors.accent, marginTop: 2, fontWeight: '600' },
  dates:     { flexDirection: 'row', gap: 14, marginTop: 8 },
  dateItem:  { fontSize: 11, color: 'rgba(255,255,255,0.65)' },

  section:      { marginTop: 16, paddingHorizontal: 14 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  card:         { backgroundColor: Colors.surface, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },

  taxRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12 },
  taxBorder: { borderTopWidth: 1, borderTopColor: Colors.border },
  taxLabel:  { fontSize: 13, color: Colors.textSecondary },
  taxValue:  { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },

  detailRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  detailText: { fontSize: 13, color: Colors.textPrimary },
  notes:      { padding: 14, fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },
});
