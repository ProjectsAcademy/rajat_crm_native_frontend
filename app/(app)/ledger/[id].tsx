import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity,
  RefreshControl, useWindowDimensions, Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ledgerApi, CustomerLedgerResponse, LedgerLine, LedgerEntryType } from '../../../services/api';
import { Colors } from '../../../constants/colors';
import ReceiptFormSheet from '../../../components/ReceiptFormSheet';
import LedgerEntrySheet, { EditableEntry } from '../../../components/LedgerEntrySheet';
import DatePickerModal from '../../../components/DatePickerModal';
import { fmtDay, fmtDrCr, fmtMoney, fyRange, periodLabel } from '../../../utils/ledgerFormat';
import { buildLedgerHtml } from '../../../utils/ledgerHtml';
import { printOrShareHtml, previewHtml } from '../../../utils/printHtml';
import { confirmAsync, notify } from '../../../utils/dialogs';

type PeriodKey = 'fy' | 'lastfy' | 'all' | 'custom';

const AGE_COLORS = { d0_30: Colors.success, d31_60: '#F9A825', d61_90: '#EF6C00', d90_plus: Colors.error };

export default function CustomerLedgerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const customerId = parseInt(id!, 10);
  const { width } = useWindowDimensions();
  const wide = width >= 760;

  const [period, setPeriod] = useState<PeriodKey>('fy');
  const [custom, setCustom] = useState<{ from: string | null; to: string | null }>({ from: null, to: null });
  const [pickerFor, setPickerFor] = useState<'from' | 'to' | null>(null);

  const [data, setData]       = useState<CustomerLedgerResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]     = useState('');
  const [busy, setBusy]       = useState<'print' | 'preview' | null>(null);

  const [showReceipt, setShowReceipt] = useState(false);
  const [entrySheet, setEntrySheet] = useState<{ mode: 'entry' | 'opening'; entry?: EditableEntry | null } | null>(null);

  const range = useMemo(() => {
    if (period === 'fy') return fyRange();
    if (period === 'lastfy') return fyRange(undefined, -1);
    if (period === 'custom') return { ...custom, label: 'Custom' };
    return { from: null, to: null, label: 'All' };
  }, [period, custom]);

  const load = useCallback(async () => {
    try {
      const { data: d } = await ledgerApi.customer(customerId, {
        from: range.from ?? undefined, to: range.to ?? undefined,
      });
      setData(d);
      setError('');
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Could not load the ledger.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [customerId, range.from, range.to]);

  useEffect(() => { load(); }, [load]);

  const openLine = async (l: LedgerLine) => {
    if ((l.type === 'order' || l.type === 'payment') && l.orderId) {
      router.push(`/(app)/orders/${l.orderId}` as any);
    } else if (l.type === 'adjustment' && l.refId && l.entryType) {
      setEntrySheet({
        mode: 'entry',
        entry: { id: l.refId, entryType: l.entryType as LedgerEntryType, date: l.date ?? '', amount: l.debit || l.credit, notes: l.detail },
      });
    } else if (l.type === 'opening') {
      setEntrySheet({ mode: 'opening' });
    } else if (l.type === 'receipt' && l.refId) {
      const ok = await confirmAsync(
        `Delete ${l.refNo}?`,
        `${fmtMoney(l.credit)} will be removed from this ledger, and the payments it made on orders will be taken back (those orders become unpaid again).`,
        'Delete receipt', true,
      );
      if (!ok) return;
      try {
        await ledgerApi.deleteReceipt(l.refId);
        load();
      } catch (e: any) {
        notify('Could not delete', e?.response?.data?.error ?? 'Please try again.');
      }
    }
  };

  const runHtml = async (kind: 'print' | 'preview') => {
    if (!data) return;
    setBusy(kind);
    try {
      const html = buildLedgerHtml(data);
      if (kind === 'print') await printOrShareHtml(html, `${data.customer.customerName} - Statement`);
      else await previewHtml(html);
    } catch (e: any) {
      notify('Statement', e?.message ?? 'Could not create the statement.');
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={Colors.accent} /></View>;
  if (error && !data) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={40} color={Colors.textMuted} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={() => { setLoading(true); load(); }} style={styles.retryBtn}><Text style={styles.retryText}>Retry</Text></TouchableOpacity>
      </View>
    );
  }
  if (!data) return null;

  const { customer, statement, position } = data;
  const bal = position.balance;
  const balLabel = bal > 0.005 ? 'Balance Due' : bal < -0.005 ? 'Advance' : 'Settled';
  const balColor = bal > 0.005 ? Colors.accent : bal < -0.005 ? '#7FD1FF' : '#9BE3C6';
  const age = position.ageing;
  const ageTotal = age.d0_30 + age.d31_60 + age.d61_90 + age.d90_plus;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.accent} />}
      >
        <View style={[styles.page, wide && styles.pageWide]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.custName}>{customer.customerName}</Text>
                <Text style={styles.custMeta} numberOfLines={1}>
                  {[customer.businessName, customer.customerCode, customer.phone].filter(Boolean).join('  ·  ')}
                </Text>
              </View>
              <TouchableOpacity onPress={() => router.push(`/(app)/customers/${customer.id}` as any)} hitSlop={8} style={styles.profileBtn}>
                <Ionicons name="person-circle-outline" size={16} color="rgba(255,255,255,0.8)" />
                <Text style={styles.profileText}>Profile</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.balLabel}>{balLabel}</Text>
            <Text style={[styles.balValue, { color: balColor }]}>{fmtMoney(bal)}</Text>

            <View style={styles.actions}>
              <ActionBtn icon="wallet-outline" label="Receive Payment" primary busy={busy} onPress={() => setShowReceipt(true)} />
              <ActionBtn icon="create-outline" label="Adjustment" busy={busy} onPress={() => setEntrySheet({ mode: 'entry', entry: null })} />
              <ActionBtn icon="flag-outline" label="Opening Balance" busy={busy} onPress={() => setEntrySheet({ mode: 'opening' })} />
              <ActionBtn icon={Platform.OS === 'web' ? 'print-outline' : 'share-social-outline'} label={Platform.OS === 'web' ? 'Print' : 'Share PDF'} busy={busy} loadingKey="print" onPress={() => runHtml('print')} />
              <ActionBtn icon="eye-outline" label="Preview" busy={busy} loadingKey="preview" onPress={() => runHtml('preview')} />
            </View>
          </View>

          {/* Totals */}
          <View style={styles.statsRow}>
            <Stat label="Total Billed" value={fmtMoney(position.billed)} />
            <Stat label="Total Received" value={fmtMoney(position.received)} color={Colors.success} border />
            <Stat
              label={position.advance > 0 ? 'Advance' : 'Outstanding'}
              value={fmtMoney(position.advance > 0 ? position.advance : position.outstanding)}
              color={position.advance > 0 ? Colors.info : position.outstanding > 0 ? Colors.error : Colors.textPrimary}
            />
          </View>

          {/* Ageing */}
          {position.outstanding > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Outstanding by Age</Text>
              <View style={styles.card}>
                <View style={styles.ageBar}>
                  {(Object.keys(AGE_COLORS) as (keyof typeof AGE_COLORS)[]).map((k) =>
                    age[k] > 0 ? <View key={k} style={{ flex: age[k] / ageTotal, backgroundColor: AGE_COLORS[k] }} /> : null,
                  )}
                </View>
                <View style={styles.ageGrid}>
                  <AgeCell label="0–30 days" value={age.d0_30} color={AGE_COLORS.d0_30} />
                  <AgeCell label="31–60 days" value={age.d31_60} color={AGE_COLORS.d31_60} />
                  <AgeCell label="61–90 days" value={age.d61_90} color={AGE_COLORS.d61_90} />
                  <AgeCell label="90+ days" value={age.d90_plus} color={AGE_COLORS.d90_plus} />
                </View>
                <Text style={styles.ageFoot}>
                  {position.oldestDueDate ? `Oldest unpaid since ${fmtDay(position.oldestDueDate)}` : ''}
                  {position.oldestDueDate && position.lastReceiptDate ? '   ·   ' : ''}
                  {position.lastReceiptDate ? `Last payment ${fmtDay(position.lastReceiptDate)}` : 'No payment received yet'}
                </Text>
              </View>
            </View>
          )}

          {/* Period */}
          <View style={styles.section}>
            <View style={styles.pills}>
              {([['fy', fyRange().label], ['lastfy', fyRange(undefined, -1).label], ['all', 'All'], ['custom', 'Custom']] as [PeriodKey, string][]).map(([k, label]) => (
                <TouchableOpacity key={k} style={[styles.pill, period === k && styles.pillActive]} onPress={() => setPeriod(k)}>
                  <Text style={[styles.pillText, period === k && styles.pillTextActive]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {period === 'custom' && (
              <View style={styles.customRow}>
                <TouchableOpacity style={styles.dateBtn} onPress={() => setPickerFor('from')}>
                  <Ionicons name="calendar-outline" size={14} color={Colors.textMuted} />
                  <Text style={styles.dateBtnText}>{custom.from ? fmtDay(custom.from) : 'From: beginning'}</Text>
                </TouchableOpacity>
                <Text style={styles.dateSep}>to</Text>
                <TouchableOpacity style={styles.dateBtn} onPress={() => setPickerFor('to')}>
                  <Ionicons name="calendar-outline" size={14} color={Colors.textMuted} />
                  <Text style={styles.dateBtnText}>{custom.to ? fmtDay(custom.to) : 'To: latest'}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Statement */}
          <View style={styles.section}>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Statement</Text>
              <Text style={styles.sectionHint}>{periodLabel(statement.from, statement.to)}</Text>
            </View>
            {error ? <Text style={styles.inlineError}>{error}</Text> : null}
            <View style={styles.card}>
              {wide && (
                <View style={[styles.tRow, styles.tHead]}>
                  <Text style={[styles.th, styles.cDate]}>Date</Text>
                  <Text style={[styles.th, styles.cPart]}>Particulars</Text>
                  <Text style={[styles.th, styles.cAmt]}>Debit</Text>
                  <Text style={[styles.th, styles.cAmt]}>Credit</Text>
                  <Text style={[styles.th, styles.cBal]}>Balance</Text>
                  <View style={styles.cIcon} />
                </View>
              )}

              {statement.from && (
                <SummaryLine wide={wide} date={fmtDay(statement.from)} label="Opening Balance (b/f)" balance={statement.openingBalance} />
              )}

              {statement.lines.length === 0 ? (
                <Text style={styles.emptyText}>No transactions in this period.</Text>
              ) : statement.lines.map((l) => (
                <LineRow key={l.key} line={l} wide={wide} onPress={() => openLine(l)} />
              ))}

              <View style={[styles.tRow, styles.totalRow]}>
                {wide ? (
                  <>
                    <Text style={[styles.td, styles.cDate]} />
                    <Text style={[styles.td, styles.cPart, styles.bold]}>Total</Text>
                    <Text style={[styles.td, styles.cAmt, styles.bold]}>{fmtMoney(statement.totals.debit)}</Text>
                    <Text style={[styles.td, styles.cAmt, styles.bold]}>{fmtMoney(statement.totals.credit)}</Text>
                    <Text style={[styles.td, styles.cBal]} />
                    <View style={styles.cIcon} />
                  </>
                ) : (
                  <Text style={[styles.td, { flex: 1 }]}>
                    <Text style={styles.bold}>Total  </Text>Dr {fmtMoney(statement.totals.debit)}  ·  Cr {fmtMoney(statement.totals.credit)}
                  </Text>
                )}
              </View>
              <SummaryLine wide={wide} label="Closing Balance" balance={statement.closingBalance} strong />
            </View>
            <Text style={styles.legend}>
              Tap an order or payment to open the order · tap an adjustment to edit it · tap a receipt to delete it
            </Text>
          </View>
        </View>
      </ScrollView>

      <ReceiptFormSheet
        visible={showReceipt}
        customerId={customerId}
        customerName={customer.customerName}
        onClose={() => setShowReceipt(false)}
        onSaved={load}
      />
      <LedgerEntrySheet
        visible={!!entrySheet}
        customerId={customerId}
        customerName={customer.customerName}
        mode={entrySheet?.mode ?? 'entry'}
        entry={entrySheet?.entry ?? null}
        opening={{ amount: customer.openingBalance, date: customer.openingBalanceDate }}
        onClose={() => setEntrySheet(null)}
        onSaved={load}
      />
      <DatePickerModal
        visible={pickerFor !== null}
        title={pickerFor === 'from' ? 'From date' : 'To date'}
        value={pickerFor === 'from' ? custom.from : custom.to}
        allowClear
        onSelect={(iso) => {
          if (pickerFor) setCustom((c) => ({ ...c, [pickerFor]: iso }));
          setPickerFor(null);
        }}
        onClose={() => setPickerFor(null)}
      />
    </SafeAreaView>
  );
}

function ActionBtn({ icon, label, onPress, primary, busy, loadingKey }: {
  icon: React.ComponentProps<typeof Ionicons>['name']; label: string; onPress: () => void;
  primary?: boolean; busy: 'print' | 'preview' | null; loadingKey?: 'print' | 'preview';
}) {
  return (
    <TouchableOpacity style={[styles.actionBtn, primary && styles.actionBtnPrimary]} onPress={onPress} disabled={!!busy} activeOpacity={0.8}>
      {loadingKey && busy === loadingKey
        ? <ActivityIndicator size="small" color={primary ? '#111' : Colors.accent} />
        : <Ionicons name={icon} size={15} color={primary ? '#111' : Colors.accent} />}
      <Text style={[styles.actionText, primary && styles.actionTextPrimary]}>{label}</Text>
    </TouchableOpacity>
  );
}

function Stat({ label, value, color, border }: { label: string; value: string; color?: string; border?: boolean }) {
  return (
    <View style={[styles.statBox, border && styles.statBorder]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, color ? { color } : null]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
    </View>
  );
}

function AgeCell({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.ageCell}>
      <View style={styles.ageLabelRow}>
        <View style={[styles.ageDot, { backgroundColor: color }]} />
        <Text style={styles.ageLabel}>{label}</Text>
      </View>
      <Text style={[styles.ageValue, value > 0 && color === Colors.error ? { color } : null]}>{fmtMoney(value)}</Text>
    </View>
  );
}

function SummaryLine({ wide, date, label, balance, strong }: { wide: boolean; date?: string; label: string; balance: number; strong?: boolean }) {
  return (
    <View style={[styles.tRow, strong ? styles.closingRow : styles.bfRow]}>
      {wide ? (
        <>
          <Text style={[styles.td, styles.cDate]}>{date ?? ''}</Text>
          <Text style={[styles.td, styles.cPart, styles.bold]}>{label}</Text>
          <Text style={[styles.td, styles.cAmt]} />
          <Text style={[styles.td, styles.cAmt]} />
          <Text style={[styles.td, styles.cBal, styles.bold]}>{fmtDrCr(balance)}</Text>
          <View style={styles.cIcon} />
        </>
      ) : (
        <>
          <Text style={[styles.td, { flex: 1 }, styles.bold]}>{label}</Text>
          <Text style={[styles.td, styles.bold, strong && { fontSize: 15 }]}>{fmtDrCr(balance)}</Text>
        </>
      )}
    </View>
  );
}

const LINE_ICONS: Record<string, any> = {
  order: 'receipt-outline', payment: 'cash-outline', receipt: 'wallet-outline', adjustment: 'create-outline', opening: 'flag-outline',
};

function LineRow({ line: l, wide, onPress }: { line: LedgerLine; wide: boolean; onPress: () => void }) {
  const trailing = l.type === 'receipt' ? 'trash-outline' : l.type === 'adjustment' || l.type === 'opening' ? 'pencil-outline' : 'chevron-forward';
  const trailingColor = l.type === 'receipt' ? Colors.error : Colors.textMuted;
  if (wide) {
    return (
      <TouchableOpacity style={[styles.tRow, styles.lineRow]} onPress={onPress} activeOpacity={0.7}>
        <Text style={[styles.td, styles.cDate]}>{l.date ? fmtDay(l.date) : '—'}</Text>
        <View style={styles.cPart}>
          <Text style={[styles.td, styles.partText]}>{l.particulars}</Text>
          {l.detail ? <Text style={styles.detailText}>{l.detail}</Text> : null}
        </View>
        <Text style={[styles.td, styles.cAmt]}>{l.debit ? fmtMoney(l.debit) : ''}</Text>
        <Text style={[styles.td, styles.cAmt, { color: Colors.success }]}>{l.credit ? fmtMoney(l.credit) : ''}</Text>
        <Text style={[styles.td, styles.cBal]}>{fmtDrCr(l.balance)}</Text>
        <View style={styles.cIcon}><Ionicons name={trailing} size={14} color={trailingColor} /></View>
      </TouchableOpacity>
    );
  }
  const isDr = l.debit > 0;
  return (
    <TouchableOpacity style={[styles.tRow, styles.lineRow, styles.mLine]} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.mIcon, { backgroundColor: isDr ? Colors.background : Colors.successLight }]}>
        <Ionicons name={LINE_ICONS[l.type] ?? 'document-outline'} size={15} color={isDr ? Colors.textSecondary : Colors.success} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.mDate}>{l.date ? fmtDay(l.date) : 'Opening'}</Text>
        <Text style={styles.partText}>{l.particulars}</Text>
        {l.detail ? <Text style={styles.detailText} numberOfLines={3}>{l.detail}</Text> : null}
      </View>
      <View style={styles.mRight}>
        <Text style={[styles.mAmt, { color: isDr ? Colors.textPrimary : Colors.success }]}>
          {isDr ? fmtMoney(l.debit) : fmtMoney(l.credit)} {isDr ? 'Dr' : 'Cr'}
        </Text>
        <Text style={styles.mBal}>Bal {fmtDrCr(l.balance)}</Text>
      </View>
      <Ionicons name={trailing} size={14} color={trailingColor} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 40 },
  page:    { width: '100%' },
  pageWide: { maxWidth: 1100, alignSelf: 'center' },
  center:  { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  errorText: { color: Colors.textSecondary, fontSize: 14, textAlign: 'center' },
  retryBtn:  { backgroundColor: Colors.accent, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 4 },
  retryText: { color: '#111', fontWeight: '700' },

  header:    { backgroundColor: Colors.primary, padding: 20 },
  headerTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  custName:  { fontSize: 18, fontWeight: '700', color: '#fff' },
  custMeta:  { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 3 },
  profileBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 },
  profileText: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  balLabel:  { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.6)', marginTop: 16, letterSpacing: 0.6, textTransform: 'uppercase' },
  balValue:  { fontSize: 30, fontWeight: '800', marginTop: 2 },
  actions:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: Colors.accent, backgroundColor: 'rgba(255,153,0,0.15)' },
  actionBtnPrimary: { backgroundColor: Colors.accent },
  actionText: { fontSize: 13, fontWeight: '600', color: Colors.accent },
  actionTextPrimary: { color: '#111', fontWeight: '700' },

  statsRow:   { flexDirection: 'row', backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  statBox:    { flex: 1, paddingVertical: 12, paddingHorizontal: 6, alignItems: 'center' },
  statBorder: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: Colors.border },
  statLabel:  { fontSize: 10, color: Colors.textMuted, marginBottom: 4, fontWeight: '600' },
  statValue:  { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },

  section:      { marginTop: 16, paddingHorizontal: 14 },
  sectionRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  sectionHint:  { fontSize: 12, color: Colors.textMuted, marginBottom: 8 },
  card:         { backgroundColor: Colors.surface, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  inlineError:  { fontSize: 12, color: Colors.error, marginBottom: 6 },

  ageBar:      { flexDirection: 'row', height: 8, margin: 12, marginBottom: 4, borderRadius: 4, overflow: 'hidden', backgroundColor: Colors.background },
  ageGrid:     { flexDirection: 'row', flexWrap: 'wrap' },
  ageCell:     { flexGrow: 1, flexBasis: 120, padding: 12 },
  ageLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  ageDot:      { width: 8, height: 8, borderRadius: 4 },
  ageLabel:    { fontSize: 11, color: Colors.textMuted, fontWeight: '600' },
  ageValue:    { fontSize: 14, fontWeight: '800', color: Colors.textPrimary },
  ageFoot:     { fontSize: 11, color: Colors.textSecondary, paddingHorizontal: 12, paddingBottom: 12 },

  pills:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill:      { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  pillActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  pillText:  { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  pillTextActive: { color: '#111' },
  customRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  dateBtn:   { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  dateBtnText: { fontSize: 13, color: Colors.textPrimary },
  dateSep:   { fontSize: 12, color: Colors.textMuted },

  tRow:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  tHead:    { backgroundColor: Colors.background, borderBottomWidth: 1, borderBottomColor: Colors.border, paddingVertical: 8 },
  th:       { fontSize: 11, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4 },
  td:       { fontSize: 13, color: Colors.textPrimary },
  cDate:    { width: 96 },
  cPart:    { flex: 1 },
  cAmt:     { width: 120, textAlign: 'right' },
  cBal:     { width: 140, textAlign: 'right' },
  cIcon:    { width: 18, alignItems: 'flex-end' },
  lineRow:  { borderTopWidth: 1, borderTopColor: Colors.border, alignItems: 'flex-start' },
  bfRow:    { backgroundColor: Colors.surfaceAlt, borderTopWidth: 1, borderTopColor: Colors.border },
  totalRow: { backgroundColor: Colors.surfaceAlt, borderTopWidth: 1, borderTopColor: Colors.border },
  closingRow: { backgroundColor: Colors.accentLight, borderTopWidth: 2, borderTopColor: Colors.textPrimary },
  bold:     { fontWeight: '800' },
  partText: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  detailText: { fontSize: 11, color: Colors.textSecondary, marginTop: 2, lineHeight: 15 },
  emptyText: { padding: 16, fontSize: 13, color: Colors.textMuted, textAlign: 'center' },
  legend:   { fontSize: 11, color: Colors.textMuted, marginTop: 8, lineHeight: 16 },

  mLine:   { gap: 10 },
  mIcon:   { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  mDate:   { fontSize: 11, color: Colors.textMuted, marginBottom: 1 },
  mRight:  { alignItems: 'flex-end', maxWidth: 150 },
  mAmt:    { fontSize: 13, fontWeight: '800' },
  mBal:    { fontSize: 11, color: Colors.textMuted, marginTop: 3 },
});
