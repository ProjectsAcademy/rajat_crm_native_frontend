import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Platform, useWindowDimensions,
} from 'react-native';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { invoicesApi, InvoiceSummary } from '../../../services/api';
import { Colors } from '../../../constants/colors';
import CustomerFilterBanner from '../../../components/CustomerFilterBanner';
import Breadcrumbs from '../../../components/Breadcrumbs';
import InvoiceFormSheet from '../../../components/InvoiceFormSheet';
import { useCan } from '../../../store/auth';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft:     { bg: Colors.border,        text: Colors.textMuted  },
  sent:      { bg: '#E3F2FD',            text: '#1565C0'         },
  paid:      { bg: Colors.successLight,  text: Colors.success    },
  overdue:   { bg: Colors.errorLight,    text: Colors.error      },
  cancelled: { bg: '#F5F5F5',            text: '#757575'         },
};
const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  sales:    { bg: '#E8F5E9', text: '#2E7D32' },
  purchase: { bg: '#FFF3E0', text: '#E65100' },
};

function fmtAmt(v: string) {
  const n = parseFloat(v || '0');
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
}

const FILTERS = ['All', 'Sales', 'Purchase'];

export default function InvoicesScreen() {
  const may = useCan();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';

  // Responsive column counts: 3 cols on desktop (>=1024px), 2 on tablet (>=640px), 1 on phone
  const numColumns = useMemo(() => {
    if (width >= 1024) return 3;
    if (width >= 640) return 2;
    return 1;
  }, [width]);

  const { customerId, customerName } = useLocalSearchParams<{ customerId?: string; customerName?: string }>();
  const [items, setItems]         = useState<InvoiceSummary[]>([]);
  const [search, setSearch]       = useState('');
  const [filter, setFilter]       = useState('All');
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [total, setTotal]         = useState(0);
  const [showForm, setShowForm]   = useState(false);

  const fetchItems = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const params: any = {
        search: search.trim() || undefined,
        customerId: customerId ? parseInt(customerId) : undefined,
        limit: 100,
      };
      if (filter !== 'All') params.invoiceType = filter.toLowerCase();
      const { data } = await invoicesApi.list(params);
      setItems(data.invoices);
      setTotal(data.total);
    } catch { setItems([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, [search, filter, customerId]);

  useEffect(() => { const t = setTimeout(() => fetchItems(), 350); return () => clearTimeout(t); }, [fetchItems]);

  // Pads the final row with invisible cards so items maintain uniform grid widths
  const displayItems = useMemo(() => {
    if (numColumns <= 1 || items.length === 0) return items;
    const remainder = items.length % numColumns;
    if (remainder === 0) return items;
    const placeholders = Array.from({ length: numColumns - remainder }, (_, idx) => ({
      id: -1 * (idx + 1),
      _isPlaceholder: true,
    } as unknown as InvoiceSummary));
    return [...items, ...placeholders];
  }, [items, numColumns]);

  const renderItem = ({ item }: { item: InvoiceSummary }) => {
    if ((item as any)._isPlaceholder) {
      return <View style={[styles.card, styles.placeholderCard]} />;
    }
    const sc = STATUS_COLORS[item.status] ?? STATUS_COLORS.draft;
    const tc = TYPE_COLORS[item.invoiceType] ?? TYPE_COLORS.sales;
    const counterpart = item.customer?.customerName ?? item.vendor?.name ?? '—';
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/(app)/invoices/${item.id}` as any)}
        activeOpacity={0.75}
      >
        <View style={styles.cardTop}>
          <Text style={styles.invoiceNo}>{item.invoiceNo}</Text>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: tc.bg }]}>
              <Text style={[styles.badgeText, { color: tc.text }]}>{item.invoiceType.toUpperCase()}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: sc.bg }]}>
              <Text style={[styles.badgeText, { color: sc.text }]}>{item.status.toUpperCase()}</Text>
            </View>
          </View>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.name} numberOfLines={1}>{counterpart}</Text>
          {item.project ? (
            <Text style={styles.sub} numberOfLines={1}>📁 {item.project.projectNo} · {item.project.name}</Text>
          ) : null}
        </View>

        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.fieldLabel}>Total Amount</Text>
            <Text style={styles.amount}>{fmtAmt(item.totalAmount)}</Text>
          </View>
          <View style={styles.dueBox}>
            <Text style={styles.fieldLabel}>Due Date</Text>
            <Text style={styles.date}>{fmtDate(item.dueDate)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Breadcrumbs moduleKey="invoices" />
      {customerId && customerName ? (
        <CustomerFilterBanner
          name={customerName}
          onClear={() => router.setParams({ customerId: undefined, customerName: undefined })}
        />
      ) : null}

      {/* Filter & Search Bar: Side-by-side on wide web screens, stacked on mobile */}
      <View style={[styles.filterBar, isWeb && width >= 768 && styles.filterBarWeb]}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={16} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search invoices..."
            placeholderTextColor={Colors.textMuted}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="none"
            importantForAutofill="no"
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.pillsAndCount}>
          <View style={styles.pills}>
            {FILTERS.map(f => (
              <TouchableOpacity
                key={f}
                style={[styles.pill, filter === f && styles.pillActive]}
                onPress={() => setFilter(f)}
              >
                <Text style={[styles.pillText, filter === f && styles.pillTextActive]}>{f}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.totalBadge}>
            <Text style={styles.totalText}>{total}</Text>
          </View>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.accent} /></View>
      ) : (
        <FlatList
          key={`invoices-grid-${numColumns}`}
          data={displayItems}
          keyExtractor={i => String(i.id)}
          renderItem={renderItem}
          numColumns={numColumns}
          columnWrapperStyle={numColumns > 1 ? styles.row : undefined}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchItems(true); }}
              tintColor={Colors.accent}
            />
          }
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="document-text-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No invoices found</Text>
            </View>
          }
        />
      )}

      {may('invoices.create') && (
        <TouchableOpacity style={styles.fab} onPress={() => setShowForm(true)} activeOpacity={0.85}>
          <Ionicons name="add" size={26} color="#111" />
        </TouchableOpacity>
      )}

      <InvoiceFormSheet
        visible={showForm}
        onClose={() => setShowForm(false)}
        onSaved={(newId) => {
          if (newId) {
            router.push(`/(app)/invoices/${newId}` as any);
          } else {
            fetchItems(true);
          }
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  filterBar: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    padding: 12,
    gap: 10,
  },
  filterBarWeb: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 10,
    height: 40,
    ...Platform.select({
      web: { flex: 1, maxWidth: 420 },
      default: { flex: 1 },
    }),
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
    ...Platform.select({ web: { outlineStyle: 'none' } }),
  },
  pillsAndCount: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  pills: {
    flexDirection: 'row',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pillActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  pillTextActive: {
    color: '#111',
  },
  totalBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  totalText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  list: {
    padding: 12,
  },
  row: {
    gap: 12,
  },
  card: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    justifyContent: 'space-between',
    ...Platform.select({
      web: {
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        cursor: 'pointer',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
        elevation: 2,
      },
    }),
  },
  placeholderCard: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    opacity: 0,
    ...Platform.select({
      web: { pointerEvents: 'none', boxShadow: 'none' },
      default: { shadowOpacity: 0, elevation: 0 },
    }),
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F5',
  },
  invoiceNo: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6A1B9A',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  cardBody: {
    paddingVertical: 10,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  sub: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 3,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F2F5',
  },
  fieldLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    color: Colors.textMuted,
    fontWeight: '600',
    marginBottom: 2,
  },
  amount: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  dueBox: {
    alignItems: 'flex-end',
  },
  date: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    ...Platform.select({
      web: { boxShadow: '0 4px 12px rgba(0,0,0,0.25)' },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12 },
    }),
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 10,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
});
