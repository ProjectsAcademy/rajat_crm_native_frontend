import { useFeatureGuard } from '../../../hooks/useFeatureGuard';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { hrApi, EpfEsicRecord } from '../../../services/api';
import { Colors } from '../../../constants/colors';

function formatMonth(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}
function formatAmount(v: string) {
  const n = parseFloat(v);
  if (n === 0) return '—';
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export default function EpfEsicScreen() {
  useFeatureGuard('hr.epf-esic');
  const [records, setRecords] = useState<EpfEsicRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [total, setTotal] = useState(0);

  const fetch = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await hrApi.epfEsic.list({ limit: 100 });
      setRecords(data.records);
      setTotal(data.total);
    } catch { setRecords([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const renderItem = ({ item }: { item: EpfEsicRecord }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.cardLeft}>
          {item.employee ? (
            <>
              <Text style={styles.empName}>{item.employee.name}</Text>
              <Text style={styles.empCode}>{item.employee.employeeCode}</Text>
            </>
          ) : (
            <Text style={styles.empName}>—</Text>
          )}
        </View>
        <View style={[styles.paidBadge, { backgroundColor: item.isPaid ? Colors.successLight : Colors.warningLight }]}>
          <Ionicons
            name={item.isPaid ? 'checkmark-circle' : 'time-outline'}
            size={12}
            color={item.isPaid ? Colors.success : '#7A5400'}
          />
          <Text style={[styles.paidText, { color: item.isPaid ? Colors.success : '#7A5400' }]}>
            {item.isPaid ? 'Paid' : 'Pending'}
          </Text>
        </View>
      </View>

      <Text style={styles.monthLabel}>{formatMonth(item.month)}</Text>

      <View style={styles.grid}>
        <View style={styles.gridItem}>
          <Text style={styles.gridLabel}>Basic Wage</Text>
          <Text style={styles.gridValue}>{formatAmount(item.basicWage)}</Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.gridLabel}>EPF (Emp)</Text>
          <Text style={styles.gridValue}>{formatAmount(item.epfEmployee)}</Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.gridLabel}>EPF (Er)</Text>
          <Text style={styles.gridValue}>{formatAmount(item.epfEmployer)}</Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.gridLabel}>ESIC (Emp)</Text>
          <Text style={styles.gridValue}>{formatAmount(item.esicEmployee)}</Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.gridLabel}>ESIC (Er)</Text>
          <Text style={styles.gridValue}>{formatAmount(item.esicEmployer)}</Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.gridLabel}>Total Ded.</Text>
          <Text style={[styles.gridValue, { color: Colors.error, fontWeight: '700' }]}>{formatAmount(item.totalDeduction)}</Text>
        </View>
      </View>
    </View>
  );

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
              <Ionicons name="shield-checkmark-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No EPF / ESIC records</Text>
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
  cardTop:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  cardLeft:   { flex: 1 },
  empName:    { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  empCode:    { fontSize: 11, color: Colors.accent, fontWeight: '600', marginTop: 2 },
  paidBadge:  { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  paidText:   { fontSize: 11, fontWeight: '700' },
  monthLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 10 },
  grid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gridItem:   { width: '30%', backgroundColor: Colors.background, borderRadius: 6, padding: 8 },
  gridLabel:  { fontSize: 10, color: Colors.textMuted, marginBottom: 2 },
  gridValue:  { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 10 },
  emptyText:  { color: Colors.textSecondary, fontSize: 14 },
});
