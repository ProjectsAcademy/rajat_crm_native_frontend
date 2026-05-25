import {
  View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl, TouchableOpacity,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { hrApi, AttendanceRecord } from '../../../services/api';
import { Colors } from '../../../constants/colors';

const STATUS_LABELS: Record<string, { label: string; bg: string; text: string }> = {
  P: { label: 'Present',  bg: Colors.successLight, text: Colors.success },
  A: { label: 'Absent',   bg: Colors.errorLight,   text: Colors.error },
  L: { label: 'Leave',    bg: Colors.warningLight,  text: '#7A5400' },
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function AttendanceScreen() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [total, setTotal] = useState(0);

  const fetch = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await hrApi.attendance.list({ limit: 100 });
      setRecords(data.records);
      setTotal(data.total);
    } catch { setRecords([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const renderItem = ({ item }: { item: AttendanceRecord }) => {
    const st = STATUS_LABELS[item.attendanceStatus] ?? STATUS_LABELS.P;
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <Text style={styles.empName}>{item.employee.name}</Text>
          <View style={[styles.badge, { backgroundColor: st.bg }]}>
            <Text style={[styles.badgeText, { color: st.text }]}>{st.label}</Text>
          </View>
        </View>
        <Text style={styles.empCode}>{item.employee.employeeCode}</Text>
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={12} color={Colors.textMuted} />
            <Text style={styles.metaText}>{formatDate(item.date)}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={12} color={Colors.textMuted} />
            <Text style={styles.metaText}>{item.hoursWorked}h</Text>
          </View>
          {parseFloat(item.overtimeHours) > 0 && (
            <View style={styles.metaItem}>
              <Ionicons name="add-circle-outline" size={12} color={Colors.accent} />
              <Text style={[styles.metaText, { color: Colors.accent }]}>OT {item.overtimeHours}h</Text>
            </View>
          )}
          {item.project && (
            <View style={styles.metaItem}>
              <Ionicons name="construct-outline" size={12} color={Colors.textMuted} />
              <Text style={styles.metaText} numberOfLines={1}>{item.project.projectNo}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.headerCount}>{total} records</Text>
      </View>
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.accent} /></View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetch(true); }} tintColor={Colors.accent} />}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="calendar-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No attendance records</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: Colors.background },
  header:  { paddingHorizontal: 14, paddingVertical: 10, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerCount: { fontSize: 12, color: Colors.textMuted },
  listContent: { padding: 12 },
  card: {
    backgroundColor: Colors.surface, borderRadius: 8, borderWidth: 1,
    borderColor: Colors.border, padding: 14,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  empName: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, flex: 1 },
  empCode: { fontSize: 11, color: Colors.accent, fontWeight: '600', marginBottom: 6 },
  badge:   { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11, color: Colors.textMuted },
  center:  { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { color: Colors.textSecondary, fontSize: 14 },
});
