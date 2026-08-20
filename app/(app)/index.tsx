import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useState, useCallback, useEffect, useRef } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore, userHasFeature } from '../../store/auth';
import { useRecentsStore } from '../../store/recents';
import { dashboardApi, DashboardResponse } from '../../services/api';
import { Colors } from '../../constants/colors';

const isWeb = Platform.OS === 'web';
const COLS = 2; // mobile grid columns; web uses a wrapping flex grid instead

// One card per RBAC feature — the grid shows whatever the user has access to.
// `key` is the feature key; `kpiKey` is the matching field in DashboardResponse.
const KPI_CONFIG = [
  { key: 'tenders',     kpiKey: 'tenders',            label: 'Tenders',     icon: 'document-text-outline',    color: Colors.kpi1, bg: Colors.infoLight,    route: '/(app)/tenders'         },
  { key: 'projects',    kpiKey: 'projects',           label: 'Projects',    icon: 'construct-outline',        color: Colors.kpi2, bg: Colors.successLight, route: '/(app)/projects'        },
  { key: 'customers',   kpiKey: 'customers',          label: 'Customers',   icon: 'people-outline',           color: Colors.kpi3, bg: Colors.warningLight, route: '/(app)/customers'       },
  { key: 'employees',   kpiKey: 'employees',          label: 'Employees',   icon: 'person-outline',           color: Colors.kpi4, bg: '#EDE9FE',           route: '/(app)/employees'       },
  { key: 'inventory',   kpiKey: 'inventory',          label: 'Inventory',   icon: 'cube-outline',             color: Colors.kpi5, bg: Colors.errorLight,   route: '/(app)/inventory'       },
  { key: 'orders',      kpiKey: 'orders',             label: 'Orders',      icon: 'cart-outline',             color: Colors.kpi6, bg: '#CFFAFE',           route: '/(app)/orders'          },
  { key: 'invoices',    kpiKey: 'invoices',           label: 'Invoices',    icon: 'document-text-outline',    color: Colors.kpi4, bg: '#EDE9FE',           route: '/(app)/invoices'        },
  { key: 'purchases',   kpiKey: 'purchases',          label: 'Purchases',   icon: 'bag-handle-outline',       color: Colors.kpi2, bg: Colors.successLight, route: '/(app)/purchases'       },
  { key: 'estimates',   kpiKey: 'estimates',          label: 'Estimates',   icon: 'document-outline',         color: Colors.kpi3, bg: Colors.warningLight, route: '/(app)/estimates'       },
  { key: 'gst',         kpiKey: 'gstRecords',         label: 'GST',         icon: 'shield-half-outline',      color: Colors.kpi1, bg: Colors.infoLight,    route: '/(app)/gst'             },
  { key: 'hr',          kpiKey: 'attendance',         label: 'HR & Payroll',icon: 'briefcase-outline',        color: Colors.kpi6, bg: '#CFFAFE',           route: '/(app)/hr'              },
  { key: 'stock',       kpiKey: 'stockMovements',     label: 'Stock',       icon: 'layers-outline',           color: Colors.kpi5, bg: Colors.errorLight,   route: '/(app)/inventory/stock' },
  { key: 'vendors',     kpiKey: 'vendors',            label: 'Vendors',     icon: 'storefront-outline',       color: Colors.kpi2, bg: Colors.successLight, route: '/(app)/vendors'         },
  { key: 'vehicles',    kpiKey: 'vehicles',           label: 'Vehicles',    icon: 'car-outline',              color: Colors.kpi1, bg: Colors.infoLight,    route: '/(app)/vehicles'        },
  { key: 'maintenance', kpiKey: 'maintenancePeriods', label: 'Maintenance', icon: 'shield-checkmark-outline', color: Colors.kpi3, bg: Colors.warningLight, route: '/(app)/maintenance'     },
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuthStore();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const isFirstRender = useRef(true);

  const fetchDashboard = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const res = await dashboardApi.getSummary();
      setData(res.data);
    } catch {
      setError('Could not load dashboard data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (isFirstRender.current) {
        isFirstRender.current = false;
        fetchDashboard();
      } else {
        fetchDashboard(true);
      }
    }, [fetchDashboard])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboard(true);
  }, [fetchDashboard]);

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  const displayName = user
    ? (user.firstName ? `${user.firstName} ${user.lastName}`.trim() : user.username)
    : 'User';

  const kpis = data?.kpis;
  const visibleKpis = KPI_CONFIG.filter((k) => userHasFeature(user, k.key));

  // Split into "recently visited" (device-local history) and the rest
  const recents = useRecentsStore((s) => s.recents);
  const recentsLoaded = useRecentsStore((s) => s.loaded);
  useEffect(() => {
    if (!recentsLoaded) useRecentsStore.getState().load();
  }, [recentsLoaded]);
  const recentKpis = recents
    .map((k) => visibleKpis.find((c) => c.key === k))
    .filter((c): c is (typeof KPI_CONFIG)[number] => !!c);
  const remainingKpis = visibleKpis.filter((c) => !recents.includes(c.key));

  const renderCards = (cards: typeof KPI_CONFIG) => {
    const card = ({ key, kpiKey, label, icon, color, bg, route }: (typeof KPI_CONFIG)[number]) => {
      const item = kpis?.[kpiKey as keyof typeof kpis] as
        | { total: number; label: string; phase: number }
        | undefined;
      const isMigrated = (data?.migratedPhase ?? 0) >= (item?.phase ?? 99);
      if (isWeb) {
        return (
          <TouchableOpacity key={key} style={styles.statCard} activeOpacity={0.75} onPress={() => router.push(route as any)}>
            <View style={[styles.statIconBox, { backgroundColor: bg }]}>
              <Ionicons name={icon as any} size={18} color={color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.statCount}>{isMigrated ? (item?.total ?? 0) : '—'}</Text>
              <Text style={styles.statLabel}>{label}</Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color={Colors.border} />
          </TouchableOpacity>
        );
      }
      return (
        <TouchableOpacity key={key} style={styles.kpiCard} activeOpacity={0.75} onPress={() => router.push(route as any)}>
          <View style={[styles.kpiIconBox, { backgroundColor: bg }]}>
            <Ionicons name={icon as any} size={20} color={color} />
          </View>
          <Text style={styles.kpiCount}>{isMigrated ? (item?.total ?? 0) : '—'}</Text>
          <Text style={styles.kpiLabel}>{label}</Text>
          {!isMigrated ? (
            <View style={[styles.statusChip, { backgroundColor: '#FFF3CD' }]}>
              <Text style={[styles.statusChipText, { color: '#7A5400' }]}>Phase {item?.phase}</Text>
            </View>
          ) : (
            <View style={[styles.statusChip, { backgroundColor: Colors.successLight }]}>
              <Text style={[styles.statusChipText, { color: Colors.success }]}>Active</Text>
            </View>
          )}
        </TouchableOpacity>
      );
    };

    if (isWeb) return <View style={styles.gridWeb}>{cards.map(card)}</View>;
    // Mobile: explicit rows so flex:1 always gives 2 columns
    return (
      <View style={styles.grid}>
        {Array.from({ length: Math.ceil(cards.length / COLS) }, (_, ri) => (
          <View key={ri} style={styles.gridRow}>
            {cards.slice(ri * COLS, ri * COLS + COLS).map(card)}
            {/* pad the last row so a lone card doesn't stretch full width */}
            {ri === Math.ceil(cards.length / COLS) - 1 && cards.length % COLS !== 0 &&
              Array.from({ length: COLS - (cards.length % COLS) }, (_, i) => (
                <View key={`pad-${i}`} style={{ flex: 1 }} />
              ))}
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.safe}>

      {/* Top Nav Bar — native only; web has the global WebTopNav */}
      {!isWeb && (
        <View style={[styles.navbar, { paddingTop: insets.top + 12 }]}>
          <View style={styles.navLeft}>
            <View style={styles.navLogo}>
              <Ionicons name="flash" size={16} color={Colors.accent} />
            </View>
            <Text style={styles.navTitle}>Rajat Electricals</Text>
          </View>
          <View style={styles.navRight}>
            {user?.isSuperuser && (
              <TouchableOpacity
                onPress={() => router.push('/(app)/admin' as any)}
                style={styles.navLogout}
              >
                <Ionicons name="settings-outline" size={18} color="rgba(255,255,255,0.75)" />
                <Text style={styles.navLogoutText}>Admin</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={handleLogout} style={styles.navLogout}>
              <Ionicons name="log-out-outline" size={18} color="rgba(255,255,255,0.75)" />
              <Text style={styles.navLogoutText}>Sign out</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, isWeb && styles.contentWeb]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting row */}
        <View style={[styles.greetRow, isWeb && styles.greetRowWeb]}>
          <View>
            <Text style={[styles.greetText, isWeb && styles.greetTextWeb]}>{getGreeting()}, {displayName}</Text>
            <Text style={styles.greetSub}>Here's your business overview</Text>
          </View>
          {!isWeb && (
            <View style={styles.phasePill}>
              <Ionicons name="checkmark-circle" size={12} color={Colors.success} />
              <Text style={styles.phasePillText}>Phase 1</Text>
            </View>
          )}
        </View>

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={Colors.accent} />
            <Text style={styles.centerText}>Loading...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerBox}>
            <Ionicons name="cloud-offline-outline" size={40} color={Colors.textMuted} />
            <Text style={styles.errorTitle}>Connection Error</Text>
            <Text style={styles.centerText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => fetchDashboard()}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Recently visited */}
            {recentKpis.length > 0 && (
              <>
                <View style={[styles.sectionHeader, isWeb && styles.sectionHeaderWeb]}>
                  <Text style={styles.sectionTitle}>Recently Visited</Text>
                  {isWeb ? (
                    <TouchableOpacity style={styles.refreshBtn} onPress={() => fetchDashboard(true)} activeOpacity={0.7}>
                      <Ionicons name="refresh-outline" size={13} color={Colors.textSecondary} />
                      <Text style={styles.refreshText}>Refresh</Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.sectionSub}>Pull down to refresh</Text>
                  )}
                </View>
                {renderCards(recentKpis)}
              </>
            )}

            {/* Remaining modules */}
            {remainingKpis.length > 0 && (
              <>
                <View style={[styles.sectionHeader, isWeb && styles.sectionHeaderWeb]}>
                  <Text style={styles.sectionTitle}>
                    {recentKpis.length > 0 ? 'All Modules' : 'Business Modules'}
                  </Text>
                  {recentKpis.length === 0 && (
                    isWeb ? (
                      <TouchableOpacity style={styles.refreshBtn} onPress={() => fetchDashboard(true)} activeOpacity={0.7}>
                        <Ionicons name="refresh-outline" size={13} color={Colors.textSecondary} />
                        <Text style={styles.refreshText}>Refresh</Text>
                      </TouchableOpacity>
                    ) : (
                      <Text style={styles.sectionSub}>Pull down to refresh</Text>
                    )
                  )}
                </View>
                {renderCards(remainingKpis)}
              </>
            )}

            {visibleKpis.length === 0 && (
              <View style={styles.centerBox}>
                <Ionicons name="lock-closed-outline" size={36} color={Colors.textMuted} />
                <Text style={styles.centerText}>
                  No modules are assigned to your account yet. Ask your administrator for access.
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.primary },

  navbar: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: Colors.accent,
  },
  navLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  navLogo: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: 'rgba(255,153,0,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navTitle: { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 0.2 },
  navRight: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  navLogout: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  navLogoutText: { color: 'rgba(255,255,255,0.75)', fontSize: 13 },

  scroll: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 40 },
  // Web: center the page in a fixed-width column like a desktop app
  contentWeb: { alignSelf: 'center', width: '100%', maxWidth: 1240, paddingHorizontal: 32, paddingTop: 6 },

  greetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  greetRowWeb: { backgroundColor: 'transparent', borderBottomWidth: 0, paddingHorizontal: 0, paddingVertical: 20 },
  greetText: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  greetTextWeb: { fontSize: 20 },
  greetSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  phasePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.successLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  phasePillText: { fontSize: 11, fontWeight: '700', color: Colors.success },

  centerBox: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32, gap: 10 },
  centerText: { color: Colors.textSecondary, fontSize: 13, textAlign: 'center' },
  errorTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  retryBtn: {
    marginTop: 8,
    backgroundColor: Colors.accent,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 4,
  },
  retryText: { color: '#111', fontWeight: '700', fontSize: 14 },

  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    marginHorizontal: 14,
    marginTop: 16,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 4,
    borderLeftColor: Colors.accent,
    padding: 14,
    elevation: 2,
    ...Platform.select({
      web: { boxShadow: '0 1px 4px rgba(0,0,0,0.05)' },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
    }),
  },
  summaryLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: Colors.accentLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },
  summaryCount: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginTop: 2 },
  migratedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.successLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  migratedText: { fontSize: 11, color: Colors.success, fontWeight: '700' },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary, textTransform: 'uppercase', letterSpacing: 0.6 },
  sectionSub: { fontSize: 11, color: Colors.textMuted },
  sectionHeaderWeb: { paddingHorizontal: 0, marginTop: 4 },
  refreshBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 6, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  refreshText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },

  grid: {
    paddingHorizontal: 12,
    gap: 10,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 10,
  },

  // Web: compact horizontal stat cards, wrapping to fill the row
  gridWeb: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  statCard: {
    flexGrow: 1, flexBasis: 210, maxWidth: 292,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: 8, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14, paddingVertical: 13,
    ...Platform.select({ web: { boxShadow: '0 1px 2px rgba(0,0,0,0.04)' } }),
  },
  statIconBox: {
    width: 38, height: 38, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
  },
  statCount: { fontSize: 19, fontWeight: '800', color: Colors.textPrimary, lineHeight: 23 },
  statLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500', marginTop: 1 },
  kpiCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    elevation: 1,
    ...Platform.select({
      web: { boxShadow: '0 1px 4px rgba(0,0,0,0.04)' },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 },
    }),
  },
  kpiIconBox: {
    width: 38,
    height: 38,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  kpiCount: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary },
  kpiLabel: { fontSize: 12, color: Colors.textSecondary, marginTop: 2, fontWeight: '500' },
  statusChip: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 3,
  },
  statusChipText: { fontSize: 10, fontWeight: '700' },
});
