import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { inventoryApi, InventoryDetail, StockMovement } from '../../../services/api';
import { Colors } from '../../../constants/colors';
import MediaSection from '../../../components/MediaSection';

const TX_COLORS: Record<string, { bg: string; text: string; icon: React.ComponentProps<typeof Ionicons>['name'] }> = {
  in:         { bg: Colors.successLight, text: Colors.success, icon: 'arrow-down-circle-outline' },
  out:        { bg: Colors.errorLight,   text: Colors.error,   icon: 'arrow-up-circle-outline' },
  adjustment: { bg: Colors.infoLight,   text: Colors.info,    icon: 'swap-horizontal-outline' },
};

function fmtPrice(val: string) {
  const n = parseFloat(val || '0');
  if (n === 0) return '—';
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function StockRow({ s, unit }: { s: StockMovement; unit: string }) {
  const tc = TX_COLORS[s.transactionType] ?? TX_COLORS.adjustment;
  return (
    <View style={styles.txRow}>
      <View style={[styles.txIconBox, { backgroundColor: tc.bg }]}>
        <Ionicons name={tc.icon} size={16} color={tc.text} />
      </View>
      <View style={styles.txBody}>
        <View style={styles.txTop}>
          <Text style={[styles.txType, { color: tc.text }]}>{s.transactionType.toUpperCase()}</Text>
          <Text style={styles.txQty}>{parseFloat(s.quantity).toFixed(2)} {unit}</Text>
        </View>
        {s.reference ? <Text style={styles.txRef} numberOfLines={1}>{s.reference}</Text> : null}
        <Text style={styles.txDate}>{fmtDate(s.createdAt)}</Text>
      </View>
    </View>
  );
}

export default function InventoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [item, setItem] = useState<InventoryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadItem = useCallback(() => {
    inventoryApi.detail(parseInt(id!))
      .then(({ data }) => setItem(data.item))
      .catch(() => setError('Could not load item.'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { loadItem(); }, [loadItem]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={Colors.accent} /></View>;
  if (error || !item) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={40} color={Colors.textMuted} />
        <Text style={styles.errorText}>{error || 'Not found'}</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const ro = parseFloat(item.reorderLevel || '0');
  const cs = item.currentStock;
  const stockColor = cs <= 0 ? Colors.error : cs <= ro ? '#7A5400' : Colors.success;
  const stockBg    = cs <= 0 ? Colors.errorLight : cs <= ro ? Colors.warningLight : Colors.successLight;
  const stockLabel = cs <= 0 ? 'Out of Stock' : cs <= ro ? 'Low Stock' : 'In Stock';

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.itemCode}>{item.itemCode}</Text>
            <View style={[styles.badge, { backgroundColor: item.isActive ? Colors.successLight : Colors.errorLight }]}>
              <Text style={[styles.badgeText, { color: item.isActive ? Colors.success : Colors.error }]}>
                {item.isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
          <Text style={styles.itemName}>{item.name}</Text>
          {item.category ? <Text style={styles.category}>{item.category}</Text> : null}
          {item.description ? <Text style={styles.desc}>{item.description}</Text> : null}
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Current Stock</Text>
            <Text style={[styles.statValue, { color: stockColor }]}>{cs.toFixed(2)}</Text>
            <Text style={styles.statUnit}>{item.unit}</Text>
          </View>
          <View style={[styles.statBox, styles.statBorder]}>
            <Text style={styles.statLabel}>Unit Price</Text>
            <Text style={styles.statValue}>{fmtPrice(item.unitPrice)}</Text>
            <Text style={styles.statUnit}>per {item.unit}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Reorder At</Text>
            <Text style={styles.statValue}>{parseFloat(item.reorderLevel).toFixed(0)}</Text>
            <Text style={styles.statUnit}>{item.unit}</Text>
          </View>
        </View>

        {/* Stock status chip */}
        <View style={styles.statusRow}>
          <View style={[styles.statusChip, { backgroundColor: stockBg }]}>
            <View style={[styles.statusDot, { backgroundColor: stockColor }]} />
            <Text style={[styles.statusLabel, { color: stockColor }]}>{stockLabel}</Text>
          </View>
        </View>

        {/* Recent movements */}
        {item.recentStocks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Stock Movements</Text>
            <View style={styles.card}>
              {item.recentStocks.map((s) => (
                <StockRow key={s.id} s={s} unit={item.unit} />
              ))}
            </View>
          </View>
        )}

        {/* Attachments */}
        <View style={styles.section}>
          <MediaSection
            entity="inventory"
            entityId={item.id}
            files={item.mediaFiles ?? []}
            onRefresh={loadItem}
          />
        </View>

      </ScrollView>
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
  itemCode: { fontSize: 13, fontWeight: '700', color: Colors.accent, letterSpacing: 0.5 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  itemName: { fontSize: 18, fontWeight: '700', color: '#fff', lineHeight: 26 },
  category: { fontSize: 12, color: Colors.accent, marginTop: 4, fontWeight: '600' },
  desc: { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 8, lineHeight: 20 },

  statsRow: {
    flexDirection: 'row', backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  statBox: { flex: 1, padding: 14, alignItems: 'center' },
  statBorder: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: Colors.border },
  statLabel: { fontSize: 10, color: Colors.textMuted, marginBottom: 4, fontWeight: '500' },
  statValue: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center' },
  statUnit: { fontSize: 10, color: Colors.textMuted, marginTop: 2 },

  statusRow: { paddingHorizontal: 14, paddingTop: 14 },
  statusChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusLabel: { fontSize: 13, fontWeight: '700' },

  section: { marginTop: 16, paddingHorizontal: 14 },
  sectionTitle: {
    fontSize: 11, fontWeight: '700', color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8,
  },
  card: { backgroundColor: Colors.surface, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },

  txRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  txIconBox: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  txBody: { flex: 1 },
  txTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  txType: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  txQty: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  txRef: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  txDate: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
});
