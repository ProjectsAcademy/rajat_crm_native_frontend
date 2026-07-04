import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { maintenanceApi, MaintenancePeriod } from '../../../services/api';
import { Colors } from '../../../constants/colors';

const FILTERS = ['All', 'Active', 'Expired', 'Completed'];

const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  active:    { bg: Colors.successLight, text: Colors.success },
  expired:   { bg: Colors.errorLight,   text: Colors.error },
  completed: { bg: Colors.infoLight,    text: Colors.info },
};

const ALERT_TYPE_STYLE: Record<string, { bg: string; text: string; icon: any }> = {
  upcoming: { bg: Colors.warningLight, text: '#7A5400', icon: 'time-outline' },
  expired:  { bg: Colors.errorLight,   text: Colors.error,   icon: 'alert-circle-outline' },
  reminder: { bg: Colors.infoLight,    text: Colors.info,    icon: 'notifications-outline' },
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function daysUntil(d: string) {
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}

export default function MaintenanceScreen() {
  const [periods, setPeriods] = useState<MaintenancePeriod[]>([]);
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [total, setTotal] = useState(0);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const params: any = { limit: 100 };
      if (filter !== 'All') params.status = filter.toLowerCase();
      const { data } = await maintenanceApi.list(params);
      setPeriods(data.periods);
      setTotal(data.total);
    } catch { setPeriods([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, [filter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const renderItem = ({ item }: { item: MaintenancePeriod }) => {
    const ss = STATUS_STYLE[item.status] ?? STATUS_STYLE.active;
    const days = daysUntil(item.endDate);
    const pendingAlerts = item.fdAlerts.filter(a => !a.isSent);
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/(app)/projects/${item.project.id}` as any)}
        activeOpacity={0.75}
      >
        <View style={styles.body}>
          <View style={styles.cardTop}>
            <Text style={styles.projectNo}>{item.project.projectNo}</Text>
            <View style={[styles.badge, { backgroundColor: ss.bg }]}>
              <Text style={[styles.badgeText, { color: ss.text }]}>{item.status.toUpperCase()}</Text>
            </View>
          </View>
          <Text style={styles.projectName} numberOfLines={1}>{item.project.name}</Text>
          <View style={styles.dateRow}>
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={11} color={Colors.textMuted} />
              <Text style={styles.metaText}>{fmtDate(item.startDate)} → {fmtDate(item.endDate)}</Text>
            </View>
            <Text style={[styles.daysText, { color: days < 0 ? Colors.error : days <= 30 ? '#7A5400' : Colors.textMuted }]}>
              {days < 0 ? `${Math.abs(days)}d ago` : `${days}d left`}
            </Text>
          </View>
          {item.durationMonths > 0 ? (
            <Text style={styles.duration}>{item.durationMonths} month{item.durationMonths !== 1 ? 's' : ''} maintenance</Text>
          ) : null}
          {item.fdAlerts.length > 0 ? (
            <View style={styles.alertsRow}>
              {item.fdAlerts.slice(0, 3).map(a => {
                const as2 = ALERT_TYPE_STYLE[a.alertType] ?? ALERT_TYPE_STYLE.upcoming;
                return (
                  <View key={a.id} style={[styles.alertChip, { backgroundColor: as2.bg }]}>
                    <Ionicons name={as2.icon} size={10} color={as2.text} />
                    <Text style={[styles.alertText, { color: as2.text }]}>
                      {a.alertType} · {new Date(a.alertDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      {a.isSent ? ' ✓' : ''}
                    </Text>
                  </View>
                );
              })}
              {pendingAlerts.length > 0 ? (
                <View style={[styles.alertChip, { backgroundColor: Colors.warningLight }]}>
                  <Text style={[styles.alertText, { color: '#7A5400' }]}>{pendingAlerts.length} pending</Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
        <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.pills}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.pill, filter === f && styles.pillActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.pillText, filter === f && styles.pillTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
        <Text style={styles.totalText}>{total} periods</Text>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.accent} /></View>
      ) : (
        <FlatList
          data={periods}
          keyExtractor={i => String(i.id)}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(true); }} tintColor={Colors.accent} />}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="construct-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No maintenance periods</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  pills: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  pill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  pillActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  pillText: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary },
  pillTextActive: { color: '#111' },
  totalText: { marginLeft: 'auto', fontSize: 11, color: Colors.textMuted },
  list: { padding: 12 },
  card: {
    backgroundColor: Colors.surface, borderRadius: 8, borderWidth: 1,
    borderColor: Colors.border, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  body: { flex: 1 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  projectNo: { fontSize: 11, fontWeight: '700', color: Colors.accent },
  projectName: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  dateRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 11, color: Colors.textMuted },
  daysText: { fontSize: 11, fontWeight: '700' },
  duration: { fontSize: 11, color: Colors.textSecondary, marginTop: 3 },
  alertsRow: { flexDirection: 'row', gap: 5, marginTop: 6, flexWrap: 'wrap' },
  alertChip: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  alertText: { fontSize: 10, fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { color: Colors.textSecondary, fontSize: 14 },
});
