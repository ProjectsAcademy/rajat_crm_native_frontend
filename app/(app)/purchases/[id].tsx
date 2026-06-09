import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { purchasesApi, stockApi, PurchaseDetail, StockMovement } from '../../../services/api';
import { Colors } from '../../../constants/colors';
import PurchaseFormSheet from '../../../components/PurchaseFormSheet';
import StockEntryFormSheet, { PurchaseItemOption } from '../../../components/StockEntryFormSheet';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft:     { bg: Colors.border,        text: Colors.textMuted },
  ordered:   { bg: '#E3F2FD',            text: '#1565C0'        },
  received:  { bg: Colors.successLight,  text: Colors.success   },
  partial:   { bg: '#FFF3E0',            text: '#E65100'        },
  cancelled: { bg: Colors.errorLight,    text: Colors.error     },
};
const PAY_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: Colors.errorLight,   text: Colors.error   },
  partial: { bg: '#FFF3E0',           text: '#E65100'      },
  paid:    { bg: Colors.successLight, text: Colors.success },
};

function fmtAmt(v: string) { const n=parseFloat(v||'0'); if(n>=100000) return `₹${(n/100000).toFixed(2)}L`; return `₹${n.toLocaleString('en-IN',{minimumFractionDigits:2})}`; }
function fmtDate(d: string) { return new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}); }

