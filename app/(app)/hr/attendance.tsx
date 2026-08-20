import { useFeatureGuard } from '../../../hooks/useFeatureGuard';
import {
  View, Text, FlatList, ScrollView, StyleSheet, ActivityIndicator,
  RefreshControl, TouchableOpacity, TextInput, Platform,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  hrApi, AttendanceRecord, AttendanceDayEmployee, AttendanceMonthSummaryRow,
} from '../../../services/api';
import { Colors } from '../../../constants/colors';
import AttendanceEditSheet, {
  ATT_STATUSES, DEFAULT_HOURS, EditableAttendance,
} from '../../../components/AttendanceEditSheet';

const isWeb = Platform.OS === 'web';

const STATUS_LABELS: Record<string, { label: string; bg: string; text: string }> = {
  P: { label: 'Present',  bg: Colors.successLight, text: Colors.success },
  A: { label: 'Absent',   bg: Colors.errorLight,   text: Colors.error },
  H: { label: 'Half-day', bg: Colors.warningLight, text: '#7A5400' },
  L: { label: 'Leave',    bg: Colors.infoLight,    text: Colors.info },
};

// ── Date helpers (all ISO YYYY-MM-DD, no time component) ─────────────────────

function isoToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function shiftIso(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
function fmtIso(iso: string): string {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
}
function currentMonth(): string {
  return isoToday().slice(0, 7);
}
function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}
function fmtMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Draft entry for one employee on the marking screen
interface Draft { status: string; hours: string; overtime: string; }

