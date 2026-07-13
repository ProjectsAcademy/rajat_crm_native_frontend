import { useFeatureGuard } from '../../../hooks/useFeatureGuard';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, Platform,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { hrApi, PayrollRow, PayrollPayment } from '../../../services/api';
import { Colors } from '../../../constants/colors';
import SalaryPaymentSheet from '../../../components/SalaryPaymentSheet';
import MonthYearPickerModal from '../../../components/MonthYearPickerModal';
import { usePayrollMonth, currentMonth } from '../../../store/payrollMonth';

// Employee-wise monthly payment ledger. Reads the same computation as the
// Payroll tab (salary-components/payroll) so totals always match.

const isWeb = Platform.OS === 'web';

const METHOD_LABELS: Record<string, string> = {
  bank_transfer: 'Bank',
  cash: 'Cash',
  cheque: 'Cheque',
  upi: 'UPI',
  other: 'Other',
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtMoney(v: number | string) {
  return `₹${parseFloat(String(v)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}
function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}
function fmtMonthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

const STATUS_BADGES: Record<PayrollRow['status'], { label: string; bg: string; text: string }> = {
  paid:    { label: 'Fully Paid',     bg: Colors.successLight, text: Colors.success },
  partial: { label: 'Partially Paid', bg: Colors.warningLight, text: '#7A5400' },
  unpaid:  { label: 'Unpaid',         bg: Colors.errorLight,   text: Colors.error },
};

export default function SalaryPaymentsScreen() {
  useFeatureGuard('hr.salary-payments');
  const month = usePayrollMonth((s) => s.month);          // shared with the Payroll page
  const setMonth = usePayrollMonth((s) => s.setMonth);
  const isCurrentMonth = month === currentMonth();
  const isPastMonth = month < currentMonth();
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [rows, setRows] = useState<PayrollRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editTarget, setEditTarget] = useState<{ row: PayrollRow; payment: PayrollPayment } | null>(null);

  const load = useCallback(async (m: string, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await hrApi.salaryPayments.byEmployee(m);
      setRows(data.rows);
    } catch { setRows([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(month); }, [month, load]);

  // Past months: hide employees without any data instead of "₹0 of ₹0 · Unpaid"
  const visibleRows = isPastMonth
    ? rows.filter((r) => r.net > 0 || r.paidTotal > 0 || r.payableDays > 0)
    : rows;
  const monthNet = visibleRows.reduce((acc, r) => acc + r.net, 0);
  const monthCollected = visibleRows.reduce((acc, r) => acc + r.paidTotal, 0);
  const fullyPaid = visibleRows.filter((r) => r.status === 'paid').length;
  const partiallyPaid = visibleRows.filter((r) => r.status === 'partial').length;
  const hasMonthData = monthNet > 0 || monthCollected > 0;
  const summaryLine = hasMonthData
    ? `${fullyPaid} fully paid · ${partiallyPaid} partially paid · ${fmtMoney(monthCollected)} of ${fmtMoney(monthNet)} collected`
    : 'No data';

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={isWeb ? styles.webWrap : { flex: 1 }}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.listContent}>
          {/* Month selector + summary */}
          <View style={styles.toolbar}>
            <View style={styles.nav}>
              <TouchableOpacity style={styles.navBtn} onPress={() => setMonth(shiftMonth(month, -1))} hitSlop={8}>
                <Ionicons name="chevron-back" size={16} color={Colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.monthLabelBtn} onPress={() => setShowMonthPicker(true)} activeOpacity={0.7}>
                <Text style={styles.navText}>{fmtMonthLabel(month)}</Text>
                <Ionicons name="caret-down" size={11} color={Colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.navBtn, isCurrentMonth && styles.navBtnDisabled]}
                onPress={() => setMonth(shiftMonth(month, 1))}
                disabled={isCurrentMonth}
                hitSlop={8}
              >
                <Ionicons name="chevron-forward" size={16} color={isCurrentMonth ? Colors.border : Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.headerCount}>{summaryLine}</Text>
          </View>

          {loading ? (
            <View style={styles.center}><ActivityIndicator size="large" color={Colors.accent} /></View>
          ) : visibleRows.length === 0 ? (
            <View style={styles.center}>
              <Ionicons name="folder-open-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>
                {isPastMonth ? `No payroll data for ${fmtMonthLabel(month)}` : 'No active employees'}
              </Text>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              {visibleRows.map((r) => {
                const badge = STATUS_BADGES[r.status];
                const expanded = expandedId === r.employee.id;
                return (
                  <View key={r.employee.id} style={styles.card}>
                    {/* Employee summary row (accordion header) */}
                    <TouchableOpacity
                      style={styles.cardHeader}
                      onPress={() => setExpandedId(expanded ? null : r.employee.id)}
                      activeOpacity={0.75}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.empName}>{r.employee.name}</Text>
                        <Text style={styles.empCode}>{r.employee.employeeCode}</Text>
                      </View>
                      <View style={styles.headerRight}>
                        <Text style={styles.paidOf}>
                          {fmtMoney(r.paidTotal)} <Text style={styles.paidOfMuted}>of {fmtMoney(r.net)}</Text>
                        </Text>
                        <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                          <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
                        </View>
                      </View>
                      <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.textMuted} />
                    </TouchableOpacity>

                    {/* Installment history */}
                    {expanded && (
                      <View style={styles.history}>
                        {r.payments.length === 0 ? (
                          <Text style={styles.historyEmpty}>No payments recorded this month.</Text>
                        ) : (
                          r.payments.map((p) => (
                            <TouchableOpacity
                              key={p.id}
                              style={styles.payRow}
                              onPress={() => setEditTarget({ row: r, payment: p })}
                              activeOpacity={0.7}
                            >
                              <View style={styles.payIcon}>
                                <Ionicons name="cash-outline" size={14} color={Colors.success} />
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.payAmount}>{fmtMoney(p.amount)}</Text>
                                <Text style={styles.payMeta}>
                                  {fmtDate(p.paymentDate)} · {METHOD_LABELS[p.paymentMethod] ?? p.paymentMethod}
                                  {p.referenceNumber ? ` · ref ${p.referenceNumber}` : ''}
                                  {p.notes ? ` · ${p.notes}` : ''}
                                </Text>
                              </View>
                              <Ionicons name="pencil-outline" size={14} color={Colors.textMuted} />
                            </TouchableOpacity>
                          ))
                        )}
                        {r.remaining > 0 && (
                          <Text style={styles.remainingLine}>Remaining: {fmtMoney(r.remaining)}</Text>
                        )}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      </View>

      {/* Edit installment (amount/date/mode/ref/notes + delete) */}
      <SalaryPaymentSheet
        visible={!!editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={() => load(month, true)}
        month={month}
        row={editTarget?.row ?? null}
        payment={editTarget?.payment ?? null}
      />
      <MonthYearPickerModal
        visible={showMonthPicker}
        value={month}
        maxMonth={currentMonth()}
        onSelect={(m) => { setMonth(m); setShowMonthPicker(false); }}
        onClose={() => setShowMonthPicker(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  webWrap: { flex: 1, width: '100%', maxWidth: 1240, alignSelf: 'center', paddingHorizontal: isWeb ? 32 : 0 },

  listContent: { paddingHorizontal: isWeb ? 0 : 12, paddingBottom: 32, paddingTop: isWeb ? 8 : 8 },

  toolbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    flexWrap: 'wrap', gap: 10, paddingVertical: 12,
  },
  nav: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  navBtn: {
    width: 30, height: 30, borderRadius: 6, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center',
  },
  navText: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, minWidth: 130, textAlign: 'center' },
  navBtnDisabled: { opacity: 0.5 },
  monthLabelBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 4 },
  headerCount: { fontSize: 12, color: Colors.textMuted },

  card: {
    backgroundColor: Colors.surface, borderRadius: 8, borderWidth: 1,
    borderColor: Colors.border, overflow: 'hidden',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  empName: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  empCode: { fontSize: 11, color: Colors.accent, fontWeight: '600', marginTop: 1 },
  headerRight: { alignItems: 'flex-end', gap: 4 },
  paidOf: { fontSize: 14, fontWeight: '800', color: Colors.textPrimary },
  paidOfMuted: { fontSize: 12, fontWeight: '600', color: Colors.textMuted },
  badge:   { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  badgeText: { fontSize: 10, fontWeight: '700' },

  history: {
    borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: 14, paddingVertical: 8, gap: 2,
  },
  historyEmpty: { fontSize: 12, color: Colors.textMuted, paddingVertical: 8, fontStyle: 'italic' },
  payRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  payIcon: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.successLight,
    justifyContent: 'center', alignItems: 'center',
  },
  payAmount: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  payMeta: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  remainingLine: { fontSize: 12, fontWeight: '700', color: '#7A5400', paddingVertical: 8 },

  center:  { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { color: Colors.textSecondary, fontSize: 14 },
});
