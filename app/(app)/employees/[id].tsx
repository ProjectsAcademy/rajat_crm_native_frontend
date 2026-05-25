import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { employeesApi, Employee } from '../../../services/api';
import { Colors } from '../../../constants/colors';

const SKILL_COLORS: Record<string, { bg: string; text: string }> = {
  unskilled:   { bg: '#F3F4F6',           text: '#374151' },
  semi_skilled: { bg: Colors.infoLight,   text: Colors.info },
  skilled:     { bg: Colors.warningLight, text: '#7A5400' },
  supervisor:  { bg: Colors.successLight, text: Colors.success },
};

function InfoRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function fmtAmount(val: string, suffix = '') {
  const n = parseFloat(val || '0');
  if (n === 0) return '—';
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${suffix}`;
}

export default function EmployeeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    employeesApi.detail(parseInt(id!))
      .then(({ data }) => setEmployee(data.employee))
      .catch(() => setError('Could not load employee.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={Colors.accent} /></View>;
  if (error || !employee) {
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

  const sc = SKILL_COLORS[employee.skillType] ?? SKILL_COLORS.unskilled;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.headerCard}>
          <View style={styles.bigAvatar}>
            <Text style={styles.bigAvatarText}>{employee.name.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.headerName}>{employee.name}</Text>
          <Text style={styles.headerCode}>{employee.employeeCode}</Text>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: sc.bg }]}>
              <Text style={[styles.badgeText, { color: sc.text }]}>
                {employee.skillType.replace('_', '-')}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: employee.isActive ? Colors.successLight : Colors.errorLight }]}>
              <Text style={[styles.badgeText, { color: employee.isActive ? Colors.success : Colors.error }]}>
                {employee.isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
        </View>

        {/* Compensation stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Daily Wage</Text>
            <Text style={styles.statValue}>{fmtAmount(employee.dailyWage)}</Text>
            <Text style={styles.statSub}>per day</Text>
          </View>
          <View style={[styles.statBox, styles.statBorder]}>
            <Text style={styles.statLabel}>CTC</Text>
            <Text style={styles.statValue}>{fmtAmount(employee.ctc)}</Text>
            <Text style={styles.statSub}>per month</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Basic</Text>
            <Text style={styles.statValue}>{fmtAmount(employee.basicSalary)}</Text>
            <Text style={styles.statSub}>per month</Text>
          </View>
        </View>

        {/* Personal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <View style={styles.card}>
            <InfoRow label="Phone" value={employee.phone} />
            <InfoRow label="Email" value={employee.email} />
            <InfoRow label="Address" value={employee.address} />
            <InfoRow label="Aadhar No" value={employee.aadharNo} />
            <InfoRow label="PAN" value={employee.pan} />
            <InfoRow label="Added On" value={new Date(employee.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} />
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

  headerCard: {
    backgroundColor: Colors.primary, alignItems: 'center',
    paddingVertical: 28, paddingHorizontal: 20,
  },
  bigAvatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,153,0,0.2)', justifyContent: 'center',
    alignItems: 'center', marginBottom: 12, borderWidth: 2, borderColor: Colors.accent,
  },
  bigAvatarText: { fontSize: 30, fontWeight: '800', color: Colors.accent },
  headerName: { fontSize: 20, fontWeight: '700', color: '#fff', textAlign: 'center' },
  headerCode: { fontSize: 12, color: Colors.accent, marginTop: 4, fontWeight: '600' },
  badgeRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },

  statsRow: {
    flexDirection: 'row', backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  statBox: { flex: 1, padding: 14, alignItems: 'center' },
  statBorder: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: Colors.border },
  statLabel: { fontSize: 10, color: Colors.textMuted, marginBottom: 4, fontWeight: '500' },
  statValue: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center' },
  statSub: { fontSize: 9, color: Colors.textMuted, marginTop: 2 },

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
  infoValue: { fontSize: 13, color: Colors.textPrimary, fontWeight: '600', textAlign: 'right', flex: 1.5, flexShrink: 1 },
});