export default function AttendanceScreen() {
  useFeatureGuard('hr.attendance');
  const [segment, setSegment] = useState<'mark' | 'records' | 'summary'>('mark');

  // ── Mark tab state ──
  const [date, setDate] = useState(isoToday());
  const [roster, setRoster] = useState<AttendanceDayEmployee[]>([]);
  const [drafts, setDrafts] = useState<Record<number, Draft>>({});
  const [dayLoading, setDayLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  // ── Records tab state ──
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [total, setTotal] = useState(0);
  const [editRecord, setEditRecord] = useState<EditableAttendance | null>(null);

  // ── Summary tab state ──
  const [month, setMonth] = useState(currentMonth());
  const [summaryRows, setSummaryRows] = useState<AttendanceMonthSummaryRow[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(true);

  // ── Mark tab: load roster + seed drafts from saved records ──
  const loadDay = useCallback(async (d: string) => {
    setDayLoading(true);
    setSaveMsg('');
    try {
      const { data } = await hrApi.attendance.day(d);
      setRoster(data.employees);
      const seeded: Record<number, Draft> = {};
      for (const e of data.employees) {
        if (e.record) {
          seeded[e.id] = {
            status: e.record.attendanceStatus,
            hours: String(parseFloat(e.record.hoursWorked)),
            overtime: String(parseFloat(e.record.overtimeHours)),
          };
        }
      }
      setDrafts(seeded);
    } catch {
      setRoster([]);
      setDrafts({});
    } finally {
      setDayLoading(false);
    }
  }, []);

  useEffect(() => { loadDay(date); }, [date, loadDay]);

  const setDraft = (empId: number, patch: Partial<Draft>, statusTap = false) => {
    setDrafts((prev) => {
      const cur = prev[empId] ?? { status: '', hours: '0', overtime: '0' };
      const next = { ...cur, ...patch };
      if (statusTap && patch.status) next.hours = DEFAULT_HOURS[patch.status];
      return { ...prev, [empId]: next };
    });
  };

  const markAllPresent = () => {
    setDrafts((prev) => {
      const next = { ...prev };
      for (const e of roster) {
        if (!next[e.id]?.status || next[e.id].status !== 'P') {
          next[e.id] = { status: 'P', hours: DEFAULT_HOURS.P, overtime: next[e.id]?.overtime ?? '0' };
        }
      }
      return next;
    });
  };

  // Rows to send: drafted and either new or different from the saved record
  const changedRows = roster.filter((e) => {
    const d = drafts[e.id];
    if (!d?.status) return false;
    if (!e.record) return true;
    return (
      d.status !== e.record.attendanceStatus ||
      parseFloat(d.hours) !== parseFloat(e.record.hoursWorked) ||
      parseFloat(d.overtime || '0') !== parseFloat(e.record.overtimeHours)
    );
  });

  const handleSave = async () => {
    if (changedRows.length === 0) return;
    for (const e of changedRows) {
      const d = drafts[e.id];
      const h = parseFloat(d.hours);
      if (isNaN(h) || h < 0 || h > 24) { setSaveMsg(`Invalid hours for ${e.name}.`); return; }
      const o = parseFloat(d.overtime || '0');
      if (isNaN(o) || o < 0) { setSaveMsg(`Invalid overtime for ${e.name}.`); return; }
    }
    setSaving(true);
    setSaveMsg('');
    try {
      await hrApi.attendance.bulkMark({
        date,
        records: changedRows.map((e) => ({
          employeeId: e.id,
          attendanceStatus: drafts[e.id].status,
          hoursWorked: parseFloat(drafts[e.id].hours),
          overtimeHours: parseFloat(drafts[e.id].overtime || '0'),
        })),
      });
      await loadDay(date);
      setSaveMsg('Saved.');
    } catch (e: any) {
      setSaveMsg(e?.response?.data?.error ?? 'Failed to save attendance.');
    } finally {
      setSaving(false);
    }
  };

  // ── Records tab ──
  const loadRecords = useCallback(async (silent = false) => {
    if (!silent) setRecordsLoading(true);
    try {
      const { data } = await hrApi.attendance.list({ limit: 100 });
      setRecords(data.records);
      setTotal(data.total);
    } catch { setRecords([]); }
    finally { setRecordsLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { if (segment === 'records') loadRecords(); }, [segment, loadRecords]);

  // ── Summary tab ──
  const loadSummary = useCallback(async (m: string) => {
    setSummaryLoading(true);
    try {
      const { data } = await hrApi.attendance.monthSummary(m);
      setSummaryRows(data.rows);
    } catch { setSummaryRows([]); }
    finally { setSummaryLoading(false); }
  }, []);

  useEffect(() => { if (segment === 'summary') loadSummary(month); }, [segment, month, loadSummary]);

  // ─────────────────────────────────────────────────────────────────────────────
  //  Renderers
  // ─────────────────────────────────────────────────────────────────────────────

  const renderSegments = () => (
    <View style={styles.segmentRow}>
      {([['mark', 'Mark'], ['records', 'Records'], ['summary', 'Summary']] as const).map(([key, label]) => (
        <TouchableOpacity
          key={key}
          style={[styles.segment, segment === key && styles.segmentActive]}
          onPress={() => setSegment(key)}
          activeOpacity={0.7}
        >
          <Text style={[styles.segmentText, segment === key && styles.segmentTextActive]}>{label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderMarkRow = ({ item }: { item: AttendanceDayEmployee }) => {
    const d = drafts[item.id];
    return (
      <View style={styles.markRow}>
        <View style={styles.markRowTop}>
          <View style={{ flex: 1, minWidth: 120 }}>
            <Text style={styles.empName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.empCode}>{item.employeeCode}</Text>
          </View>
          <View style={styles.statusChips}>
            {ATT_STATUSES.map((s) => {
              const active = d?.status === s.key;
              return (
                <TouchableOpacity
                  key={s.key}
                  style={[styles.statusChip, active && { backgroundColor: s.bg, borderColor: s.color }]}
                  onPress={() => setDraft(item.id, { status: s.key }, true)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.statusChipText, active && { color: s.color }]}>{s.key}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {d?.status ? (
            <View style={styles.hoursGroup}>
              <TextInput
                style={styles.hoursInput} value={d.hours}
                onChangeText={(t) => setDraft(item.id, { hours: t })}
                keyboardType="decimal-pad" maxLength={5}
              />
              <Text style={styles.hoursLabel}>h</Text>
              <TextInput
                style={styles.hoursInput} value={d.overtime}
                onChangeText={(t) => setDraft(item.id, { overtime: t })}
                keyboardType="decimal-pad" maxLength={5}
              />
              <Text style={styles.hoursLabel}>OT</Text>
            </View>
          ) : (
            <Text style={styles.unmarked}>not marked</Text>
          )}
        </View>
      </View>
    );
  };

  const renderMarkTab = () => (
    <View style={{ flex: 1 }}>
      {/* Date navigator + actions */}
      <View style={styles.toolbar}>
        <View style={styles.dateNav}>
          <TouchableOpacity style={styles.navBtn} onPress={() => setDate(shiftIso(date, -1))} hitSlop={8}>
            <Ionicons name="chevron-back" size={16} color={Colors.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.dateText}>{fmtIso(date)}</Text>
          <TouchableOpacity style={styles.navBtn} onPress={() => setDate(shiftIso(date, 1))} hitSlop={8}>
            <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
          </TouchableOpacity>
          {date !== isoToday() && (
            <TouchableOpacity style={styles.todayBtn} onPress={() => setDate(isoToday())}>
              <Text style={styles.todayText}>Today</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.allPresentBtn} onPress={markAllPresent} activeOpacity={0.75}>
          <Ionicons name="checkmark-done-outline" size={14} color={Colors.success} />
          <Text style={styles.allPresentText}>All Present</Text>
        </TouchableOpacity>
      </View>

      {dayLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.accent} /></View>
      ) : (
        <FlatList
          data={roster}
          keyExtractor={(e) => String(e.id)}
          renderItem={renderMarkRow}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="people-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No active employees</Text>
            </View>
          }
        />
      )}

      {/* Save bar */}
      <View style={styles.saveBar}>
        <Text style={[styles.saveMsg, saveMsg === 'Saved.' && { color: Colors.success }]}>
          {saveMsg || (changedRows.length > 0 ? `${changedRows.length} unsaved change${changedRows.length === 1 ? '' : 's'}` : `${Object.keys(drafts).length}/${roster.length} marked`)}
        </Text>
        <TouchableOpacity
          style={[styles.saveBtn, (changedRows.length === 0 || saving) && { opacity: 0.5 }]}
          onPress={handleSave}
          disabled={changedRows.length === 0 || saving}
          activeOpacity={0.8}
        >
          {saving ? <ActivityIndicator size="small" color="#111" /> : (
            <>
              <Ionicons name="checkmark" size={16} color="#111" />
              <Text style={styles.saveBtnText}>Save Attendance</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderRecordItem = ({ item }: { item: AttendanceRecord }) => {
    const st = STATUS_LABELS[item.attendanceStatus] ?? STATUS_LABELS.P;
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.75}
        onPress={() => setEditRecord({
          id: item.id, date: item.date, attendanceStatus: item.attendanceStatus,
          hoursWorked: item.hoursWorked, overtimeHours: item.overtimeHours,
          notes: item.notes, employeeName: item.employee.name,
        })}
      >
        <View style={styles.cardTop}>
          <Text style={styles.empName}>{item.employee.name}</Text>
          <View style={[styles.badge, { backgroundColor: st.bg }]}>
            <Text style={[styles.badgeText, { color: st.text }]}>{st.label}</Text>
          </View>
        </View>
        <Text style={styles.empCode}>{item.employee.employeeCode}</Text>
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={12} color={Colors.textMuted} />
            <Text style={styles.metaText}>{fmtDate(item.date)}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={12} color={Colors.textMuted} />
            <Text style={styles.metaText}>{item.hoursWorked}h</Text>
          </View>
          {parseFloat(item.overtimeHours) > 0 && (
            <View style={styles.metaItem}>
              <Ionicons name="add-circle-outline" size={12} color={Colors.accent} />
              <Text style={[styles.metaText, { color: Colors.accent }]}>OT {item.overtimeHours}h</Text>
            </View>
          )}
          {!!item.notes && (
            <View style={styles.metaItem}>
              <Ionicons name="chatbox-outline" size={12} color={Colors.textMuted} />
              <Text style={styles.metaText} numberOfLines={1}>{item.notes}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderRecordsTab = () => (
    <View style={{ flex: 1 }}>
      <View style={styles.toolbar}>
        <Text style={styles.headerCount}>{total} records — tap to edit</Text>
      </View>
      {recordsLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.accent} /></View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderRecordItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadRecords(true); }} tintColor={Colors.accent} />}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="calendar-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No attendance records</Text>
            </View>
          }
        />
      )}
    </View>
  );

  const openEmployee = (row: AttendanceMonthSummaryRow) => {
    router.push(`/(app)/hr/employee-attendance?employeeId=${row.employee.id}&name=${encodeURIComponent(row.employee.name)}` as any);
  };

  const renderSummaryTab = () => (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.listContent}>
      <View style={[styles.toolbar, { paddingHorizontal: 0 }]}>
        <View style={styles.dateNav}>
          <TouchableOpacity style={styles.navBtn} onPress={() => setMonth(shiftMonth(month, -1))} hitSlop={8}>
            <Ionicons name="chevron-back" size={16} color={Colors.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.dateText}>{fmtMonth(month)}</Text>
          <TouchableOpacity style={styles.navBtn} onPress={() => setMonth(shiftMonth(month, 1))} hitSlop={8}>
            <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerCount}>tap a row for calendar & yearly view</Text>
      </View>

      {summaryLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.accent} /></View>
      ) : isWeb ? (
        <View style={styles.table}>
          <View style={[styles.tr, styles.thRow]}>
            <Text style={[styles.th, { flex: 2.2, textAlign: 'left' }]}>Employee</Text>
            <Text style={styles.th}>P</Text>
            <Text style={styles.th}>A</Text>
            <Text style={styles.th}>H</Text>
            <Text style={styles.th}>L</Text>
            <Text style={styles.th}>Days</Text>
            <Text style={styles.th}>Hours</Text>
            <Text style={styles.th}>OT</Text>
          </View>
          {summaryRows.map((r) => (
            <TouchableOpacity key={r.employee.id} style={styles.tr} onPress={() => openEmployee(r)} activeOpacity={0.7}>
              <View style={{ flex: 2.2 }}>
                <Text style={styles.tdName}>{r.employee.name}</Text>
                <Text style={styles.empCode}>{r.employee.employeeCode}</Text>
              </View>
              <Text style={[styles.td, { color: Colors.success }]}>{r.counts.P}</Text>
              <Text style={[styles.td, { color: Colors.error }]}>{r.counts.A}</Text>
              <Text style={[styles.td, { color: '#7A5400' }]}>{r.counts.H}</Text>
              <Text style={[styles.td, { color: Colors.info }]}>{r.counts.L}</Text>
              <Text style={styles.td}>{r.markedDays}</Text>
              <Text style={styles.td}>{r.totalHours}</Text>
              <Text style={styles.td}>{r.totalOvertime}</Text>
            </TouchableOpacity>
          ))}
          {summaryRows.length === 0 && <Text style={styles.emptyText}>No active employees</Text>}
        </View>
      ) : (
        <View style={{ gap: 8 }}>
          {summaryRows.map((r) => (
            <TouchableOpacity key={r.employee.id} style={styles.card} onPress={() => openEmployee(r)} activeOpacity={0.75}>
              <View style={styles.cardTop}>
                <Text style={styles.empName}>{r.employee.name}</Text>
                <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
              </View>
              <Text style={styles.empCode}>{r.employee.employeeCode}</Text>
              <View style={styles.metaRow}>
                {(['P', 'A', 'H', 'L'] as const).map((k) => (
                  <View key={k} style={[styles.badge, { backgroundColor: STATUS_LABELS[k].bg }]}>
                    <Text style={[styles.badgeText, { color: STATUS_LABELS[k].text }]}>{k} {r.counts[k]}</Text>
                  </View>
                ))}
                <Text style={styles.metaText}>{r.totalHours}h{r.totalOvertime > 0 ? ` +${r.totalOvertime} OT` : ''}</Text>
              </View>
            </TouchableOpacity>
          ))}
          {summaryRows.length === 0 && (
            <View style={styles.center}><Text style={styles.emptyText}>No active employees</Text></View>
          )}
        </View>
      )}
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={isWeb ? styles.webWrap : { flex: 1 }}>
        {renderSegments()}
        {segment === 'mark' && renderMarkTab()}
        {segment === 'records' && renderRecordsTab()}
        {segment === 'summary' && renderSummaryTab()}
      </View>

      <AttendanceEditSheet
        visible={!!editRecord}
        onClose={() => setEditRecord(null)}
        onSaved={() => { loadRecords(true); loadDay(date); }}
        record={editRecord}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  webWrap: { flex: 1, width: '100%', maxWidth: 1240, alignSelf: 'center', paddingHorizontal: isWeb ? 32 : 0 },

  segmentRow: {
    flexDirection: 'row', gap: 8,
    paddingHorizontal: isWeb ? 0 : 12, paddingTop: isWeb ? 20 : 12, paddingBottom: 4,
  },
  segment: {
    paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface,
  },
  segmentActive:     { backgroundColor: Colors.accent, borderColor: Colors.accent },
  segmentText:       { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  segmentTextActive: { color: '#111' },

  toolbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    flexWrap: 'wrap', gap: 10,
    paddingHorizontal: isWeb ? 0 : 12, paddingVertical: 12,
  },
  dateNav: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  navBtn: {
    width: 30, height: 30, borderRadius: 6, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center',
  },
  dateText: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, minWidth: 150, textAlign: 'center' },
  todayBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, backgroundColor: Colors.accentLight },
  todayText: { fontSize: 12, fontWeight: '700', color: '#7A5400' },
  allPresentBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6,
    borderWidth: 1, borderColor: Colors.success + '50', backgroundColor: Colors.successLight,
  },
  allPresentText: { fontSize: 12, fontWeight: '700', color: Colors.success },

  listContent: { paddingHorizontal: isWeb ? 0 : 12, paddingBottom: 24 },

  markRow: {
    backgroundColor: Colors.surface, borderRadius: 8, borderWidth: 1,
    borderColor: Colors.border, paddingHorizontal: 14, paddingVertical: 10,
  },
  markRowTop: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  statusChips: { flexDirection: 'row', gap: 6 },
  statusChip: {
    width: 34, height: 34, borderRadius: 8, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center',
  },
  statusChipText: { fontSize: 13, fontWeight: '800', color: Colors.textMuted },
  hoursGroup: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  hoursInput: {
    width: 48, height: 34, borderWidth: 1, borderColor: Colors.border, borderRadius: 6,
    backgroundColor: Colors.background, textAlign: 'center', fontSize: 13, color: Colors.textPrimary,
    ...Platform.select({ web: { outlineStyle: 'none' } }),
  },
  hoursLabel: { fontSize: 11, color: Colors.textMuted, marginRight: 4 },
  unmarked: { fontSize: 11, color: Colors.textMuted, fontStyle: 'italic' },

  saveBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12,
    paddingHorizontal: isWeb ? 0 : 12, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.background,
  },
  saveMsg: { fontSize: 12, color: Colors.textSecondary, flex: 1 },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.accent, paddingHorizontal: 20, paddingVertical: 11, borderRadius: 8,
  },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: '#111' },

  card: {
    backgroundColor: Colors.surface, borderRadius: 8, borderWidth: 1,
    borderColor: Colors.border, padding: 14,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  empName: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, flexShrink: 1 },
  empCode: { fontSize: 11, color: Colors.accent, fontWeight: '600' },
  badge:   { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6, alignItems: 'center' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11, color: Colors.textMuted },

  headerCount: { fontSize: 12, color: Colors.textMuted },
  center:  { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { color: Colors.textSecondary, fontSize: 14, textAlign: 'center', paddingVertical: 12 },

  // Summary table (web)
  table: { backgroundColor: Colors.surface, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  tr: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  thRow: { backgroundColor: Colors.surfaceAlt },
  th: { flex: 1, fontSize: 11, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4, textAlign: 'center' },
  td: { flex: 1, fontSize: 13, fontWeight: '600', color: Colors.textPrimary, textAlign: 'center' },
  tdName: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
});
