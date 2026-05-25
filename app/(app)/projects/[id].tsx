import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { projectsApi, Project } from '../../../services/api';
import { Colors } from '../../../constants/colors';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  planning:    { bg: Colors.infoLight,    text: Colors.info },
  in_progress: { bg: Colors.warningLight, text: '#7A5400' },
  on_hold:     { bg: '#F3F4F6',           text: '#374151' },
  completed:   { bg: Colors.successLight, text: Colors.success },
  cancelled:   { bg: Colors.errorLight,   text: Colors.error },
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

function formatBudget(val: string) {
  const n = parseFloat(val || '0');
  if (n === 0) return '—';
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000)   return `₹${(n / 100000).toFixed(2)} L`;
  return `₹${n.toLocaleString('en-IN')}`;
}

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    projectsApi.detail(parseInt(id!))
      .then(({ data }) => setProject(data.project))
      .catch(() => setError('Could not load project.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={Colors.accent} /></View>;
  if (error || !project) {
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

  const sc = STATUS_COLORS[project.status] ?? STATUS_COLORS.planning;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.projectNo}>{project.projectNo}</Text>
            <View style={[styles.badge, { backgroundColor: sc.bg }]}>
              <Text style={[styles.badgeText, { color: sc.text }]}>{project.status.replace('_', ' ')}</Text>
            </View>
          </View>
          <Text style={styles.projectName}>{project.name}</Text>
          {project.description ? <Text style={styles.desc}>{project.description}</Text> : null}
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Budget</Text>
            <Text style={styles.statValue}>{formatBudget(project.budget)}</Text>
          </View>
          <View style={[styles.statBox, styles.statBorder]}>
            <Text style={styles.statLabel}>Start Date</Text>
            <Text style={[styles.statValue, { fontSize: 14 }]}>{fmtDate(project.startDate)}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>End Date</Text>
            <Text style={[styles.statValue, { fontSize: 14 }]}>{fmtDate(project.endDate)}</Text>
          </View>
        </View>

        {/* Linked Tender */}
        {project.tender && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Linked Tender</Text>
            <TouchableOpacity
              style={styles.tenderCard}
              onPress={() => router.push(`/(app)/tenders/${project.tender!.id}` as any)}
              activeOpacity={0.75}
            >
              <View style={styles.tenderIcon}>
                <Ionicons name="document-text-outline" size={20} color={Colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.tenderNo}>{project.tender.tenderNo}</Text>
                <Text style={styles.tenderTitle} numberOfLines={2}>{project.tender.title}</Text>
                {project.tender.tenderAmount && (
                  <Text style={styles.tenderAmt}>
                    {formatBudget(project.tender.tenderAmount)}
                  </Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>
        )}

        {/* Project Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Project Details</Text>
          <View style={styles.card}>
            <InfoRow label="Created On" value={fmtDate(project.createdAt)} />
            <InfoRow label="Last Updated" value={fmtDate(project.updatedAt)} />
          </View>
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
  projectNo: { fontSize: 13, fontWeight: '700', color: Colors.accent, letterSpacing: 0.5 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  projectName: { fontSize: 18, fontWeight: '700', color: '#fff', lineHeight: 26 },
  desc: { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 8, lineHeight: 20 },

  statsRow: {
    flexDirection: 'row', backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  statBox: { flex: 1, padding: 16, alignItems: 'center' },
  statBorder: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: Colors.border },
  statLabel: { fontSize: 11, color: Colors.textMuted, marginBottom: 4, fontWeight: '500' },
  statValue: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center' },

  section: { marginTop: 16, paddingHorizontal: 14 },
  sectionTitle: {
    fontSize: 11, fontWeight: '700', color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8,
  },
  tenderCard: {
    backgroundColor: Colors.surface, borderRadius: 8, borderWidth: 1,
    borderLeftWidth: 4, borderLeftColor: Colors.accent, borderColor: Colors.border,
    padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  tenderIcon: {
    width: 40, height: 40, borderRadius: 8, backgroundColor: Colors.accentLight,
    justifyContent: 'center', alignItems: 'center',
  },
  tenderNo: { fontSize: 11, fontWeight: '700', color: Colors.accent },
  tenderTitle: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary, marginTop: 2, lineHeight: 18 },
  tenderAmt: { fontSize: 12, color: Colors.textSecondary, marginTop: 4 },

  card: { backgroundColor: Colors.surface, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  infoLabel: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500', flex: 1 },
  infoValue: { fontSize: 13, color: Colors.textPrimary, fontWeight: '600', textAlign: 'right', flex: 1 },
});
