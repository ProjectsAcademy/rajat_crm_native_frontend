import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import Svg, { G, Rect, Line, Text as SvgText } from 'react-native-svg';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { dashboardApi, RevenueMonth, RevenueSnapshot, AuthUser } from '../services/api';
import { userHasFeature } from '../store/auth';
import { Colors } from '../constants/colors';

// Reused from this app's existing payment-status convention (orders/invoices
// list screens) rather than inventing new tokens — collected = success green,
// outstanding = the same amber already used for "partial" payment status.
const COLLECTED_COLOR   = '#067D62';
const OUTSTANDING_COLOR = '#E65100';

const CHART_H = 180;
const TOP_PAD = 14;      // headroom above the tallest gridline so its label isn't clipped
const BAR_CAP = 42;      // marks-and-anatomy: bars are capped, never fill the slot
const SEGMENT_GAP = 2;   // surface gap between stacked segments

function fmtCompact(n: number): string {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
  if (n >= 100000)   return `₹${(n / 100000).toFixed(2)}L`;
  if (n >= 1000)     return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${Math.round(n)}`;
}
function fmtFull(n: number): string {
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}
// Round up to a "clean" axis max, on a finer step set than 1/2/5/10 so the
// tallest bar doesn't leave a huge gap under the top tick (1/2/5 can nearly
// double a value that's just over a step; this caps the worst case at ~20%).
function niceMax(v: number): number {
  if (v <= 0) return 100;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / pow;
  const steps = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
  const step = steps.find((s) => n <= s) ?? 10;
  return step * pow;
}

// A single stacked bar: Collected (bottom) + Outstanding (top). Sharp
// corners throughout — this design's bars are square, not rounded.
function StackedBar({ x, width, collected, outstanding, max, selected, onPress }: {
  x: number; width: number; collected: number; outstanding: number; max: number;
  selected: boolean; onPress: () => void;
}) {
  const scale = (v: number) => (max > 0 ? (v / max) * CHART_H : 0);
  const collectedH   = scale(collected);
  const outstandingH = outstanding > 0 ? Math.max(0, scale(outstanding) - SEGMENT_GAP) : 0;

  const collectedY   = CHART_H - collectedH;
  const outstandingY = collectedY - SEGMENT_GAP - outstandingH;

  return (
    <>
      {/* Invisible hit target — wider than the visual bar (interaction.md: hit target > mark) */}
      <Rect x={x - 4} y={0} width={width + 8} height={CHART_H} fill="transparent" onPress={onPress} />
      {collectedH > 0 && <Rect x={x} y={collectedY} width={width} height={collectedH} fill={COLLECTED_COLOR} opacity={selected ? 1 : 0.92} />}
      {outstandingH > 0 && <Rect x={x} y={outstandingY} width={width} height={outstandingH} fill={OUTSTANDING_COLOR} opacity={selected ? 1 : 0.92} />}
    </>
  );
}

interface Props { user: AuthUser | null }

export default function RevenueChart({ user }: Props) {
  const canView = userHasFeature(user, 'orders');
  const [monthly, setMonthly] = useState<RevenueMonth[]>([]);
  const [snapshot, setSnapshot] = useState<RevenueSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [width, setWidth] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!canView) { setLoading(false); return; }
    dashboardApi.getRevenue(6)
      .then(({ data }) => { setMonthly(data.monthly); setSnapshot(data.snapshot); })
      .catch(() => { setMonthly([]); setSnapshot(null); })
      .finally(() => setLoading(false));
  }, [canView]);

  if (!canView) return null;
  if (loading) {
    return (
      <View style={[styles.card, { alignItems: 'center', paddingVertical: 30 }]}>
        <ActivityIndicator color={Colors.accent} />
      </View>
    );
  }
  if (!snapshot) return null;

  const max = niceMax(Math.max(...monthly.map((m) => m.totalAmount), 1));
  const gridSteps = [0, 0.25, 0.5, 0.75, 1];
  const selected = selectedIdx !== null ? monthly[selectedIdx] : null;

  // Bar geometry
  const chartPadLeft = 52; // room for axis labels (₹XX.XXL can run wide)
  const plotWidth = Math.max(0, width - chartPadLeft - 8);
  const slotWidth = monthly.length > 0 ? plotWidth / monthly.length : 0;
  const barWidth = Math.min(BAR_CAP, slotWidth * 0.6);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
          <Ionicons name="stats-chart-outline" size={15} color={Colors.primary} />
          <Text style={styles.headerTitle}>REVENUE</Text>
        </View>
        <Text style={styles.headerCaption}>LAST {monthly.length} MONTHS</Text>
      </View>

      {/* Stat row */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
            <View style={[styles.statDot, { backgroundColor: COLLECTED_COLOR }]} />
            <Text style={styles.statLabel}>COLLECTED</Text>
          </View>
          <Text style={styles.statValue}>{fmtCompact(snapshot.paidAmount)}</Text>
        </View>
        <View style={[styles.statBox, styles.statBorder]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
            <View style={[styles.statDot, { backgroundColor: OUTSTANDING_COLOR }]} />
            <Text style={styles.statLabel}>OUTSTANDING</Text>
          </View>
          <Text style={styles.statValue}>{fmtCompact(snapshot.outstanding)}</Text>
        </View>
      </View>

      {/* Chart */}
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={styles.chartWrap}>
        {width > 0 && (
          <Svg width={width} height={CHART_H + 28 + TOP_PAD}>
            {/* Everything below is drawn in the 0..CHART_H coordinate space
                and shifted down by TOP_PAD as a group, so the top gridline's
                label has headroom instead of clipping against the SVG edge. */}
            <G y={TOP_PAD}>
              {/* Light gridlines at 25/50/75/100% — the baseline (0%) gets its
                  own separate, equally-light line below instead of a redundant
                  duplicate here. */}
              {gridSteps.slice(1).map((s, i) => {
                const y = CHART_H - CHART_H * s;
                return <Line key={i} x1={chartPadLeft} y1={y} x2={width} y2={y} stroke="#EAEDED" strokeWidth={1} />;
              })}
              {gridSteps.map((s, i) => (
                <SvgText key={`t-${i}`} x={chartPadLeft - 8} y={CHART_H - CHART_H * s + 4} fontSize={10} fontWeight="700" fill={Colors.textMuted} textAnchor="end">
                  {fmtCompact(max * s)}
                </SvgText>
              ))}
              {/* Baseline — same light weight as the other gridlines, not a heavy rule */}
              <Line x1={chartPadLeft} y1={CHART_H} x2={width} y2={CHART_H} stroke="#EAEDED" strokeWidth={1} />
              {monthly.map((m, i) => {
                const x = chartPadLeft + i * slotWidth + (slotWidth - barWidth) / 2;
                return (
                  <StackedBar
                    key={i}
                    x={x} width={barWidth}
                    collected={m.paidAmount} outstanding={m.outstanding} max={max}
                    selected={selectedIdx === i}
                    onPress={() => setSelectedIdx(selectedIdx === i ? null : i)}
                  />
                );
              })}
              {/* Direct label on the endpoint only (most recent month) — the rest
                  stay reachable via the axis scale and tap-to-inspect, not hidden.
                  Skipped when that month has no revenue yet (e.g. the current,
                  still-in-progress month): with nothing to label, it renders
                  right on the baseline as a stray "₹0". */}
              {monthly.length > 0 && monthly[monthly.length - 1].totalAmount > 0 && (() => {
                const i = monthly.length - 1;
                const m = monthly[i];
                const x = chartPadLeft + i * slotWidth + slotWidth / 2;
                const topY = CHART_H - (max > 0 ? (m.totalAmount / max) * CHART_H : 0);
                return (
                  <SvgText x={x} y={Math.max(10, topY - 6)} fontSize={10} fontWeight="700" fill={Colors.textPrimary} textAnchor="middle">
                    {fmtCompact(m.totalAmount)}
                  </SvgText>
                );
              })()}
              {monthly.map((m, i) => {
                const x = chartPadLeft + i * slotWidth + slotWidth / 2;
                return (
                  <SvgText key={`m-${i}`} x={x} y={CHART_H + 18} fontSize={10} fontWeight="800" letterSpacing={1} fill={selectedIdx === i ? Colors.textPrimary : Colors.textSecondary} textAnchor="middle">
                    {m.label.split(' ')[0].toUpperCase()}
                  </SvgText>
                );
              })}
            </G>
          </Svg>
        )}
      </View>

      {/* Tap-to-inspect detail (touch equivalent of hover tooltip — values already
          direct-labeled via the axis, this just gives the exact split per month) */}
      {selected && (
        <View style={styles.detailBox}>
          <Text style={styles.detailTitle}>{selected.label}</Text>
          <View style={styles.detailRow}><View style={[styles.statDot, { backgroundColor: COLLECTED_COLOR }]} /><Text style={styles.detailLabel}>Collected</Text><Text style={styles.detailValue}>{fmtFull(selected.paidAmount)}</Text></View>
          <View style={styles.detailRow}><View style={[styles.statDot, { backgroundColor: OUTSTANDING_COLOR }]} /><Text style={styles.detailLabel}>Outstanding</Text><Text style={styles.detailValue}>{fmtFull(selected.outstanding)}</Text></View>
          <View style={[styles.detailRow, { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 6, marginTop: 2 }]}>
            <View style={{ width: 4 }} /><Text style={[styles.detailLabel, { fontWeight: '700', color: Colors.textPrimary }]}>Total</Text><Text style={[styles.detailValue, { fontWeight: '800' }]}>{fmtFull(selected.totalAmount)}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, marginBottom: 16, flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 15,
    borderBottomWidth: 2, borderBottomColor: Colors.textPrimary,
  },
  headerTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 1.4, color: Colors.textPrimary },
  headerCaption: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2, color: Colors.textMuted },

  statsRow: { flexDirection: 'row', borderBottomWidth: 2, borderBottomColor: Colors.textPrimary },
  statBox: { flex: 1, paddingHorizontal: 18, paddingVertical: 16 },
  statBorder: { borderLeftWidth: 1, borderLeftColor: Colors.border },
  statDot: { width: 9, height: 9 },
  statLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1, color: Colors.textSecondary },
  statValue: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.7, marginTop: 8, ...Platform.select({ web: { fontVariant: ['tabular-nums'] } }) },

  chartWrap: { paddingHorizontal: 18, paddingVertical: 18, flex: 1, justifyContent: 'flex-end' },

  detailBox: { marginHorizontal: 18, marginBottom: 16, backgroundColor: Colors.background, padding: 12 },
  detailTitle: { fontSize: 12, fontWeight: '700', color: Colors.textPrimary, marginBottom: 6 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 3 },
  detailLabel: { flex: 1, fontSize: 12, color: Colors.textSecondary },
  detailValue: { fontSize: 12, fontWeight: '700', color: Colors.textPrimary, ...Platform.select({ default: {}, web: { fontVariant: ['tabular-nums'] } }) },
});
