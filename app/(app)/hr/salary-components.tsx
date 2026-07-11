import { useFeatureGuard } from '../../../hooks/useFeatureGuard';
import {
  View, Text, FlatList, ScrollView, StyleSheet, ActivityIndicator,
  RefreshControl, TouchableOpacity, Platform,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { hrApi, SalaryComponent, PayrollRow } from '../../../services/api';
import { Colors } from '../../../constants/colors';
import SalaryComponentFormSheet from '../../../components/SalaryComponentFormSheet';
import SalaryPaymentSheet from '../../../components/SalaryPaymentSheet';

const isWeb = Platform.OS === 'web';

const TYPE_STYLES: Record<string, { bg: string; text: string }> = {
  base:      { bg: Colors.infoLight,    text: Colors.info },
  allowance: { bg: Colors.successLight, text: Colors.success },
  deduction: { bg: Colors.errorLight,   text: Colors.error },
  bonus:     { bg: Colors.warningLight, text: '#7A5400' },
  overtime:  { bg: '#EDE9FE',           text: '#5B21B6' },
};

function fmtMoney(v: number | string) {
  return `₹${parseFloat(String(v)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
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

export default function SalaryComponentsScreen() {
  useFeatureGuard('hr.salary-components');
  const [segment, setSegment] = useState<'payroll' | 'components'>('payroll');

  // ── Payroll state ──
  const [month, setMonth] = useState(currentMonth());
  const [rows, setRows] = useState<PayrollRow[]>([]);
  const [payrollLoading, setPayrollLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [payRow, setPayRow] = useState<PayrollRow | null>(null);

  // ── Components state ──
  const [components, setComponents] = useState<SalaryComponent[]>([]);
  const [componentsLoading, setComponentsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editComponent, setEditComponent] = useState<SalaryComponent | null>(null);

  const loadPayroll = useCallback(async (m: string, silent = false) => {
    if (!silent) setPayrollLoading(true);
    try {
      const { data } = await hrApi.salaryComponents.payroll(m);
      setRows(data.rows);
    } catch { setRows([]); }
    finally { setPayrollLoading(false); }
  }, []);

  useEffect(() => { if (segment === 'payroll') loadPayroll(month); }, [segment, month, loadPayroll]);

  const loadComponents = useCallback(async (silent = false) => {
    if (!silent) setComponentsLoading(true);
    try {
      const { data } = await hrApi.salaryComponents.list({ limit: 200 });
      setComponents(data.components);
    } catch { setComponents([]); }
    finally { setComponentsLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { if (segment === 'components') loadComponents(); }, [segment, loadComponents]);

  const monthTotal = rows.reduce((acc, r) => acc + (r.payment ? parseFloat(r.payment.amount) : r.net), 0);
  const paidCount = rows.filter((r) => r.payment).length;

  // ─────────────────────────────────────────────────────────────────────────────

  const renderSegments = () => (
    <View style={styles.segmentRow}>
      {([['payroll', 'Payroll'], ['components', 'Components']] as const).map(([key, label]) => (
        <TouchableOpacity
          key={key}
          style={[styles.segment, segment === key && styles.segmentActive]}
          onPress={() => setSegment(key)}
          activeOpacity={0.7}
        >
          <Text style={[styles.segmentText, segment === key && styles.segmentTextActive]}>{label}</Text>
        </TouchableOpacity>
      ))}
      {segment === 'components' && (
        <>
          <View style={{ flex: 1 }} />
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => { setEditComponent(null); setShowForm(true); }}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={15} color="#111" />
            <Text style={styles.addBtnText}>Add Component</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );

  const renderStatus = (r: PayrollRow) => {
    if (r.payment) {
      return (
        <View style={styles.paidBadge}>
          <Ionicons name="checkmark-circle" size={13} color={Colors.success} />
          <Text style={styles.paidText}>Paid {fmtMoney(r.payment.amount)}</Text>
        </View>
      );
    }
    if (parseFloat(r.employee.dailyWage) === 0) {
      return <Text style={styles.noWage}>no wage set</Text>;
    }
    return (
      <TouchableOpacity style={styles.payBtn} onPress={() => setPayRow(r)} activeOpacity={0.8}>
        <Text style={styles.payBtnText}>Record Payment</Text>
      </TouchableOpacity>
    );
  };

  const renderBreakdown = (r: PayrollRow) => (
    <View style={styles.breakdownBox}>
      <Text style={styles.breakdownLine}>
        P {r.counts.P} · H {r.counts.H} · A {r.counts.A} · L {r.counts.L}
        {r.otHours > 0 ? ` · OT ${r.otHours}h (unpaid)` : ''}
      </Text>
      {r.components.length === 0 ? (
        <Text style={styles.breakdownLine}>No salary components</Text>
      ) : (
        r.components.map((c) => (
          <Text key={c.id} style={styles.breakdownLine}>
            {c.componentType === 'deduction' ? '−' : '+'} {fmtMoney(c.amount)} — {c.name}
          </Text>
        ))
      )}
      {r.payment && (
        <Text style={styles.breakdownLine}>
          Paid on {fmtDate(r.payment.paymentDate)} via {r.payment.paymentMethod.replace('_', ' ')}
          {r.payment.referenceNumber ? ` · ref ${r.payment.referenceNumber}` : ''}
        </Text>
      )}
    </View>
  );

  const renderPayrollTab = () => (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.listContent}>
      <View style={styles.toolbar}>
        <View style={styles.nav}>
          <TouchableOpacity style={styles.navBtn} onPress={() => setMonth(shiftMonth(month, -1))} hitSlop={8}>
            <Ionicons name="chevron-back" size={16} color={Colors.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.navText}>{fmtMonthLabel(month)}</Text>
          <TouchableOpacity style={styles.navBtn} onPress={() => setMonth(shiftMonth(month, 1))} hitSlop={8}>
            <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerCount}>
          {paidCount}/{rows.length} paid · month total {fmtMoney(monthTotal)}
        </Text>
      </View>

      {payrollLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.accent} /></View>
      ) : isWeb ? (
        <View style={styles.table}>
          <View style={[styles.tr, styles.thRow]}>
            <Text style={[styles.th, { flex: 2, textAlign: 'left' }]}>Employee</Text>
            <Text style={styles.th}>Days</Text>
            <Text style={styles.th}>Earned</Text>
            <Text style={styles.th}>Allow.</Text>
            <Text style={styles.th}>Deduct.</Text>
            <Text style={styles.th}>Net</Text>
            <Text style={[styles.th, { flex: 1.6 }]}>Status</Text>
          </View>
          {rows.map((r) => (
            <View key={r.employee.id}>
              <TouchableOpacity
                style={styles.tr}
                onPress={() => setExpandedId(expandedId === r.employee.id ? null : r.employee.id)}
                activeOpacity={0.7}
              >
                <View style={{ flex: 2 }}>
                  <Text style={styles.tdName}>{r.employee.name}</Text>
                  <Text style={styles.empCode}>{r.employee.employeeCode} · ₹{parseFloat(r.employee.dailyWage).toLocaleString('en-IN')}/day</Text>
                </View>
                <Text style={styles.td}>{r.payableDays}</Text>
                <Text style={styles.td}>{fmtMoney(r.earned)}</Text>
                <Text style={[styles.td, r.allowances > 0 && { color: Colors.success }]}>{r.allowances > 0 ? `+${fmtMoney(r.allowances)}` : '—'}</Text>
                <Text style={[styles.td, r.deductions > 0 && { color: Colors.error }]}>{r.deductions > 0 ? `−${fmtMoney(r.deductions)}` : '—'}</Text>
                <Text style={[styles.td, styles.tdNet]}>{fmtMoney(r.net)}</Text>
                <View style={{ flex: 1.6, alignItems: 'flex-start' }}>{renderStatus(r)}</View>
              </TouchableOpacity>
              {expandedId === r.employee.id && (
                <View style={styles.expandRow}>{renderBreakdown(r)}</View>
              )}
            </View>
          ))}
          {rows.length === 0 && <Text style={styles.emptyText}>No active employees</Text>}
        </View>
      ) : (
        <View style={{ gap: 8 }}>
          {rows.map((r) => (
            <TouchableOpacity
              key={r.employee.id}
              style={styles.card}
              onPress={() => setExpandedId(expandedId === r.employee.id ? null : r.employee.id)}
              activeOpacity={0.75}
            >
              <View style={styles.cardTop}>
                <Text style={styles.empName}>{r.employee.name}</Text>
                <Text style={styles.netAmount}>{fmtMoney(r.net)}</Text>
              </View>
              <Text style={styles.empCode}>{r.employee.employeeCode} · {r.payableDays} days × ₹{parseFloat(r.employee.dailyWage).toLocaleString('en-IN')}</Text>
              <View style={styles.metaRow}>
                <Text style={styles.metaText}>
                  earned {fmtMoney(r.earned)}
                  {r.allowances > 0 ? ` +${fmtMoney(r.allowances)}` : ''}
                  {r.deductions > 0 ? ` −${fmtMoney(r.deductions)}` : ''}
                </Text>
              </View>
              {expandedId === r.employee.id && renderBreakdown(r)}
              <View style={{ marginTop: 8, alignSelf: 'flex-start' }}>{renderStatus(r)}</View>
            </TouchableOpacity>
          ))}
          {rows.length === 0 && !payrollLoading && (
            <View style={styles.center}><Text style={styles.emptyText}>No active employees</Text></View>
          )}
        </View>
      )}
    </ScrollView>
  );

  const renderComponentItem = ({ item }: { item: SalaryComponent }) => {
    const ts = TYPE_STYLES[item.componentType] ?? TYPE_STYLES.base;
    return (
      <TouchableOpacity
        style={[styles.card, !item.isActive && { opacity: 0.55 }]}
        onPress={() => { setEditComponent(item); setShowForm(true); }}
        activeOpacity={0.75}
      >
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.empName}>{item.employee.name}</Text>
            <Text style={styles.compName}>{item.name}</Text>
          </View>
          <Text style={[styles.amount, { color: item.componentType === 'deduction' ? Colors.error : Colors.success }]}>
            {item.componentType === 'deduction' ? '−' : '+'}{fmtMoney(item.amount)}
          </Text>
        </View>
        <View style={styles.metaRow}>
          <View style={[styles.badge, { backgroundColor: ts.bg }]}>
            <Text style={[styles.badgeText, { color: ts.text }]}>{item.componentType}</Text>
          </View>
          {!item.isActive && (
            <View style={[styles.badge, { backgroundColor: Colors.errorLight }]}>
              <Text style={[styles.badgeText, { color: Colors.error }]}>inactive</Text>
            </View>
          )}
          <Text style={styles.metaText}>
            from {fmtDate(item.effectiveFrom)}{item.effectiveTo ? ` to ${fmtDate(item.effectiveTo)}` : ''}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderComponentsTab = () => (
    componentsLoading ? (
      <View style={styles.center}><ActivityIndicator size="large" color={Colors.accent} /></View>
    ) : (
      <FlatList
        data={components}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderComponentItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadComponents(true); }} tintColor={Colors.accent} />}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={
          <View style={styles.center}>
            <Ionicons name="cash-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No salary components yet.{'\n'}Add allowances or deductions per employee.</Text>
          </View>
        }
      />
    )
  );

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={isWeb ? styles.webWrap : { flex: 1 }}>
        {renderSegments()}
        {segment === 'payroll' ? renderPayrollTab() : renderComponentsTab()}
      </View>

      <SalaryComponentFormSheet
        visible={showForm}
        onClose={() => setShowForm(false)}
        onSaved={() => { loadComponents(true); loadPayroll(month, true); }}
        component={editComponent}
      />
      <SalaryPaymentSheet
        visible={!!payRow}
        onClose={() => setPayRow(null)}
        onSaved={() => loadPayroll(month, true)}
        month={month}
        row={payRow}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  webWrap: { flex: 1, width: '100%', maxWidth: 1240, alignSelf: 'center', paddingHorizontal: isWeb ? 32 : 0 },

  segmentRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: isWeb ? 0 : 12, paddingTop: isWeb ? 20 : 12, paddingBottom: 4,
  },
  segment: {
    paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface,
  },
  segmentActive:     { backgroundColor: Colors.accent, borderColor: Colors.accent },
  segmentText:       { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  segmentTextActive: { color: '#111' },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6, backgroundColor: Colors.accent,
  },
  addBtnText: { fontSize: 13, fontWeight: '700', color: '#111' },

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
  headerCount: { fontSize: 12, color: Colors.textMuted },

  listContent: { paddingHorizontal: isWeb ? 0 : 12, paddingBottom: 32, paddingTop: isWeb ? 0 : 8 },

  // Payroll table (web)
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
  tdNet: { fontWeight: '800' },
  expandRow: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.surfaceAlt },

  breakdownBox: { paddingTop: 8, gap: 3 },
  breakdownLine: { fontSize: 12, color: Colors.textSecondary },

  paidBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.successLight, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 5,
  },
  paidText: { fontSize: 11, fontWeight: '700', color: Colors.success },
  payBtn: {
    backgroundColor: Colors.accent, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 6,
  },
  payBtnText: { fontSize: 12, fontWeight: '700', color: '#111' },
  noWage: { fontSize: 11, color: Colors.textMuted, fontStyle: 'italic' },

  // Cards (mobile payroll + components list)
  card: {
    backgroundColor: Colors.surface, borderRadius: 8, borderWidth: 1,
    borderColor: Colors.border, padding: 14,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  empName: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, flexShrink: 1 },
  empCode: { fontSize: 11, color: Colors.accent, fontWeight: '600', marginTop: 1 },
  compName: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  netAmount: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  amount: { fontSize: 15, fontWeight: '800' },
  badge:   { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  badgeText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6, alignItems: 'center' },
  metaText: { fontSize: 11, color: Colors.textMuted },

  center:  { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { color: Colors.textSecondary, fontSize: 14, textAlign: 'center', paddingVertical: 12 },
});
