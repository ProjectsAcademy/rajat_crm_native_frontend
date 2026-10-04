import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator,
  RefreshControl, Platform, useWindowDimensions,
} from 'react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ledgerApi, ReceivablesResponse, ReceivableRow, LedgerAgeing } from '../../../services/api';
import { Colors } from '../../../constants/colors';
import Breadcrumbs from '../../../components/Breadcrumbs';
import { fmtDay, fmtDrCr, fmtMoney } from '../../../utils/ledgerFormat';

// Receivables — every customer's ledger balance with ageing, biggest first.
// Tapping a customer opens their ledger (app/(app)/ledger/[id].tsx).

const AGE = [
  { key: 'd0_30',    label: '0–30',  color: Colors.success },
  { key: 'd31_60',   label: '31–60', color: '#F9A825' },
  { key: 'd61_90',   label: '61–90', color: '#EF6C00' },
  { key: 'd90_plus', label: '90+',   color: Colors.error },
] as const;

type SortKey = 'due' | 'oldest' | 'name';
const SORTS: [SortKey, string][] = [['due', 'Highest due'], ['oldest', 'Oldest due'], ['name', 'Name']];

export default function ReceivablesScreen() {
  const { width } = useWindowDimensions();
  const wide = width >= 900;

  const [data, setData]       = useState<ReceivablesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]     = useState('');
  const [search, setSearch]   = useState('');
  const [showSettled, setShowSettled] = useState(false);
  const [sort, setSort]       = useState<SortKey>('due');

  const load = useCallback(async () => {
    try {
      const { data: d } = await ledgerApi.receivables({ all: showSettled || undefined });
      setData(d);
      setError('');
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Could not load receivables.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showSettled]);

  useEffect(() => { load(); }, [load]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = (data?.customers ?? []).filter((c) => !q
      || c.customerName.toLowerCase().includes(q)
      || c.businessName.toLowerCase().includes(q)
      || c.customerCode.toLowerCase().includes(q)
      || c.phone.includes(q));
    const sorted = [...list];
    if (sort === 'name') sorted.sort((a, b) => a.customerName.localeCompare(b.customerName));
    else if (sort === 'oldest') sorted.sort((a, b) => (a.oldestDueDate ?? '9999').localeCompare(b.oldestDueDate ?? '9999'));
    return sorted; // 'due' — server order (balance high → low)
  }, [data, search, sort]);

  const totals = data?.totals;
  const dueCount = (data?.customers ?? []).filter((c) => c.outstanding > 0).length;

  const header = (
    <View>
      <Breadcrumbs moduleKey="ledger" />
      {totals && (
        <View style={styles.summary}>
          <View style={styles.summaryTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sumLabel}>Total Outstanding</Text>
              <Text style={styles.sumValue}>{fmtMoney(totals.outstanding)}</Text>
              <Text style={styles.sumSub}>{dueCount} customer{dueCount === 1 ? '' : 's'} owe money · as on {fmtDay(data!.asOf)}</Text>
            </View>
            {totals.advance > 0 && (
              <View style={styles.advBox}>
                <Text style={styles.sumLabel}>Advances held</Text>
                <Text style={styles.advValue}>{fmtMoney(totals.advance)}</Text>
              </View>
            )}
          </View>
          <AgeingBar ageing={totals.ageing} total={totals.outstanding} />
          <View style={styles.ageRow}>
            {AGE.map((a) => (
              <View key={a.key} style={styles.ageCell}>
                <View style={styles.ageLabelRow}>
                  <View style={[styles.dot, { backgroundColor: a.color }]} />
                  <Text style={styles.ageLabel}>{a.label} days</Text>
                </View>
                <Text style={[styles.ageValue, a.key === 'd90_plus' && totals.ageing.d90_plus > 0 && { color: Colors.error }]}>
                  {fmtMoney(totals.ageing[a.key])}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={16} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput} placeholder="Search customer, code or phone..." placeholderTextColor={Colors.textMuted}
            value={search} onChangeText={setSearch} autoCorrect={false} autoCapitalize="none"
            autoComplete="new-password" textContentType="none" importantForAutofill="no"
          />
          {search ? <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={16} color={Colors.textMuted} /></TouchableOpacity> : null}
        </View>
      </View>
      <View style={styles.pills}>
        {SORTS.map(([k, label]) => (
          <TouchableOpacity key={k} style={[styles.pill, sort === k && styles.pillActive]} onPress={() => setSort(k)}>
            <Text style={[styles.pillText, sort === k && styles.pillTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={[styles.pill, showSettled && styles.pillActive]} onPress={() => { setLoading(true); setShowSettled((v) => !v); }}>
          <Text style={[styles.pillText, showSettled && styles.pillTextActive]}>{showSettled ? '✓ ' : ''}Show settled</Text>
        </TouchableOpacity>
      </View>

      {wide && rows.length > 0 && (
        <View style={[styles.tRow, styles.tHead]}>
          <Text style={[styles.th, { flex: 1 }]}>Customer</Text>
          {AGE.map((a) => <Text key={a.key} style={[styles.th, styles.cAge]}>{a.label}</Text>)}
          <Text style={[styles.th, styles.cBal]}>Balance</Text>
          <Text style={[styles.th, styles.cLast]}>Last payment</Text>
          <View style={{ width: 16 }} />
        </View>
      )}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );

  const renderItem = ({ item }: { item: ReceivableRow }) => {
    const open = () => router.push(`/(app)/ledger/${item.id}` as any);
    const balColor = item.balance > 0 ? Colors.error : item.balance < 0 ? Colors.info : Colors.textMuted;
    if (wide) {
      return (
        <TouchableOpacity style={[styles.tRow, styles.tBody]} onPress={open} activeOpacity={0.7}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>{item.customerName}</Text>
            <Text style={styles.sub} numberOfLines={1}>{[item.businessName, item.customerCode, item.phone].filter(Boolean).join('  ·  ')}</Text>
          </View>
          {AGE.map((a) => (
            <Text key={a.key} style={[styles.td, styles.cAge, item.ageing[a.key] > 0 && a.key === 'd90_plus' && { color: Colors.error, fontWeight: '700' }]}>
              {item.ageing[a.key] > 0 ? fmtMoney(item.ageing[a.key]) : '—'}
            </Text>
          ))}
          <Text style={[styles.td, styles.cBal, { color: balColor, fontWeight: '800' }]}>{fmtDrCr(item.balance)}</Text>
          <Text style={[styles.td, styles.cLast]}>{item.lastReceiptDate ? fmtDay(item.lastReceiptDate) : 'Never'}</Text>
          <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
        </TouchableOpacity>
      );
    }
    return (
      <TouchableOpacity style={styles.card} onPress={open} activeOpacity={0.75}>
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>{item.customerName}</Text>
            <Text style={styles.sub} numberOfLines={1}>{[item.businessName, item.phone].filter(Boolean).join('  ·  ') || item.customerCode}</Text>
          </View>
          <Text style={[styles.cardBal, { color: balColor }]}>{fmtDrCr(item.balance)}</Text>
        </View>
        {item.outstanding > 0 && (
          <>
            <AgeingBar ageing={item.ageing} total={item.outstanding} compact />
            <View style={styles.chips}>
              {AGE.filter((a) => item.ageing[a.key] > 0).map((a) => (
                <Text key={a.key} style={[styles.chip, { color: a.color, borderColor: a.color + '55' }]}>
                  {a.label}d {fmtMoney(item.ageing[a.key])}
                </Text>
              ))}
            </View>
          </>
        )}
        <Text style={styles.last}>
          {item.lastReceiptDate ? `Last payment ${fmtDay(item.lastReceiptDate)}` : 'No payment received yet'}
          {item.advance > 0 ? `  ·  Advance ${fmtMoney(item.advance)}` : ''}
        </Text>
      </TouchableOpacity>
    );
  };

  if (loading && !data) {
    return <View style={styles.center}><ActivityIndicator size="large" color={Colors.accent} /></View>;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        data={rows}
        keyExtractor={(r) => String(r.id)}
        renderItem={renderItem}
        ListHeaderComponent={header}
        contentContainerStyle={[styles.list, wide && styles.listWide]}
        ItemSeparatorComponent={wide ? undefined : () => <View style={{ height: 8 }} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.accent} />}
        ListEmptyComponent={
          loading ? <ActivityIndicator color={Colors.accent} style={{ marginTop: 40 }} /> : (
            <View style={styles.empty}>
              <Ionicons name="checkmark-done-circle-outline" size={44} color={Colors.success} />
              <Text style={styles.emptyText}>{search ? 'No matching customers' : 'Nothing outstanding — all customers are settled.'}</Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

function AgeingBar({ ageing, total, compact }: { ageing: LedgerAgeing; total: number; compact?: boolean }) {
  if (total <= 0) return null;
  return (
    <View style={[styles.bar, compact && styles.barCompact]}>
      {AGE.map((a) => ageing[a.key] > 0
        ? <View key={a.key} style={{ flex: ageing[a.key] / total, backgroundColor: a.color }} />
        : null)}
    </View>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  list:   { paddingBottom: 40 },
  listWide: { width: '100%', maxWidth: 1200, alignSelf: 'center' },

  summary:    { backgroundColor: Colors.primary, padding: 18 },
  summaryTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  sumLabel:   { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 0.6 },
  sumValue:   { fontSize: 28, fontWeight: '800', color: Colors.accent, marginTop: 2 },
  sumSub:     { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  advBox:     { alignItems: 'flex-end' },
  advValue:   { fontSize: 16, fontWeight: '800', color: '#7FD1FF', marginTop: 4 },
  bar:        { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', marginTop: 14, backgroundColor: 'rgba(255,255,255,0.12)' },
  barCompact: { height: 6, marginTop: 10, backgroundColor: Colors.background },
  ageRow:     { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
  ageCell:    { flexGrow: 1, flexBasis: 80, paddingVertical: 4 },
  ageLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot:        { width: 8, height: 8, borderRadius: 4 },
  ageLabel:   { fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: '600' },
  ageValue:   { fontSize: 13, fontWeight: '800', color: '#fff', marginTop: 2 },

  searchRow:  { padding: 12, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  searchBox:  { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.background, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 10, height: 40 },
  searchInput: { flex: 1, fontSize: 14, color: Colors.textPrimary, ...Platform.select({ web: { outlineStyle: 'none' as any } }) },
  pills:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border, marginBottom: 10 },
  pill:       { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  pillActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  pillText:   { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  pillTextActive: { color: '#111' },
  errorText:  { color: Colors.error, fontSize: 13, paddingHorizontal: 14, paddingBottom: 8 },

  tRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 11, marginHorizontal: 12 },
  tHead:  { backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border, borderTopLeftRadius: 8, borderTopRightRadius: 8, paddingVertical: 8 },
  tBody:  { backgroundColor: Colors.surface, borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: Colors.border },
  th:     { fontSize: 11, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4 },
  td:     { fontSize: 13, color: Colors.textPrimary },
  cAge:   { width: 110, textAlign: 'right' },
  cBal:   { width: 150, textAlign: 'right' },
  cLast:  { width: 110, textAlign: 'right' },

  card:     { backgroundColor: Colors.surface, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, padding: 14, marginHorizontal: 12 },
  cardTop:  { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  name:     { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  sub:      { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  cardBal:  { fontSize: 15, fontWeight: '800' },
  chips:    { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  chip:     { fontSize: 11, fontWeight: '700', borderWidth: 1, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, overflow: 'hidden' },
  last:     { fontSize: 11, color: Colors.textMuted, marginTop: 8 },

  empty:     { alignItems: 'center', paddingVertical: 50, gap: 10 },
  emptyText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
});
