import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Modal,
  FlatList,
} from 'react-native';
import Svg, { G, Rect, Line, Text as SvgText } from 'react-native-svg';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  dashboardApi,
  RevenueMonth,
  RevenueSnapshot,
  CustomerAmountRow,
  AuthUser,
} from '../services/api';
import { canOpen } from '../store/auth';
import { Colors } from '../constants/colors';

const COLLECTED_COLOR = '#067D62';
const OUTSTANDING_COLOR = '#E65100';

const CHART_H = 180;
const TOP_PAD = 14;
const BAR_CAP = 38;
const SEGMENT_GAP = 2;

function fmtCompact(n: number): string {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${Math.round(n)}`;
}

function fmtFull(n: number): string {
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

function niceMax(v: number): number {
  if (v <= 0) return 100;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / pow;
  const steps = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
  const step = steps.find((s) => n <= s) ?? 10;
  return step * pow;
}

function StackedBar({
  x,
  width,
  collected,
  outstanding,
  max,
  selected,
  onPress,
}: {
  x: number;
  width: number;
  collected: number;
  outstanding: number;
  max: number;
  selected: boolean;
  onPress: () => void;
}) {
  const scale = (v: number) => (max > 0 ? (v / max) * CHART_H : 0);
  const collectedH = scale(collected);
  const outstandingH = outstanding > 0 ? Math.max(0, scale(outstanding) - SEGMENT_GAP) : 0;

  const collectedY = CHART_H - collectedH;
  const outstandingY = collectedY - SEGMENT_GAP - outstandingH;

  return (
    <>
      <Rect
        x={x - 6}
        y={0}
        width={width + 12}
        height={CHART_H}
        fill="transparent"
        onPress={onPress}
      />
      {collectedH > 0 && (
        <Rect
          x={x}
          y={collectedY}
          width={width}
          height={collectedH}
          rx={3}
          fill={COLLECTED_COLOR}
          opacity={selected ? 1 : 0.9}
        />
      )}
      {outstandingH > 0 && (
        <Rect
          x={x}
          y={outstandingY}
          width={width}
          height={outstandingH}
          rx={3}
          fill={OUTSTANDING_COLOR}
          opacity={selected ? 1 : 0.9}
        />
      )}
    </>
  );
}

interface Props {
  user: AuthUser | null;
}

export default function RevenueChart({ user }: Props) {
  const canView = canOpen(user, 'revenue');
  const [monthly, setMonthly] = useState<RevenueMonth[]>([]);
  const [snapshot, setSnapshot] = useState<RevenueSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [width, setWidth] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const [breakdown, setBreakdown] = useState<'collected' | 'outstanding' | null>(null);
  const [collectedRows, setCollectedRows] = useState<CustomerAmountRow[] | null>(null);
  const [outstandingRows, setOutstandingRows] = useState<CustomerAmountRow[] | null>(null);
  const [loadingBreakdown, setLoadingBreakdown] = useState(false);

  const openBreakdown = (kind: 'collected' | 'outstanding') => {
    setBreakdown(kind);
    const rows = kind === 'collected' ? collectedRows : outstandingRows;
    const setRows = kind === 'collected' ? setCollectedRows : setOutstandingRows;
    const fetcher =
      kind === 'collected'
        ? dashboardApi.getCollectedByCustomer
        : dashboardApi.getOutstandingByCustomer;
    if (rows === null) {
      setLoadingBreakdown(true);
      fetcher()
        .then(({ data }) => setRows(data.customers))
        .catch(() => setRows([]))
        .finally(() => setLoadingBreakdown(false));
    }
  };

  const breakdownRows =
    breakdown === 'collected'
      ? collectedRows
      : breakdown === 'outstanding'
      ? outstandingRows
      : null;

  const customerRoute = (customerId: number | null): string | null => {
    if (!customerId) return null;
    if (canOpen(user, 'ledger')) return `/(app)/ledger/${customerId}`;
    if (canOpen(user, 'customers')) return `/(app)/customers/${customerId}`;
    return null;
  };

  useEffect(() => {
    if (!canView) {
      setLoading(false);
      return;
    }
    dashboardApi
      .getRevenue(6)
      .then(({ data }) => {
        setMonthly(data.monthly);
        setSnapshot(data.snapshot);
      })
      .catch(() => {
        setMonthly([]);
        setSnapshot(null);
      })
      .finally(() => setLoading(false));
  }, [canView]);

  if (!canView) return null;
  if (loading) {
    return (
      <View style={[styles.card, styles.loadingBox]}>
        <ActivityIndicator color={Colors.accent} />
      </View>
    );
  }
  if (!snapshot) return null;

  const max = niceMax(Math.max(...monthly.map((m) => m.totalAmount), 1));
  const gridSteps = [0, 0.25, 0.5, 0.75, 1];
  const selected = selectedIdx !== null ? monthly[selectedIdx] : null;

  const chartPadLeft = 52;
  const plotWidth = Math.max(0, width - chartPadLeft - 8);
  const slotWidth = monthly.length > 0 ? plotWidth / monthly.length : 0;
  const barWidth = Math.min(BAR_CAP, slotWidth * 0.56);

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconBox}>
            <Ionicons name="stats-chart-outline" size={17} color={Colors.primary} />
          </View>
          <Text style={styles.headerTitle}>REVENUE</Text>
        </View>

        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>LAST {monthly.length} MONTHS</Text>
        </View>
      </View>

      {/* Stat Boxes */}
      <View style={styles.statsRow}>
        <TouchableOpacity
          style={styles.statBox}
          onPress={() => openBreakdown('collected')}
          activeOpacity={0.7}
        >
          <View style={styles.statTop}>
            <View style={[styles.statDot, { backgroundColor: COLLECTED_COLOR }]} />
            <Text style={styles.statLabel}>COLLECTED</Text>
            <Ionicons name="chevron-forward" size={13} color={Colors.textMuted} />
          </View>
          <Text style={styles.statValue}>{fmtCompact(snapshot.paidAmount)}</Text>
        </TouchableOpacity>

        <View style={styles.statDivider} />

        <TouchableOpacity
          style={styles.statBox}
          onPress={() => openBreakdown('outstanding')}
          activeOpacity={0.7}
        >
          <View style={styles.statTop}>
            <View style={[styles.statDot, { backgroundColor: OUTSTANDING_COLOR }]} />
            <Text style={styles.statLabel}>OUTSTANDING</Text>
            <Ionicons name="chevron-forward" size={13} color={Colors.textMuted} />
          </View>
          <Text style={styles.statValue}>{fmtCompact(snapshot.outstanding)}</Text>
        </TouchableOpacity>
      </View>

      {/* Chart */}
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={styles.chartWrap}>
        {width > 0 && (
          <Svg width={width} height={CHART_H + 28 + TOP_PAD}>
            <G y={TOP_PAD}>
              {gridSteps.slice(1).map((s, i) => {
                const y = CHART_H - CHART_H * s;
                return (
                  <Line
                    key={i}
                    x1={chartPadLeft}
                    y1={y}
                    x2={width}
                    y2={y}
                    stroke="#E2E8F0"
                    strokeWidth={1}
                    strokeDasharray="4 4"
                  />
                );
              })}
              {gridSteps.map((s, i) => (
                <SvgText
                  key={`t-${i}`}
                  x={chartPadLeft - 8}
                  y={CHART_H - CHART_H * s + 4}
                  fontSize={10}
                  fontWeight="600"
                  fill={Colors.textMuted}
                  textAnchor="end"
                >
                  {fmtCompact(max * s)}
                </SvgText>
              ))}

              <Line
                x1={chartPadLeft}
                y1={CHART_H}
                x2={width}
                y2={CHART_H}
                stroke="#E2E8F0"
                strokeWidth={1}
              />

              {monthly.map((m, i) => {
                const x = chartPadLeft + i * slotWidth + (slotWidth - barWidth) / 2;
                return (
                  <StackedBar
                    key={i}
                    x={x}
                    width={barWidth}
                    collected={m.paidAmount}
                    outstanding={m.outstanding}
                    max={max}
                    selected={selectedIdx === i}
                    onPress={() => setSelectedIdx(selectedIdx === i ? null : i)}
                  />
                );
              })}

              {monthly.length > 0 &&
                monthly[monthly.length - 1].totalAmount > 0 &&
                (() => {
                  const i = monthly.length - 1;
                  const m = monthly[i];
                  const x = chartPadLeft + i * slotWidth + slotWidth / 2;
                  const topY = CHART_H - (max > 0 ? (m.totalAmount / max) * CHART_H : 0);
                  return (
                    <SvgText
                      x={x}
                      y={Math.max(10, topY - 6)}
                      fontSize={10}
                      fontWeight="700"
                      fill={Colors.textPrimary}
                      textAnchor="middle"
                    >
                      {fmtCompact(m.totalAmount)}
                    </SvgText>
                  );
                })()}

              {monthly.map((m, i) => {
                const x = chartPadLeft + i * slotWidth + slotWidth / 2;
                const isSelected = selectedIdx === i;
                return (
                  <SvgText
                    key={`m-${i}`}
                    x={x}
                    y={CHART_H + 18}
                    fontSize={11}
                    fontWeight={isSelected ? '800' : '600'}
                    letterSpacing={0.5}
                    fill={isSelected ? Colors.primary : Colors.textSecondary}
                    textAnchor="middle"
                  >
                    {m.label.split(' ')[0].toUpperCase()}
                  </SvgText>
                );
              })}
            </G>
          </Svg>
        )}
      </View>

      {/* Tap-to-inspect detail */}
      {selected && (
        <View style={styles.detailBox}>
          <Text style={styles.detailTitle}>{selected.label}</Text>
          <View style={styles.detailRow}>
            <View style={[styles.statDot, { backgroundColor: COLLECTED_COLOR }]} />
            <Text style={styles.detailLabel}>Collected</Text>
            <Text style={styles.detailValue}>{fmtFull(selected.paidAmount)}</Text>
          </View>
          <View style={styles.detailRow}>
            <View style={[styles.statDot, { backgroundColor: OUTSTANDING_COLOR }]} />
            <Text style={styles.detailLabel}>Outstanding</Text>
            <Text style={styles.detailValue}>{fmtFull(selected.outstanding)}</Text>
          </View>
          <View style={styles.detailTotalRow}>
            <View style={{ width: 6 }} />
            <Text style={styles.detailTotalLabel}>Total</Text>
            <Text style={styles.detailTotalValue}>{fmtFull(selected.totalAmount)}</Text>
          </View>
        </View>
      )}

      {/* Collected/Outstanding-by-customer breakdown modal */}
      <Modal
        visible={breakdown !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setBreakdown(null)}
      >
        <View style={cbc.backdrop}>
          <View style={cbc.card}>
            <View style={cbc.header}>
              <View>
                <Text style={cbc.title}>
                  {breakdown === 'collected' ? 'Collected' : 'Outstanding'} by Customer
                </Text>
                <Text style={cbc.subtitle}>
                  All-time ·{' '}
                  {fmtFull(
                    breakdown === 'collected' ? snapshot.paidAmount : snapshot.outstanding
                  )}{' '}
                  total
                </Text>
              </View>
              <TouchableOpacity onPress={() => setBreakdown(null)} hitSlop={10}>
                <Ionicons name="close" size={22} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            {loadingBreakdown ? (
              <View style={cbc.loadingWrap}>
                <ActivityIndicator color={Colors.accent} />
              </View>
            ) : !breakdownRows || breakdownRows.length === 0 ? (
              <View style={cbc.emptyWrap}>
                <Ionicons name="wallet-outline" size={28} color={Colors.textMuted} />
                <Text style={cbc.emptyText}>
                  {breakdown === 'collected'
                    ? 'No payments recorded yet'
                    : 'Nothing outstanding'}
                </Text>
              </View>
            ) : (
              <FlatList
                data={breakdownRows}
                keyExtractor={(r) => String(r.customerId ?? 'none')}
                style={{ maxHeight: 380 }}
                ItemSeparatorComponent={() => <View style={cbc.separator} />}
                renderItem={({ item }) => {
                  const route = customerRoute(item.customerId);
                  return (
                    <TouchableOpacity
                      style={cbc.row}
                      disabled={!route}
                      activeOpacity={0.6}
                      onPress={() => {
                        setBreakdown(null);
                        router.push(route as any);
                      }}
                    >
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={cbc.name} numberOfLines={1}>
                          {item.customerName}
                        </Text>
                        {item.customerCode && <Text style={cbc.code}>{item.customerCode}</Text>}
                      </View>
                      <Text
                        style={[
                          cbc.amount,
                          {
                            color:
                              breakdown === 'collected' ? COLLECTED_COLOR : OUTSTANDING_COLOR,
                          },
                        ]}
                      >
                        {fmtFull(item.amount)}
                      </Text>
                      {route && (
                        <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
                      )}
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    flex: 1,
    ...Platform.select({
      web: {
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      },
      default: {
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
      },
    }),
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBox: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: 'rgba(0,43,73,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: Colors.textPrimary,
  },
  headerBadge: {
    backgroundColor: Colors.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  headerBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: Colors.textSecondary,
  },

  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: '#F8FAFC',
  },
  statBox: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  statDivider: {
    width: 1,
    height: '60%',
    backgroundColor: Colors.border,
  },
  statTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: Colors.textSecondary,
    flex: 1,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
    marginTop: 6,
    ...Platform.select({ web: { fontVariant: ['tabular-nums'] } }),
  },

  chartWrap: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flex: 1,
    justifyContent: 'flex-end',
  },

  detailBox: {
    marginHorizontal: 16,
    marginBottom: 14,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
  },
  detailTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 3,
  },
  detailLabel: {
    flex: 1,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
    ...Platform.select({ web: { fontVariant: ['tabular-nums'] } }),
  },
  detailTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 6,
    marginTop: 3,
  },
  detailTotalLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  detailTotalValue: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
});

const cbc = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    overflow: 'hidden',
    ...Platform.select({
      web: { boxShadow: '0 12px 32px rgba(0,0,0,0.2)' },
      default: {
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  loadingWrap: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyWrap: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    gap: 10,
  },
  name: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  code: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
  amount: {
    fontSize: 13,
    fontWeight: '700',
  },
});