export default function PurchaseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [purchase,      setPurchase]      = useState<PurchaseDetail | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');
  const [showEdit,      setShowEdit]      = useState(false);
  const [deleting,      setDeleting]      = useState(false);

  // Stock entries linked to this purchase
  const [stockEntries,    setStockEntries]    = useState<StockMovement[]>([]);
  const [loadingEntries,  setLoadingEntries]  = useState(false);
  const [showAddEntry,    setShowAddEntry]    = useState(false);
  const [editingEntry,    setEditingEntry]    = useState<StockMovement | null>(null);

  const loadPurchase = useCallback(() => {
    purchasesApi.detail(parseInt(id!))
      .then(({ data }) => setPurchase(data.purchase))
      .catch(() => setError('Could not load purchase.'))
      .finally(() => setLoading(false));
  }, [id]);

  const loadStockEntries = useCallback(() => {
    setLoadingEntries(true);
    stockApi.list({ referenceType: 'purchase', referenceId: parseInt(id!), limit: 100 })
      .then(({ data }) => setStockEntries(data.movements))
      .catch(() => {})
      .finally(() => setLoadingEntries(false));
  }, [id]);

  useEffect(() => { loadPurchase(); }, [loadPurchase]);
  useEffect(() => { loadStockEntries(); }, [loadStockEntries]);

  const handleDelete = () => {
    const msg = `Delete purchase "${purchase?.purchaseNo}"? All items will be permanently removed. This cannot be undone.`;

    const doDelete = async () => {
      setDeleting(true);
      try {
        await purchasesApi.remove(parseInt(id!));
        router.back();
      } catch {
        Alert.alert('Error', 'Could not delete purchase.');
        setDeleting(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(msg)) doDelete();
      return;
    }

    Alert.alert('Delete Purchase', msg, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: doDelete },
    ]);
  };

  const handleDeleteEntry = (entry: StockMovement) => {
    const doDelete = async () => {
      try {
        await stockApi.remove(entry.id);
        loadStockEntries();
      } catch (e: any) {
        const msg = e?.response?.data?.error ?? 'Could not delete entry.';
        if (Platform.OS === 'web') { window.alert(msg); } else { Alert.alert('Error', msg); }
      }
    };
    const msg = `Remove this stock entry (${parseFloat(entry.quantity).toFixed(2)} ${entry.inventory?.unit ?? 'units'} of ${entry.inventory?.name ?? 'item'})?`;
    if (Platform.OS === 'web') { if (window.confirm(msg)) doDelete(); return; }
    Alert.alert('Remove Entry', msg, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: doDelete },
    ]);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={Colors.accent} /></View>;
  if (error || !purchase) return (
    <View style={styles.center}>
      <Ionicons name="alert-circle-outline" size={40} color={Colors.textMuted} />
      <Text style={styles.errorText}>{error || 'Not found'}</Text>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Text style={styles.backBtnText}>Go Back</Text></TouchableOpacity>
    </View>
  );

  const sc = STATUS_COLORS[purchase.status] ?? STATUS_COLORS.draft;
  const pc = PAY_COLORS[purchase.paymentStatus] ?? PAY_COLORS.pending;
  const balance = parseFloat(purchase.totalAmount) - parseFloat(purchase.paidAmount);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.purchaseNo}>{purchase.purchaseNo}</Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {purchase.isGst && <View style={styles.gstBadge}><Text style={styles.gstText}>GST</Text></View>}
              <View style={[styles.badge, { backgroundColor: sc.bg }]}>
                <Text style={[styles.badgeText, { color: sc.text }]}>{purchase.status.toUpperCase()}</Text>
              </View>
            </View>
          </View>
          <Text style={styles.vendorName}>{purchase.vendor?.name ?? 'Unknown Vendor'}</Text>
          {purchase.vendor && <Text style={styles.vendorCode}>{purchase.vendor.vendorCode}</Text>}
          <Text style={styles.dateText}>
            Date: {fmtDate(purchase.purchaseDate)}
            {purchase.deliveryDate ? `  ·  Delivery: ${fmtDate(purchase.deliveryDate)}` : ''}
          </Text>

          {/* Edit / Delete actions */}
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.editBtn} onPress={() => setShowEdit(true)}>
              <Ionicons name="create-outline" size={15} color={Colors.accent} />
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.deleteBtn, deleting && { opacity: 0.5 }]} onPress={handleDelete} disabled={deleting}>
              {deleting
                ? <ActivityIndicator size="small" color={Colors.error} />
                : <><Ionicons name="trash-outline" size={15} color={Colors.error} /><Text style={styles.deleteBtnText}>Delete</Text></>
              }
            </TouchableOpacity>
          </View>
        </View>

        {/* Financials */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Total</Text>
            <Text style={styles.statValue}>{fmtAmt(purchase.totalAmount)}</Text>
          </View>
          <View style={[styles.statBox, styles.statBorder]}>
            <Text style={styles.statLabel}>Paid</Text>
            <Text style={[styles.statValue, { color: Colors.success }]}>{fmtAmt(purchase.paidAmount)}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Balance</Text>
            <Text style={[styles.statValue, { color: balance > 0 ? Colors.error : Colors.success }]}>{fmtAmt(balance.toString())}</Text>
          </View>
        </View>

        {/* Status chips */}
        <View style={styles.chipRow}>
          <View style={[styles.chip, { backgroundColor: pc.bg }]}>
            <View style={[styles.dot, { backgroundColor: pc.text }]} />
            <Text style={[styles.chipText, { color: pc.text }]}>{purchase.paymentStatus.toUpperCase()}</Text>
          </View>
          {purchase.taxAmount && parseFloat(purchase.taxAmount) > 0 && (
            <View style={[styles.chip, { backgroundColor: Colors.infoLight }]}>
              <Text style={[styles.chipText, { color: Colors.info }]}>GST: {fmtAmt(purchase.taxAmount)}</Text>
            </View>
          )}
          {purchase.subtotal && (
            <View style={[styles.chip, { backgroundColor: Colors.surfaceAlt ?? Colors.background }]}>
              <Text style={[styles.chipText, { color: Colors.textMuted }]}>Subtotal: {fmtAmt(String(purchase.subtotal))}</Text>
            </View>
          )}
        </View>

        {/* Items */}
        {purchase.items.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Items ({purchase.items.length})</Text>
            <View style={styles.card}>
              {purchase.items.map((it, i) => {
                const stocked = parseFloat(it.stockedQty);
                return (
                  <View key={it.id} style={[styles.itemRow, i > 0 && styles.itemBorder]}>
                    <View style={styles.itemLeft}>
                      {it.inventory && <Text style={styles.itemCode}>{it.inventory.itemCode}</Text>}
                      <Text style={styles.itemName}>
                        {it.inventory?.name ?? (it.description || '—')}
                      </Text>
                      <Text style={styles.itemMeta}>
                        {parseFloat(it.quantity).toFixed(2)} {it.inventory?.unit ?? it.unit ?? 'pcs'} × {fmtAmt(it.unitPrice)}
                        {parseFloat(it.taxRate) > 0 ? ` + ${it.taxRate}% GST` : ''}
                      </Text>
                      {stocked > 0 && (
                        <View style={styles.stockedPill}>
                          <Ionicons name="checkmark-circle" size={10} color={Colors.success} />
                          <Text style={styles.stockedPillText}>Stocked: {stocked} {it.inventory?.unit ?? 'pcs'}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.itemTotal}>{fmtAmt(it.total)}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Stock Impact — shown when any item has been stocked */}
        {purchase.items.some(it => parseFloat(it.stockedQty) > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Stock Impact</Text>
            <View style={styles.stockImpactCard}>
              <View style={styles.stockImpactHeader}>
                <Ionicons name="trending-up-outline" size={15} color={Colors.success} />
                <Text style={styles.stockImpactTitle}>
                  {purchase.status === 'cancelled' ? 'Stock Reversed' : 'Added to Stock'}
                </Text>
              </View>
              {purchase.items
                .filter(it => parseFloat(it.stockedQty) > 0 && it.inventory)
                .map(it => (
                  <View key={it.id} style={styles.stockImpactRow}>
                    <Text style={styles.stockImpactItem} numberOfLines={1}>{it.inventory!.name}</Text>
                    <Text style={styles.stockImpactQty}>
                      +{parseFloat(it.stockedQty).toFixed(2)} {it.inventory!.unit}
                    </Text>
                  </View>
                ))}
            </View>
          </View>
        )}

        {/* Vendor contact */}
        {purchase.vendor && (purchase.vendor.phone || purchase.vendor.email || purchase.vendor.gstin) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Vendor</Text>
            <View style={styles.card}>
              {purchase.vendor.phone ? (
                <View style={styles.detailRow}><Ionicons name="call-outline" size={14} color={Colors.textMuted} /><Text style={styles.detailText}>{purchase.vendor.phone}</Text></View>
              ) : null}
              {purchase.vendor.email ? (
                <View style={styles.detailRow}><Ionicons name="mail-outline" size={14} color={Colors.textMuted} /><Text style={styles.detailText}>{purchase.vendor.email}</Text></View>
              ) : null}
              {purchase.vendor.gstin ? (
                <View style={styles.detailRow}><Ionicons name="business-outline" size={14} color={Colors.textMuted} /><Text style={styles.detailText}>GST: {purchase.vendor.gstin}</Text></View>
              ) : null}
            </View>
          </View>
        )}

        {/* Notes */}
        {purchase.notes ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <View style={styles.card}><Text style={styles.notes}>{purchase.notes}</Text></View>
          </View>
        ) : null}

        {/* Stock Entries */}
        <View style={styles.section}>
          <View style={styles.stockSectionHead}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="layers-outline" size={15} color={Colors.textSecondary} />
              <Text style={styles.sectionTitle}>Stock Entries</Text>
              {stockEntries.length > 0 && (
                <View style={styles.countBadge}><Text style={styles.countBadgeText}>{stockEntries.length}</Text></View>
              )}
            </View>
            <TouchableOpacity style={styles.addEntryBtn} onPress={() => setShowAddEntry(true)}>
              <Ionicons name="add" size={14} color="#111" />
              <Text style={styles.addEntryBtnText}>Add Entry</Text>
            </TouchableOpacity>
          </View>

          {loadingEntries ? (
            <ActivityIndicator color={Colors.accent} style={{ marginTop: 12 }} />
          ) : stockEntries.length === 0 ? (
            <View style={styles.stockEmptyCard}>
              <Ionicons name="git-branch-outline" size={28} color={Colors.textMuted} />
              <Text style={styles.stockEmptyTitle}>No stock entries yet</Text>
              <Text style={styles.stockEmptyHint}>
                Tap "Add Entry" to record stock movements for this purchase.
                These entries are independent — editing them won't change purchase details.
              </Text>
            </View>
          ) : (
            <View style={styles.card}>
              {stockEntries.map((entry, i) => {
                const txKey = entry.transactionType as 'in' | 'out' | 'adjustment';
                const txColors = {
                  in:         { bg: Colors.successLight, text: Colors.success  },
                  out:        { bg: Colors.errorLight,   text: Colors.error    },
                  adjustment: { bg: Colors.infoLight,    text: Colors.info     },
                };
                const tc = txColors[txKey] ?? txColors.adjustment;
                return (
                  <View key={entry.id} style={[styles.stockEntryRow, i > 0 && styles.itemBorder]}>
                    <View style={[styles.stockEntryBadge, { backgroundColor: tc.bg }]}>
                      <Text style={[styles.stockEntryType, { color: tc.text }]}>
                        {entry.transactionType.toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.stockEntryBody}>
                      <Text style={styles.stockEntryItem} numberOfLines={1}>
                        {entry.inventory?.name ?? '—'}
                      </Text>
                      <Text style={styles.stockEntryMeta}>
                        {parseFloat(entry.quantity).toFixed(2)} {entry.inventory?.unit ?? 'units'}
                        {entry.location ? `  ·  ${entry.location}` : ''}
                        {entry.batchNo  ? `  ·  ${entry.batchNo}`  : ''}
                      </Text>
                    </View>
                    <View style={styles.stockEntryActions}>
                      <TouchableOpacity
                        onPress={() => setEditingEntry(entry)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={styles.entryActionBtn}
                      >
                        <Ionicons name="create-outline" size={16} color={Colors.accent} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeleteEntry(entry)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={styles.entryActionBtn}
                      >
                        <Ionicons name="trash-outline" size={16} color={Colors.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

      </ScrollView>

      {/* Stock Entry form */}
      <StockEntryFormSheet
        visible={showAddEntry || !!editingEntry}
        onClose={() => { setShowAddEntry(false); setEditingEntry(null); }}
        onSaved={() => { setShowAddEntry(false); setEditingEntry(null); loadStockEntries(); }}
        movement={editingEntry}
        purchaseContext={showAddEntry ? {
          purchaseId:  purchase.id,
          purchaseNo:  purchase.purchaseNo,
          items: purchase.items
            .filter(it => it.inventory)
            .map((it): PurchaseItemOption => ({
              inventoryId: it.inventory!.id,
              name:        it.inventory!.name,
              itemCode:    it.inventory!.itemCode,
              unit:        it.inventory!.unit,
              qty:         parseFloat(it.quantity).toString(),
            })),
        } : undefined}
      />

      <PurchaseFormSheet
        visible={showEdit}
        onClose={() => setShowEdit(false)}
        onSaved={() => { loadPurchase(); }}
        purchase={purchase}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  errorText: { color: Colors.textSecondary, fontSize: 14 },
  backBtn: { backgroundColor: Colors.accent, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 4 },
  backBtnText: { color: '#111', fontWeight: '700' },

  header: { backgroundColor: Colors.primary, padding: 20 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  purchaseNo: { fontSize: 13, fontWeight: '700', color: Colors.accent, letterSpacing: 0.5 },
  gstBadge: { backgroundColor: '#E3F2FD', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  gstText:  { fontSize: 10, fontWeight: '800', color: '#1565C0' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 },
  badgeText: { fontSize: 10, fontWeight: '800' },
  vendorName: { fontSize: 18, fontWeight: '700', color: '#fff', lineHeight: 24 },
  vendorCode: { fontSize: 12, color: Colors.accent, marginTop: 2, fontWeight: '600' },
  dateText:   { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 6 },

  headerActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  editBtn:   { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6, borderWidth: 1, borderColor: Colors.accent, backgroundColor: 'rgba(255,153,0,0.1)' },
  editBtnText:   { fontSize: 13, fontWeight: '700', color: Colors.accent },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(209,50,18,0.5)', backgroundColor: 'rgba(209,50,18,0.08)' },
  deleteBtnText: { fontSize: 13, fontWeight: '700', color: Colors.error },

  statsRow: { flexDirection: 'row', backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  statBox:  { flex: 1, padding: 14, alignItems: 'center' },
  statBorder: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: Colors.border },
  statLabel: { fontSize: 10, color: Colors.textMuted, marginBottom: 4, fontWeight: '500' },
  statValue: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center' },

  chipRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingTop: 14, flexWrap: 'wrap' },
  chip:    { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  dot:     { width: 7, height: 7, borderRadius: 4 },
  chipText:{ fontSize: 12, fontWeight: '700' },

  section:      { marginTop: 16, paddingHorizontal: 14 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  card:         { backgroundColor: Colors.surface, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },

  itemRow:   { padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  itemBorder:{ borderTopWidth: 1, borderTopColor: Colors.border },
  itemLeft:  { flex: 1 },
  itemCode:  { fontSize: 10, fontWeight: '700', color: Colors.accent, marginBottom: 2 },
  itemName:  { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  itemMeta:  { fontSize: 11, color: Colors.textMuted, marginTop: 3 },
  itemTotal: { fontSize: 14, fontWeight: '800', color: Colors.textPrimary },

  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  detailText:{ fontSize: 13, color: Colors.textPrimary },
  notes: { padding: 14, fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },

  stockedPill: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, alignSelf: 'flex-start', backgroundColor: Colors.successLight, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
  stockedPillText: { fontSize: 10, fontWeight: '700', color: Colors.success },

  stockImpactCard:   { backgroundColor: Colors.successLight, borderRadius: 8, borderWidth: 1, borderColor: Colors.success + '40', overflow: 'hidden' },
  stockImpactHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.success + '30' },
  stockImpactTitle:  { fontSize: 13, fontWeight: '700', color: Colors.success },
  stockImpactRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 9, borderTopWidth: 1, borderTopColor: Colors.success + '20' },
  stockImpactItem:   { fontSize: 13, color: Colors.textPrimary, flex: 1, marginRight: 12 },
  stockImpactQty:    { fontSize: 13, fontWeight: '800', color: Colors.success },

  // Stock Entries section
  stockSectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  countBadge:       { backgroundColor: Colors.accent, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  countBadgeText:   { fontSize: 10, fontWeight: '800', color: '#111' },
  addEntryBtn:      { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.accent, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  addEntryBtnText:  { fontSize: 12, fontWeight: '700', color: '#111' },

  stockEmptyCard:  { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 20, gap: 8, backgroundColor: Colors.surface, borderRadius: 8, borderWidth: 1, borderColor: Colors.border },
  stockEmptyTitle: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  stockEmptyHint:  { fontSize: 12, color: Colors.textMuted, textAlign: 'center', lineHeight: 18 },

  stockEntryRow:    { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  stockEntryBadge:  { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, minWidth: 50, alignItems: 'center' },
  stockEntryType:   { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  stockEntryBody:   { flex: 1 },
  stockEntryItem:   { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  stockEntryMeta:   { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  stockEntryActions:{ flexDirection: 'row', gap: 4 },
  entryActionBtn:   { padding: 6 },
});
