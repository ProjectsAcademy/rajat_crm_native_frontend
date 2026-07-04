import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  TouchableOpacity, Alert, Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useState, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { employeesApi, Employee } from '../../../services/api';
import { Colors } from '../../../constants/colors';
import EmployeeFormSheet from '../../../components/EmployeeFormSheet';

const SKILL_COLORS: Record<string, { bg: string; text: string }> = {
  unskilled:   { bg: '#F3F4F6',           text: '#374151' },
  semi_skilled:{ bg: Colors.infoLight,    text: Colors.info },
  skilled:     { bg: Colors.warningLight, text: '#7A5400' },
  supervisor:  { bg: Colors.successLight, text: Colors.success },
  electrician: { bg: Colors.accentLight,  text: Colors.accent },
  helper:      { bg: '#F3F4F6',           text: '#374151' },
  driver:      { bg: Colors.infoLight,    text: Colors.info },
  other:       { bg: '#F3F4F6',           text: '#374151' },
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

function fmtAmount(val: string | number) {
  const n = parseFloat(String(val || '0'));
  if (n === 0) return '—';
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function EmployeeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [showEdit, setShowEdit] = useState(false);
  const [actioning, setActioning] = useState(false);

  const loadEmployee = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await employeesApi.detail(parseInt(id!));
      setEmployee(data.employee);
    } catch {
      setError('Could not load employee.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadEmployee(); }, [loadEmployee]);

  // ── Deactivate ──
  const handleDeactivate = () => {
    const doIt = async () => {
      setActioning(true);
      try {
        await employeesApi.deactivate(parseInt(id!));
        await loadEmployee();
      } catch (e: any) {
        Alert.alert('Error', e?.response?.data?.error || 'Could not deactivate employee.');
      } finally { setActioning(false); }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Deactivate this employee? They will be hidden from active lists.')) doIt();
      return;
    }
    Alert.alert(
      'Deactivate Employee',
      'This will mark the employee as inactive. Their HR records are preserved.',
      [{ text: 'Cancel', style: 'cancel' }, { text: 'Deactivate', style: 'destructive', onPress: doIt }],
    );
  };

  // ── Reactivate ──
  const handleReactivate = async () => {
    setActioning(true);
    try {
      await employeesApi.reactivate(parseInt(id!));
      await loadEmployee();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error || 'Could not reactivate employee.');
    } finally { setActioning(false); }
  };

  // ── Permanent delete ──
  const handleDelete = () => {
    const doIt = async () => {
      setActioning(true);
      try {
        await employeesApi.permanentDelete(parseInt(id!));
        router.back();
      } catch (e: any) {
        const msg = e?.response?.data?.error || 'Could not delete employee.';
        Alert.alert('Cannot Delete', msg);
      } finally { setActioning(false); }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Permanently delete this employee? This cannot be undone.')) doIt();
      return;
    }
    Alert.alert(
      'Delete Employee',
      'Permanently delete this employee? This cannot be undone.\n\nIf they have salary or HR records, deactivate instead.',
      [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: doIt }],
    );
  };

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

        {/* Header card */}
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

          {/* Action buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.editBtn} onPress={() => setShowEdit(true)} activeOpacity={0.8}>
              <Ionicons name="create-outline" size={15} color="#111" />
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
            {employee.isActive ? (
              <TouchableOpacity
                style={[styles.deactivateBtn, actioning && { opacity: 0.5 }]}
                onPress={handleDeactivate}
                disabled={actioning}
                activeOpacity={0.8}
              >
                {actioning
                  ? <ActivityIndicator size="small" color={Colors.error} />
                  : <Ionicons name="person-remove-outline" size={15} color={Colors.error} />}
                <Text style={styles.deactivateBtnText}>Deactivate</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.reactivateBtn, actioning && { opacity: 0.5 }]}
                onPress={handleReactivate}
                disabled={actioning}
                activeOpacity={0.8}
              >
                {actioning
                  ? <ActivityIndicator size="small" color={Colors.success} />
                  : <Ionicons name="person-add-outline" size={15} color={Colors.success} />}
                <Text style={styles.reactivateBtnText}>Reactivate</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Permanent delete */}
          <TouchableOpacity
            style={[styles.deleteBtn, actioning && { opacity: 0.5 }]}
            onPress={handleDelete}
            disabled={actioning}
            activeOpacity={0.8}
          >
            <Ionicons name="trash-outline" size={14} color={Colors.error} />
            <Text style={styles.deleteBtnText}>Delete Permanently</Text>
          </TouchableOpacity>
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

        {/* Personal info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <View style={styles.card}>
            <InfoRow label="Phone"     value={employee.phone} />
            <InfoRow label="Email"     value={employee.email} />
            <InfoRow label="Address"   value={employee.address} />
            <InfoRow label="Aadhar No" value={employee.aadharNo} />
            <InfoRow label="PAN"       value={employee.pan} />
            <InfoRow label="Added On"  value={new Date(employee.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} />
          </View>
        </View>

      </ScrollView>

      {/* Edit sheet */}
      <EmployeeFormSheet
        visible={showEdit}
        employee={employee}
        onClose={() => setShowEdit(false)}
        onSaved={() => { setShowEdit(false); loadEmployee(); }}
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

  actionRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.accent, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8,
  },
  editBtnText: { fontSize: 13, fontWeight: '700', color: '#111' },
  deactivateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.errorLight, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8,
    borderWidth: 1, borderColor: Colors.error + '40',
  },
  deactivateBtnText: { fontSize: 13, fontWeight: '700', color: Colors.error },
  reactivateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.successLight, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8,
    borderWidth: 1, borderColor: Colors.success + '40',
  },
  reactivateBtnText: { fontSize: 13, fontWeight: '700', color: Colors.success },

  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 10, paddingHorizontal: 16, paddingVertical: 7, borderRadius: 8,
    borderWidth: 1, borderColor: Colors.error + '60',
    backgroundColor: 'rgba(220,38,38,0.08)',
  },
  deleteBtnText: { fontSize: 12, fontWeight: '600', color: Colors.error },

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
