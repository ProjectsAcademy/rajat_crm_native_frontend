import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { tendersApi, Tender } from '../../../services/api';
import { Colors } from '../../../constants/colors';
import MediaSection from '../../../components/MediaSection';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft:     { bg: '#F3F4F6', text: '#374151' },
  published: { bg: Colors.infoLight, text: Colors.info },
  closed:    { bg: Colors.errorLight, text: Colors.error },
  awarded:   { bg: Colors.successLight, text: Colors.success },
};

const PROJECT_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  planning:    { bg: Colors.infoLight, text: Colors.info },
  in_progress: { bg: Colors.warningLight, text: '#7A5400' },
  on_hold:     { bg: '#F3F4F6', text: '#374151' },
  completed:   { bg: Colors.successLight, text: Colors.success },
  cancelled:   { bg: Colors.errorLight, text: Colors.error },
};

function InfoRow({ label, value }: { label: string; value: string }) {
  if (!value || value === '—') return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function formatCurrency(val: string | null) {
  if (!val) return '—';
  const n = parseFloat(val);
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000)   return `₹${(n / 100000).toFixed(2)} L`;
  return `₹${n.toLocaleString('en-IN')}`;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function TenderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [tender, setTender] = useState<Tender | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadTender = useCallback(() => {
    tendersApi.detail(parseInt(id!))
      .then(({ data }) => setTender(data.tender))
      .catch(() => setError('Could not load tender.'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { loadTender(); }, [loadTender]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={Colors.accent} /></View>;
  if (error || !tender) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={40} color={Colors.textMuted} />
        <Text style={styles.errorText}>{error || 'Not found'}</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const sc = STATUS_COLORS[tender.status] ?? STATUS_COLORS.draft;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.tenderNo}>{tender.tenderNo}</Text>
            <View style={[styles.badge, { backgroundColor: sc.bg }]}>
              <Text style={[styles.badgeText, { color: sc.text }]}>
                {tender.status.charAt(0).toUpperCase() + tender.status.slice(1)}
              </Text>
            </View>
          </View>
          <Text style={styles.title}>{tender.title}</Text>
          {tender.description ? <Text style={styles.desc}>{tender.description}</Text> : null}
        </View>

        {/* Financial */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Tender Amount</Text>
            <Text style={styles.statValue}>{formatCurrency(tender.tenderAmount)}</Text>
          </View>
          <View style={[styles.statBox, styles.statBorder]}>
            <Text style={styles.statLabel}>Bidding %</Text>
            <Text style={styles.statValue}>{parseFloat(tender.biddingPercentage || '0').toFixed(2)}%</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Projects</Text>
            <Text style={styles.statValue}>{tender.projects.length}</Text>
          </View>
        </View>

        {/* Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tender Details</Text>
          <View style={styles.card}>
            <InfoRow label="Tender Date" value={fmtDate(tender.tenderDate)} />
            <InfoRow label="Closing Date" value={fmtDate(tender.closingDate)} />
            <InfoRow label="Work Order No" value={tender.workOrderNo ?? '—'} />
            <InfoRow label="Maintenance Period" value={tender.maintenancePeriod ? `${tender.maintenancePeriod} months` : '—'} />
            {tender.tenderRemark ? <InfoRow label="Remark" value={tender.tenderRemark} /> : null}
          </View>
        </View>

        {/* Linked Projects */}
        {tender.projects.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Linked Projects ({tender.projects.length})</Text>
            {tender.projects.map((p) => {
              const psc = PROJECT_STATUS_COLORS[p.status] ?? PROJECT_STATUS_COLORS.planning;
              return (
                <TouchableOpacity
                  key={p.id}
                  style={styles.projectRow}
                  onPress={() => router.push(`/(app)/projects/${p.id}` as any)}
                  activeOpacity={0.75}
                >
                  <View>
                    <Text style={styles.projectNo}>{p.projectNo}</Text>
                    <Text style={styles.projectName} numberOfLines={1}>{p.name}</Text>
                  </View>
                  <View style={styles.projectRight}>
                    <View style={[styles.badge, { backgroundColor: psc.bg }]}>
                      <Text style={[styles.badgeText, { color: psc.text }]}>{p.status.replace('_', ' ')}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Attachments */}
        <View style={styles.section}>
          <MediaSection
            entity="tender"
            entityId={tender.id}
            files={tender.mediaFiles ?? []}
            onRefresh={loadTender}
          />
        </View>

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
  tenderNo: { fontSize: 13, fontWeight: '700', color: Colors.accent, letterSpacing: 0.5 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  title: { fontSize: 18, fontWeight: '700', color: '#fff', lineHeight: 26 },
  desc: { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 8, lineHeight: 20 },

  statsRow: {
    flexDirection: 'row', backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  statBox: { flex: 1, padding: 16, alignItems: 'center' },
  statBorder: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: Colors.border },
  statLabel: { fontSize: 11, color: Colors.textMuted, marginBottom: 4, fontWeight: '500' },
  statValue: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary },

  section: { marginTop: 16, paddingHorizontal: 14 },
  sectionTitle: {
    fontSize: 11, fontWeight: '700', color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8,
  },
  card: { backgroundColor: Colors.surface, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  infoLabel: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500', flex: 1 },
  infoValue: { fontSize: 13, color: Colors.textPrimary, fontWeight: '600', textAlign: 'right', flex: 1.2 },

  projectRow: {
    backgroundColor: Colors.surface, borderRadius: 8, borderWidth: 1,
    borderColor: Colors.border, padding: 14, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center', marginBottom: 8,
  },
  projectNo: { fontSize: 11, fontWeight: '700', color: Colors.accent },
  projectName: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary, marginTop: 2 },
  projectRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
