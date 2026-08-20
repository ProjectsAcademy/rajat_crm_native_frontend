import { useFeatureGuard } from '../../../hooks/useFeatureGuard';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, Platform,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  hrApi, AttendanceRecord, AttendanceYearSummaryResponse,
} from '../../../services/api';
import { Colors } from '../../../constants/colors';
import AttendanceEditSheet, { EditableAttendance } from '../../../components/AttendanceEditSheet';

const isWeb = Platform.OS === 'web';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  P: { bg: Colors.successLight, text: Colors.success },
  A: { bg: Colors.errorLight,   text: Colors.error },
  H: { bg: Colors.warningLight, text: '#7A5400' },
  L: { bg: Colors.infoLight,    text: Colors.info },
};

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

function currentYm(): { y: number; m: number } {
  const d = new Date();
  return { y: d.getFullYear(), m: d.getMonth() + 1 };
}

export default function EmployeeAttendanceScreen() {
  useFeatureGuard('hr.attendance');
  const params = useLocalSearchParams<{ employeeId: string; name?: string }>();
  const employeeId = parseInt(params.employeeId ?? '0');
  const employeeName = params.name ?? '';

  const [{ y, m }, setYm] = useState(currentYm());
  const [monthRecords, setMonthRecords] = useState<AttendanceRecord[]>([]);
  const [monthLoading, setMonthLoading] = useState(true);

  const [year, setYear] = useState(currentYm().y);
  const [yearData, setYearData] = useState<AttendanceYearSummaryResponse | null>(null);
  const [yearLoading, setYearLoading] = useState(true);

  const [editRecord, setEditRecord] = useState<EditableAttendance | null>(null);

  // ── Month calendar data ──
  const loadMonth = useCallback(async () => {
    if (!employeeId) return;
    setMonthLoading(true);
    try {
      const mm = String(m).padStart(2, '0');
      const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
      const { data } = await hrApi.attendance.list({
        employeeId, from: `${y}-${mm}-01`, to: `${y}-${mm}-${lastDay}`, limit: 100,
      });
      setMonthRecords(data.records);
    } catch { setMonthRecords([]); }
    finally { setMonthLoading(false); }
  }, [employeeId, y, m]);

  useEffect(() => { loadMonth(); }, [loadMonth]);

  // ── Year summary data ──
  const loadYear = useCallback(async () => {
    if (!employeeId) return;
    setYearLoading(true);
    try {
      const { data } = await hrApi.attendance.yearSummary(employeeId, year);
      setYearData(data);
    } catch { setYearData(null); }
    finally { setYearLoading(false); }
  }, [employeeId, year]);

  useEffect(() => { loadYear(); }, [loadYear]);

  const shiftMonth = (delta: number) => {
    const d = new Date(Date.UTC(y, m - 1 + delta, 1));
    setYm({ y: d.getUTCFullYear(), m: d.getUTCMonth() + 1 });
  };

  // ── Calendar grid: weeks of day-cells (Mon-first) ──
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const firstWeekday = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7; // Mon=0
  const recordByDay = new Map<number, AttendanceRecord>();
  for (const r of monthRecords) {
    recordByDay.set(new Date(r.date).getUTCDate(), r);
  }
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const openDay = (day: number) => {
    const rec = recordByDay.get(day);
    if (!rec) return;
    setEditRecord({
      id: rec.id, date: rec.date, attendanceStatus: rec.attendanceStatus,
      hoursWorked: rec.hoursWorked, overtimeHours: rec.overtimeHours,
      notes: rec.notes, employeeName,
    });
  };

  const yearTotals = yearData?.months.reduce(
    (acc, mo) => ({
      P: acc.P + mo.counts.P, A: acc.A + mo.counts.A,
      H: acc.H + mo.counts.H, L: acc.L + mo.counts.L,
      hours: acc.hours + mo.totalHours, ot: acc.ot + mo.totalOvertime,
    }),
    { P: 0, A: 0, H: 0, L: 0, hours: 0, ot: 0 }
  );

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.content, isWeb && styles.contentWeb]}>
        {/* Employee header */}
        <View style={styles.empHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(employeeName || '?').charAt(0).toUpperCase()}</Text>
          </View>
          <View>
            <Text style={styles.empName}>{employeeName || `Employee #${employeeId}`}</Text>
            <Text style={styles.empSub}>Attendance history</Text>
          </View>
        </View>

        {/* ── Month calendar ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Monthly Calendar</Text>
          <View style={styles.nav}>
            <TouchableOpacity style={styles.navBtn} onPress={() => shiftMonth(-1)} hitSlop={8}>
              <Ionicons name="chevron-back" size={16} color={Colors.textSecondary} />
            </TouchableOpacity>
            <Text style={styles.navText}>{MONTH_NAMES[m - 1]} {y}</Text>
            <TouchableOpacity style={styles.navBtn} onPress={() => shiftMonth(1)} hitSlop={8}>
              <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.calendar}>
          <View style={styles.weekRow}>
            {WEEKDAYS.map((wd) => <Text key={wd} style={styles.weekday}>{wd}</Text>)}
          </View>
          {monthLoading ? (
            <ActivityIndicator color={Colors.accent} style={{ paddingVertical: 40 }} />
          ) : (
            weeks.map((week, wi) => (
              <View key={wi} style={styles.weekRow}>
                {week.map((day, di) => {
                  if (day === null) return <View key={di} style={styles.dayCell} />;
                  const rec = recordByDay.get(day);
                  const sc = rec ? STATUS_COLORS[rec.attendanceStatus] : null;
                  return (
                    <TouchableOpacity
                      key={di}
                      style={[styles.dayCell, styles.dayCellActive, sc && { backgroundColor: sc.bg, borderColor: sc.text + '40' }]}
                      onPress={() => openDay(day)}
                      disabled={!rec}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.dayNum, sc && { color: sc.text }]}>{day}</Text>
                      {rec && <Text style={[styles.dayStatus, { color: sc!.text }]}>{rec.attendanceStatus}</Text>}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))
          )}
          {/* Legend */}
          <View style={styles.legend}>
            {Object.entries({ P: 'Present', A: 'Absent', H: 'Half-day', L: 'Leave' }).map(([k, label]) => (
              <View key={k} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: STATUS_COLORS[k].text }]} />
                <Text style={styles.legendText}>{label}</Text>
              </View>
            ))}
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.border }]} />
              <Text style={styles.legendText}>Unmarked</Text>
            </View>
          </View>
        </View>

        {/* ── Year summary ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Yearly Summary</Text>
          <View style={styles.nav}>
            <TouchableOpacity style={styles.navBtn} onPress={() => setYear(year - 1)} hitSlop={8}>
              <Ionicons name="chevron-back" size={16} color={Colors.textSecondary} />
            </TouchableOpacity>
            <Text style={styles.navText}>{year}</Text>
            <TouchableOpacity style={styles.navBtn} onPress={() => setYear(year + 1)} hitSlop={8}>
              <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {yearLoading ? (
          <ActivityIndicator color={Colors.accent} style={{ paddingVertical: 40 }} />
        ) : (
          <View style={styles.table}>
            <View style={[styles.tr, styles.thRow]}>
              <Text style={[styles.th, { flex: 1.8, textAlign: 'left' }]}>Month</Text>
              <Text style={styles.th}>P</Text>
              <Text style={styles.th}>A</Text>
              <Text style={styles.th}>H</Text>
              <Text style={styles.th}>L</Text>
              <Text style={styles.th}>Hours</Text>
              <Text style={styles.th}>OT</Text>
            </View>
            {(yearData?.months ?? []).map((mo) => {
              const isCurrent = mo.month === m && year === y;
              const hasData = mo.totalHours > 0 || Object.values(mo.counts).some((c) => c > 0);
              return (
                <TouchableOpacity
                  key={mo.month}
                  style={[styles.tr, isCurrent && { backgroundColor: Colors.accentLight }]}
                  onPress={() => setYm({ y: year, m: mo.month })}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.td, { flex: 1.8, textAlign: 'left', fontWeight: '700', color: hasData ? Colors.textPrimary : Colors.textMuted }]}>
                    {MONTH_NAMES[mo.month - 1]}
                  </Text>
                  <Text style={[styles.td, { color: mo.counts.P ? Colors.success : Colors.textMuted }]}>{mo.counts.P}</Text>
                  <Text style={[styles.td, { color: mo.counts.A ? Colors.error : Colors.textMuted }]}>{mo.counts.A}</Text>
                  <Text style={[styles.td, { color: mo.counts.H ? '#7A5400' : Colors.textMuted }]}>{mo.counts.H}</Text>
                  <Text style={[styles.td, { color: mo.counts.L ? Colors.info : Colors.textMuted }]}>{mo.counts.L}</Text>
                  <Text style={[styles.td, !hasData && { color: Colors.textMuted }]}>{mo.totalHours}</Text>
                  <Text style={[styles.td, !hasData && { color: Colors.textMuted }]}>{mo.totalOvertime}</Text>
                </TouchableOpacity>
              );
            })}
            {yearTotals && (
              <View style={[styles.tr, styles.totalRow]}>
                <Text style={[styles.td, { flex: 1.8, textAlign: 'left', fontWeight: '800' }]}>Total</Text>
                <Text style={[styles.td, { fontWeight: '800', color: Colors.success }]}>{yearTotals.P}</Text>
                <Text style={[styles.td, { fontWeight: '800', color: Colors.error }]}>{yearTotals.A}</Text>
                <Text style={[styles.td, { fontWeight: '800', color: '#7A5400' }]}>{yearTotals.H}</Text>
                <Text style={[styles.td, { fontWeight: '800', color: Colors.info }]}>{yearTotals.L}</Text>
                <Text style={[styles.td, { fontWeight: '800' }]}>{yearTotals.hours}</Text>
                <Text style={[styles.td, { fontWeight: '800' }]}>{yearTotals.ot}</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <AttendanceEditSheet
        visible={!!editRecord}
        onClose={() => setEditRecord(null)}
        onSaved={() => { loadMonth(); loadYear(); }}
        record={editRecord}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 14, paddingBottom: 40 },
  contentWeb: { alignSelf: 'center', width: '100%', maxWidth: 900, paddingHorizontal: 32, paddingTop: 24 },

  empHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  avatar: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: Colors.accentLight,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,153,0,0.3)',
  },
  avatarText: { fontSize: 19, fontWeight: '800', color: Colors.accent },
  empName: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  empSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 8, marginBottom: 10,
  },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary, textTransform: 'uppercase', letterSpacing: 0.6 },
  nav: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  navBtn: {
    width: 30, height: 30, borderRadius: 6, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center',
  },
  navText: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary, minWidth: 110, textAlign: 'center' },

  calendar: {
    backgroundColor: Colors.surface, borderRadius: 8, borderWidth: 1, borderColor: Colors.border,
    padding: 10, marginBottom: 20,
  },
  weekRow: { flexDirection: 'row', gap: 4, marginBottom: 4 },
  weekday: { flex: 1, textAlign: 'center', fontSize: 10, fontWeight: '700', color: Colors.textMuted, paddingVertical: 4, textTransform: 'uppercase' },
  dayCell: { flex: 1, minHeight: 44, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  dayCellActive: { borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background },
  dayNum: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  dayStatus: { fontSize: 9, fontWeight: '800', marginTop: 1 },

  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingTop: 10, paddingHorizontal: 4, borderTopWidth: 1, borderTopColor: Colors.border, marginTop: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: Colors.textMuted },

  table: { backgroundColor: Colors.surface, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  tr: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 9,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  thRow: { backgroundColor: Colors.surfaceAlt },
  totalRow: { backgroundColor: Colors.surfaceAlt, borderBottomWidth: 0 },
  th: { flex: 1, fontSize: 10, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4, textAlign: 'center' },
  td: { flex: 1, fontSize: 12, fontWeight: '600', color: Colors.textPrimary, textAlign: 'center' },
});
