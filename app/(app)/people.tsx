import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useEffect, useCallback } from 'react';
import { dashboardApi, DashboardResponse } from '../../services/api';
import { Colors } from '../../constants/colors';

type CardDef = {
  title: string;
  sub: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  route: string;
  count: (kpis: DashboardResponse['kpis']) => number;
};

const CARDS: CardDef[] = [
  {
    title: 'Customers',
    sub: 'active customers',
    icon: 'people-outline',
    route: '/(app)/customers',
    count: (k) => k.customers?.total ?? 0,
  },
  {
    title: 'Vendors',
    sub: 'active vendors',
    icon: 'storefront-outline',
    route: '/(app)/vendors',
    count: (k) => k.vendors?.total ?? 0,
  },
  {
    title: 'Employees',
    sub: 'active employees',
    icon: 'person-outline',
    route: '/(app)/employees',
    count: (k) => k.employees?.total ?? 0,
  },
];

export default function PeopleScreen() {
  const insets = useSafeAreaInsets();
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
        <Text style={styles.headerTitle}>People</Text>
        <Text style={styles.headerSub}>Customers, Vendors & Employees</Text>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={Colors.accent} /></View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          {CARDS.map((card) => (
            <TouchableOpacity
              key={card.title}
              style={styles.card}
              onPress={() => router.push(card.route as any)}
              activeOpacity={0.8}
            >
              <View style={styles.iconBox}>
                <Ionicons name={card.icon} size={26} color={Colors.accent} />
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{card.title}</Text>
                <Text style={styles.cardCount}>{kpis ? card.count(kpis) : 0}</Text>
                <Text style={styles.cardSub}>{card.sub}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.primary },
  header: {
    backgroundColor: Colors.primary, paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 2, borderBottomColor: Colors.accent,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  scroll: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  content: { padding: 16, gap: 12 },
  card: {
    backgroundColor: Colors.surface, borderRadius: 10, borderWidth: 1,
    borderLeftWidth: 4, borderLeftColor: Colors.accent, borderColor: Colors.border,
    padding: 18, flexDirection: 'row', alignItems: 'center', gap: 16,
  },
  iconBox: {
    width: 52, height: 52, borderRadius: 10,
    backgroundColor: Colors.accentLight, justifyContent: 'center', alignItems: 'center',
  },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  cardCount: { fontSize: 28, fontWeight: '800', color: Colors.accent, marginTop: 2 },
  cardSub: { fontSize: 12, color: Colors.textMuted },
});
