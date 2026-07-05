import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect, useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { dashboardApi, DashboardResponse } from '../../../services/api';
import { useAuthStore, userHasFeature } from '../../../store/auth';
import { Colors } from '../../../constants/colors';

const MODULES = [
  { key: 'attendance',       feature: 'hr.attendance',        label: 'Attendance',      icon: 'calendar-outline'         as const, route: '/(app)/hr/attendance',        color: '#1565C0' },
  { key: 'salaryPayments',   feature: 'hr.salary-payments',   label: 'Salary Payments', icon: 'cash-outline'             as const, route: '/(app)/hr/salary-payments',   color: '#2E7D32' },
  { key: 'incentives',       feature: 'hr.incentives',        label: 'Incentives',      icon: 'ribbon-outline'           as const, route: '/(app)/hr/incentives',        color: '#6A1B9A' },
  { key: 'salaryComponents', feature: 'hr.salary-components', label: 'Salary Structure',icon: 'list-outline'             as const, route: '/(app)/hr/salary-components', color: '#E65100' },
  { key: 'epfEsic',          feature: 'hr.epf-esic',          label: 'EPF / ESIC',      icon: 'shield-checkmark-outline' as const, route: '/(app)/hr/epf-esic',          color: '#006064' },
];

export default function HRIndexScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const visibleModules = MODULES.filter((m) => userHasFeature(user, m.feature));
  const [kpis, setKpis] = useState<DashboardResponse['kpis'] | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    dashboardApi.getSummary()
      .then(({ data }) => setKpis(data.kpis))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <View style={styles.safe}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>HR & Payroll</Text>
        <Text style={styles.headerSub}>Attendance · Salary · EPF/ESIC</Text>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={Colors.accent} size="large" /></View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {visibleModules.length === 0 && (
            <View style={{ alignItems: 'center', paddingVertical: 48, gap: 10 }}>
              <Ionicons name="lock-closed-outline" size={32} color={Colors.textMuted} />
              <Text style={{ fontSize: 13, color: Colors.textMuted, textAlign: 'center' }}>
                No HR areas assigned to your account.
              </Text>
            </View>
          )}
          {visibleModules.map((m) => {
            const kpi = kpis?.[m.key as keyof typeof kpis] as { total: number } | undefined;
            return (
              <TouchableOpacity
                key={m.key}
                style={styles.card}
                onPress={() => router.push(m.route as any)}
                activeOpacity={0.75}
              >
                <View style={[styles.iconBox, { backgroundColor: m.color + '18' }]}>
                  <Ionicons name={m.icon} size={26} color={m.color} />
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardLabel}>{m.label}</Text>
                  {kpi ? <Text style={[styles.cardCount, { color: m.color }]}>{kpi.total}</Text> : null}
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.primary },
  header: {
    backgroundColor: Colors.primary, paddingHorizontal: 20,
    paddingBottom: 20, borderBottomWidth: 2, borderBottomColor: Colors.accent,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  headerSub:   { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  scroll:  { flex: 1, backgroundColor: Colors.background },
  center:  { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  content: { padding: 14, gap: 10 },
  card: {
    backgroundColor: Colors.surface, borderRadius: 10, borderWidth: 1,
    borderColor: Colors.border, padding: 18,
    flexDirection: 'row', alignItems: 'center', gap: 16,
  },
  iconBox:   { width: 50, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  cardBody:  { flex: 1 },
  cardLabel: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  cardCount: { fontSize: 22, fontWeight: '800', marginTop: 2 },
});
