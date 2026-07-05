import { useFeatureGuard } from '../../../hooks/useFeatureGuard';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { hrApi, SalaryPayment } from '../../../services/api';
import { Colors } from '../../../constants/colors';

const METHOD_LABELS: Record<string, string> = {
  bank_transfer: 'Bank',
  cash: 'Cash',
  cheque: 'Cheque',
  upi: 'UPI',
  other: 'Other',
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function formatMonth(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}
function formatAmount(v: string) {
  return `₹${parseFloat(v).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export default function SalaryPaymentsScreen() {
  useFeatureGuard('hr.salary-payments');
  const [payments, setPayments] = useState<SalaryPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [total, setTotal] = useState(0);

  const fetch = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await hrApi.salaryPayments.list({ limit: 100 });
      setPayments(data.payments);
      setTotal(data.total);
    } catch { setPayments([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const renderItem = ({ item }: { item: SalaryPayment }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.cardLeft}>
          <Text style={styles.empName}>{item.employee.name}</Text>
          <Text style={styles.empCode}>{item.employee.employeeCode}</Text>
        </View>
        <Text style={styles.amount}>{formatAmount(item.amount)}</Text>
      </View>
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Ionicons name="calendar-outline" size={12} color={Colors.textMuted} />
          <Text style={styles.metaText}>{formatMonth(item.paymentMonth)}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="checkmark-circle-outline" size={12} color={Colors.textMuted} />
          <Text style={styles.metaText}>Paid {formatDate(item.paymentDate)}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: Colors.successLight }]}>
          <Text style={[styles.badgeText, { color: Colors.success }]}>
            {METHOD_LABELS[item.paymentMethod] ?? item.paymentMethod}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.headerCount}>{total} payments</Text>
      </View>
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.accent} /></View>
      ) : (
        <FlatList
          data={payments}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetch(true); }} tintColor={Colors.accent} />}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="cash-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No salary payments</Text>
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
  cardTop:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  cardLeft: { flex: 1 },
  empName:  { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  empCode:  { fontSize: 11, color: Colors.accent, fontWeight: '600', marginTop: 2 },
  amount:   { fontSize: 18, fontWeight: '800', color: Colors.success },
  metaRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11, color: Colors.textMuted },
  badge:    { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  center:   { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { color: Colors.textSecondary, fontSize: 14 },
});
