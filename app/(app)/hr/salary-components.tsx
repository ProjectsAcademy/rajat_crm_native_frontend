import {
  View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { hrApi, SalaryComponent } from '../../../services/api';
import { Colors } from '../../../constants/colors';

const TYPE_STYLES: Record<string, { bg: string; text: string }> = {
  base:      { bg: Colors.infoLight,    text: Colors.info },
  allowance: { bg: Colors.successLight, text: Colors.success },
  deduction: { bg: Colors.errorLight,   text: Colors.error },
  bonus:     { bg: Colors.warningLight, text: '#7A5400' },
  overtime:  { bg: '#EDE9FE',           text: '#5B21B6' },
};

function formatAmount(v: string) {
  return `₹${parseFloat(v).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}
function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function SalaryComponentsScreen() {
  const [components, setComponents] = useState<SalaryComponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [total, setTotal] = useState(0);

  const fetch = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await hrApi.salaryComponents.list({ active: true, limit: 100 });
      setComponents(data.components);
      setTotal(data.total);
    } catch { setComponents([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const renderItem = ({ item }: { item: SalaryComponent }) => {
    const ts = TYPE_STYLES[item.componentType] ?? TYPE_STYLES.base;
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.cardLeft}>
            <Text style={styles.empName}>{item.employee.name}</Text>
            <Text style={styles.compName}>{item.name}</Text>
          </View>
          <Text style={[styles.amount, { color: item.componentType === 'deduction' ? Colors.error : Colors.success }]}>
            {item.componentType === 'deduction' ? '-' : '+'}{formatAmount(item.amount)}
          </Text>
        </View>
        <View style={styles.metaRow}>
          <View style={[styles.badge, { backgroundColor: ts.bg }]}>
            <Text style={[styles.badgeText, { color: ts.text }]}>{item.componentType}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={12} color={Colors.textMuted} />
            <Text style={styles.metaText}>From {formatDate(item.effectiveFrom)}</Text>
          </View>
          {item.effectiveTo && (
            <View style={styles.metaItem}>
              <Text style={styles.metaText}>To {formatDate(item.effectiveTo)}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.headerCount}>{total} active components</Text>
      </View>
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.accent} /></View>
      ) : (
        <FlatList
          data={components}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetch(true); }} tintColor={Colors.accent} />}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="list-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No salary components</Text>
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
  compName: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  amount:   { fontSize: 16, fontWeight: '800' },
  metaRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11, color: Colors.textMuted },
  badge:    { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  badgeText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  center:   { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { color: Colors.textSecondary, fontSize: 14 },
});
