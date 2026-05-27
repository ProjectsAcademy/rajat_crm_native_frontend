import {
  View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { hrApi, SalaryIncentive } from '../../../services/api';
import { Colors } from '../../../constants/colors';

const TYPE_STYLES: Record<string, { bg: string; text: string }> = {
  performance: { bg: Colors.successLight, text: Colors.success },
  project:     { bg: Colors.infoLight,    text: Colors.info },
  overtime:    { bg: '#EDE9FE',           text: '#5B21B6' },
  extra_work:  { bg: Colors.warningLight, text: '#7A5400' },
  festival:    { bg: '#FEE2E2',           text: '#DC2626' },
  other:       { bg: '#F3F4F6',           text: '#374151' },
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function formatAmount(v: string) {
  return `₹${parseFloat(v).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export default function IncentivesScreen() {
  const [incentives, setIncentives] = useState<SalaryIncentive[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [total, setTotal] = useState(0);

  const fetch = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await hrApi.incentives.list({ limit: 100 });
      setIncentives(data.incentives);
      setTotal(data.total);
    } catch { setIncentives([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const renderItem = ({ item }: { item: SalaryIncentive }) => {
    const ts = TYPE_STYLES[item.incentiveType] ?? TYPE_STYLES.other;
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.cardLeft}>
            <Text style={styles.empName}>{item.employee.name}</Text>
            <Text style={styles.empCode}>{item.employee.employeeCode}</Text>
          </View>
          <Text style={styles.amount}>{formatAmount(item.amount)}</Text>
        </View>
        <View style={styles.metaRow}>
          <View style={[styles.badge, { backgroundColor: ts.bg }]}>
            <Text style={[styles.badgeText, { color: ts.text }]}>{item.incentiveType.replace('_', ' ')}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={12} color={Colors.textMuted} />
            <Text style={styles.metaText}>{formatDate(item.paymentDate)}</Text>
          </View>
          {item.project && (
            <View style={styles.metaItem}>
              <Ionicons name="construct-outline" size={12} color={Colors.textMuted} />
              <Text style={styles.metaText}>{item.project.projectNo}</Text>
            </View>
          )}
        </View>
        {item.description ? (
          <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.headerCount}>{total} incentives</Text>
      </View>
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.accent} /></View>
      ) : (
        <FlatList
          data={incentives}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetch(true); }} tintColor={Colors.accent} />}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="ribbon-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No incentives recorded</Text>
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
  metaRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11, color: Colors.textMuted },
  badge:    { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  badgeText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  description: { fontSize: 12, color: Colors.textSecondary, marginTop: 8, lineHeight: 16 },
  center:   { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { color: Colors.textSecondary, fontSize: 14 },
});
