import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore, canOpen } from '../../store/auth';
import { useRecentsStore } from '../../store/recents';
import { dashboardApi, DashboardResponse } from '../../services/api';
import { Colors } from '../../constants/colors';
import DashboardCalendar from '../../components/DashboardCalendar';
import RevenueChart from '../../components/RevenueChart';
import ModuleCard, { ModuleItemConfig } from '../../components/dashboard/ModuleCard';

const isWeb = Platform.OS === 'web';

// One card per RBAC feature — the grid shows whatever the user has access to.
// `key` is the feature key; `kpiKey` is the matching field in DashboardResponse.
const KPI_CONFIG: ModuleItemConfig[] = [
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
  const { width } = useWindowDimensions();
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
    ? user.firstName
      ? `${user.firstName} ${user.lastName}`.trim()
      : user.username
    : 'User';

  const kpis = data?.kpis;
  const visibleKpis = useMemo(
    () => KPI_CONFIG.filter((k) => canOpen(user, k.key)),
    [user]
  );

  // Recents
  const recents = useRecentsStore((s) => s.recents);
  const recentsLoaded = useRecentsStore((s) => s.loaded);
  useEffect(() => {
    if (!recentsLoaded) useRecentsStore.getState().load();
  }, [recentsLoaded]);

  const recentKpis = useMemo(
    () =>
      recents
        .map((k) => visibleKpis.find((c) => c.key === k))
        .filter((c): c is ModuleItemConfig => !!c),
    [recents, visibleKpis]
  );

  const remainingKpis = useMemo(
    () => visibleKpis.filter((c) => !recents.includes(c.key)),
    [visibleKpis, recents]
  );

  // Responsive column counts
  const numColumns = useMemo(() => {
    if (width < 640) return 2;
    if (width < 960) return 3;
    if (width < 1280) return 4;
    return 5;
  }, [width]);

  const isSideBySide = width >= 960;

  // Helper to chunk cards into rows for uniform grid spacing
  const renderCardGrid = (cards: ModuleItemConfig[], variant: 'compact' | 'full' = 'full') => {
    // For compact variant on web/desktop, use a wrapping flex layout
    if (isWeb && variant === 'compact') {
      return (
        <View style={styles.compactFlexWrap}>
          {cards.map((c) => {
            const item = kpis?.[c.kpiKey as keyof typeof kpis] as
              | { total: number; label: string; phase: number }
              | undefined;
            const isMigrated = (data?.migratedPhase ?? 0) >= (item?.phase ?? 99);
            const count = isMigrated ? (item?.total ?? 0) : '—';
            return (
              <ModuleCard
                key={c.key}
                config={c}
                count={count}
                phase={item?.phase}
                isMigrated={isMigrated}
                variant="compact"
                onPress={() => router.push(c.route as any)}
                style={styles.compactFlexItem}
              />
            );
          })}
        </View>
      );
    }

    // Grid row layout
    const rows: ModuleItemConfig[][] = [];
    for (let i = 0; i < cards.length; i += numColumns) {
      rows.push(cards.slice(i, i + numColumns));
    }

    return (
      <View style={styles.gridContainer}>
        {rows.map((row, ri) => (
          <View key={ri} style={styles.gridRow}>
            {row.map((c) => {
              const item = kpis?.[c.kpiKey as keyof typeof kpis] as
                | { total: number; label: string; phase: number }
                | undefined;
              const isMigrated = (data?.migratedPhase ?? 0) >= (item?.phase ?? 99);
              const count = isMigrated ? (item?.total ?? 0) : '—';
              return (
                <View key={c.key} style={styles.gridCol}>
                  <ModuleCard
                    config={c}
                    count={count}
                    phase={item?.phase}
                    isMigrated={isMigrated}
                    variant={variant}
                    onPress={() => router.push(c.route as any)}
                  />
                </View>
              );
            })}
            {/* Pad incomplete row */}
            {row.length < numColumns &&
              Array.from({ length: numColumns - row.length }).map((_, pi) => (
                <View key={`pad-${pi}`} style={styles.gridCol} />
              ))}
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.safe}>
      {/* Top Nav Bar — native only */}
      {!isWeb && (
        <View style={[styles.navbar, { paddingTop: insets.top + 10 }]}>
          <View style={styles.navLeft}>
            <View style={styles.navLogo}>
              <Ionicons name="flash" size={17} color={Colors.accent} />
            </View>
            <Text style={styles.navTitle}>Rajat Electricals</Text>
          </View>
          <View style={styles.navRight}>
            {user?.isSuperuser && (
              <TouchableOpacity
                onPress={() => router.push('/(app)/admin' as any)}
                style={styles.navActionBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="settings-outline" size={16} color="rgba(255,255,255,0.85)" />
                <Text style={styles.navActionText}>Admin</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={handleLogout}
              style={styles.navActionBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="log-out-outline" size={16} color="rgba(255,255,255,0.85)" />
              <Text style={styles.navActionText}>Sign out</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          isWeb && (width >= 1280 ? styles.contentWebWide : styles.contentWeb),
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.accent}
            colors={[Colors.accent]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Masthead / Header section */}
        {isWeb ? (
          <View style={styles.masthead}>
            <View style={styles.mastheadTextGroup}>
              <Text style={styles.eyebrow}>DASHBOARD / OVERVIEW</Text>
              <Text style={styles.mastheadTitle}>
                {getGreeting()}, {displayName}
              </Text>
              <Text style={styles.mastheadSub}>Here's your business overview</Text>
            </View>

            <View style={styles.mastheadActions}>
              <View style={styles.livePill}>
                <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
                <Text style={styles.livePillText}>PHASE 1 LIVE</Text>
              </View>

              <TouchableOpacity
                style={styles.refreshBtn}
                onPress={() => fetchDashboard(true)}
                activeOpacity={0.75}
              >
                <Ionicons name="refresh-outline" size={15} color={Colors.textPrimary} />
                <Text style={styles.refreshBtnText}>REFRESH</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.greetCard}>
            <View style={styles.greetTextGroup}>
              <Text style={styles.greetText}>
                {getGreeting()}, {displayName}
              </Text>
              <Text style={styles.greetSub}>Here's your business overview</Text>
            </View>

            <View style={styles.phasePill}>
              <Ionicons name="checkmark-circle" size={13} color={Colors.success} />
              <Text style={styles.phasePillText}>Phase 1</Text>
            </View>
          </View>
        )}

        {/* Widgets Row (Calendar & Revenue) */}
        <View style={isSideBySide ? styles.widgetsRowSide : styles.widgetsRowStacked}>
          <View style={isSideBySide ? styles.widgetHalf : styles.widgetFull}>
            <DashboardCalendar user={user} />
          </View>
          <View style={isSideBySide ? styles.widgetHalf : styles.widgetFull}>
            <RevenueChart user={user} />
          </View>
        </View>

        {/* Dynamic States: Loading, Error, or Modules */}
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={Colors.accent} />
            <Text style={styles.centerText}>Loading...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerBox}>
            <Ionicons name="cloud-offline-outline" size={44} color={Colors.textMuted} />
            <Text style={styles.errorTitle}>Connection Error</Text>
            <Text style={styles.centerText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => fetchDashboard()}
              activeOpacity={0.8}
            >
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Recently Visited */}
            {recentKpis.length > 0 && (
              <View style={styles.sectionWrap}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleRow}>
                    <Text style={styles.sectionTitle}>
                      {isWeb ? 'RECENTLY VISITED' : 'Recently Visited'}
                    </Text>
                    <View style={styles.sectionCountPill}>
                      <Text style={styles.sectionCountText}>
                        {recentKpis.length} module{recentKpis.length !== 1 ? 's' : ''}
                      </Text>
                    </View>
                  </View>
                  {!isWeb && <Text style={styles.sectionSub}>Pull down to refresh</Text>}
                </View>

                {renderCardGrid(recentKpis, 'compact')}
              </View>
            )}

            {/* Remaining Modules */}
            {remainingKpis.length > 0 && (
              <View style={styles.sectionWrap}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleRow}>
                    <Text style={styles.sectionTitle}>
                      {isWeb
                        ? 'ALL MODULES'
                        : recentKpis.length > 0
                        ? 'All Modules'
                        : 'Business Modules'}
                    </Text>
                    <View style={styles.sectionCountPill}>
                      <Text style={styles.sectionCountText}>
                        {remainingKpis.length} module{remainingKpis.length !== 1 ? 's' : ''}
                      </Text>
                    </View>
                  </View>
                  {!isWeb && recentKpis.length === 0 && (
                    <Text style={styles.sectionSub}>Pull down to refresh</Text>
                  )}
                </View>

                {renderCardGrid(remainingKpis, 'full')}
              </View>
            )}

            {/* Empty state if user has no assigned modules */}
            {visibleKpis.length === 0 && (
              <View style={styles.centerBox}>
                <Ionicons name="lock-closed-outline" size={40} color={Colors.textMuted} />
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
  safe: {
    flex: 1,
    backgroundColor: Colors.primary,
  },

  // Native top bar
  navbar: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  navLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  navLogo: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: 'rgba(217,119,6,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  navRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  navActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  navActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },

  scroll: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 48,
  },
  contentWeb: {
    paddingHorizontal: 32,
    paddingTop: 18,
    maxWidth: 1440,
    alignSelf: 'center',
    width: '100%',
  },
  contentWebWide: {
    paddingHorizontal: 48,
    paddingTop: 24,
    maxWidth: 1440,
    alignSelf: 'center',
    width: '100%',
  },

  // Web masthead
  masthead: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 20,
    flexWrap: 'wrap',
    paddingBottom: 22,
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  mastheadTextGroup: {
    flex: 1,
    minWidth: 260,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.6,
    color: Colors.accent,
    marginBottom: 6,
  },
  mastheadTitle: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.6,
    color: Colors.textPrimary,
    lineHeight: 36,
  },
  mastheadSub: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  mastheadActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.successLight,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(5,150,105,0.2)',
  },
  livePillText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: Colors.success,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
      },
    }),
  },
  refreshBtnText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: Colors.textPrimary,
  },

  // Native greeting card
  greetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
    ...Platform.select({
      web: { boxShadow: '0 1px 3px rgba(0,0,0,0.03)' },
      default: {
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 2,
      },
    }),
  },
  greetTextGroup: {
    flex: 1,
    paddingRight: 10,
  },
  greetText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  greetSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  phasePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.successLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  phasePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.success,
  },

  // Widgets layout
  widgetsRowSide: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  widgetsRowStacked: {
    flexDirection: 'column',
    gap: 16,
    marginBottom: 20,
  },
  widgetHalf: {
    flex: 1,
    minWidth: 0,
  },
  widgetFull: {
    width: '100%',
  },

  // Dynamic state boxes
  centerBox: {
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
    gap: 12,
  },
  centerText: {
    color: Colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 400,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  retryBtn: {
    marginTop: 6,
    backgroundColor: Colors.accent,
    paddingHorizontal: 22,
    paddingVertical: 9,
    borderRadius: 8,
  },
  retryText: {
    color: '#111',
    fontWeight: '700',
    fontSize: 13,
  },

  // Sections
  sectionWrap: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.1,
    color: Colors.textPrimary,
  },
  sectionCountPill: {
    backgroundColor: Colors.border,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  sectionCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  sectionSub: {
    fontSize: 11,
    color: Colors.textMuted,
  },

  // Grids
  gridContainer: {
    gap: 12,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
  },
  gridCol: {
    flex: 1,
    minWidth: 0,
  },

  // Web compact wrap
  compactFlexWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  compactFlexItem: {
    flexGrow: 1,
    flexBasis: 240,
    maxWidth: 360,
  },
});
