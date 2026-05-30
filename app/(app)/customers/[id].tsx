import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  TouchableOpacity, Alert, Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { customersApi, Customer } from '../../../services/api';
import { Colors } from '../../../constants/colors';
import CustomerFormSheet from '../../../components/CustomerFormSheet';

function InfoRow({ label, value, icon }: { label: string; value: string; icon?: string }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <View style={styles.infoValueRow}>
        {icon ? <Ionicons name={icon as any} size={14} color={Colors.textSecondary} /> : null}
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [showEdit, setShowEdit] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [deleting, setDeleting]         = useState(false);

  const loadCustomer = () => {
    setLoading(true);
    customersApi.detail(parseInt(id!))
      .then(({ data }) => setCustomer(data.customer))
      .catch(() => setError('Could not load customer.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadCustomer(); }, [id]);

  // ── Hard Delete ─────────────────────────────────────────────────────────────
  const handleDelete = () => {
    const doIt = async () => {
      setDeleting(true);
      try {
        await customersApi.deactivate(parseInt(id!)); // deactivate = DELETE endpoint
        router.back(); // navigate back to list after permanent deletion
      } catch (e: any) {
        const msg = e?.response?.data?.error ?? 'Could not delete customer.';
        setDeleting(false);
        if (Platform.OS === 'web') {
          window.alert(msg);
        } else {
          Alert.alert('Cannot Delete', msg);
        }
      }
    };

    const name = customer?.customerName ?? 'this customer';
    if (Platform.OS === 'web') {
      if (window.confirm(`Permanently delete "${name}"? This action cannot be undone.`)) doIt();
      return;
    }
    Alert.alert(
      'Delete Customer',
      `Permanently delete "${name}"?\n\nThis cannot be undone. Customer must have no orders, invoices, or estimates.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doIt },
      ],
    );
  };
  // ── Deactivate (soft — sets isActive=false via PUT) ──────────────────────
  const handleDeactivate = () => {
    const doIt = async () => {
      setDeactivating(true);
      try {
        await customersApi.update(parseInt(id!), { isActive: false });
        loadCustomer();
      } catch (e: any) {
        const msg = e?.response?.data?.error ?? 'Could not deactivate customer.';
        if (Platform.OS === 'web') {
          window.alert(msg);
        } else {
          Alert.alert('Error', msg);
        }
      } finally {
        setDeactivating(false);
      }
    };

    const name = customer?.customerName ?? 'this customer';
    if (Platform.OS === 'web') {
      if (window.confirm(`Deactivate "${name}"? They will be hidden from active lists but not deleted.`)) {
        doIt();
      }
      return;
    }
    Alert.alert(
      'Deactivate Customer',
      `Deactivate "${name}"? They will be hidden from active lists but not deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Deactivate', style: 'destructive', onPress: doIt },
      ],
    );
  };

  // ── Reactivate (toggle back to active) ─────────────────────────────────────
  const handleReactivate = async () => {
    setDeactivating(true);
    try {
      await customersApi.update(parseInt(id!), { isActive: true });
      loadCustomer();
    } catch {
      Alert.alert('Error', 'Could not reactivate customer.');
    } finally {
      setDeactivating(false);
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={Colors.accent} /></View>;
  }
  if (error || !customer) {
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

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Header card */}
        <View style={styles.headerCard}>
          <View style={styles.bigAvatar}>
            <Text style={styles.bigAvatarText}>{customer.customerName.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.headerName}>{customer.customerName}</Text>
          {customer.businessName ? <Text style={styles.headerBiz}>{customer.businessName}</Text> : null}
          <View style={[styles.badge, { backgroundColor: customer.isActive ? Colors.successLight : Colors.errorLight }]}>
            <Ionicons
              name={customer.isActive ? 'checkmark-circle' : 'close-circle'}
              size={12}
              color={customer.isActive ? Colors.success : Colors.error}
            />
            <Text style={[styles.badgeText, { color: customer.isActive ? Colors.success : Colors.error }]}>
              {customer.isActive ? 'Active' : 'Inactive'}
            </Text>
          </View>

          {/* Action buttons */}
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.editBtn} onPress={() => setShowEdit(true)}>
              <Ionicons name="create-outline" size={15} color={Colors.accent} />
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
            {customer.isActive ? (
              <TouchableOpacity
                style={[styles.deactivateBtn, deactivating && { opacity: 0.6 }]}
                onPress={handleDeactivate}
                disabled={deactivating}
              >
                {deactivating
                  ? <ActivityIndicator size="small" color={Colors.error} />
                  : <Ionicons name="ban-outline" size={15} color={Colors.error} />}
                <Text style={styles.deactivateBtnText}>Deactivate</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.reactivateBtn, deactivating && { opacity: 0.6 }]}
                onPress={handleReactivate}
                disabled={deactivating}
              >
                {deactivating
                  ? <ActivityIndicator size="small" color={Colors.success} />
                  : <Ionicons name="checkmark-circle-outline" size={15} color={Colors.success} />}
                <Text style={styles.reactivateBtnText}>Reactivate</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.deleteBtn, deleting && { opacity: 0.6 }]}
              onPress={handleDelete}
              disabled={deleting}
            >
              {deleting
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="trash-outline" size={15} color="#fff" />}
              <Text style={styles.deleteBtnText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Contact Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <View style={styles.card}>
            <InfoRow label="Customer Code" value={customer.customerCode} />
            <InfoRow label="Phone" value={customer.phone} icon="call-outline" />
            <InfoRow label="Email" value={customer.email} icon="mail-outline" />
            <InfoRow label="Address" value={customer.address} icon="location-outline" />
          </View>
        </View>

        {/* Business Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Business Details</Text>
          <View style={styles.card}>
            <InfoRow label="GSTIN" value={customer.gstin} />
            <InfoRow label="Added On" value={new Date(customer.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} />
          </View>
        </View>

      </ScrollView>

      {/* Edit form sheet */}
      <CustomerFormSheet
        visible={showEdit}
        customer={customer}
        onClose={() => setShowEdit(false)}
        onSaved={() => { setShowEdit(false); loadCustomer(); }}
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

  headerCard: {
    backgroundColor: Colors.primary, alignItems: 'center',
    paddingVertical: 28, paddingHorizontal: 20,
  },
  bigAvatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,153,0,0.2)', justifyContent: 'center',
    alignItems: 'center', marginBottom: 12, borderWidth: 2, borderColor: Colors.accent,
  },
  bigAvatarText: { fontSize: 30, fontWeight: '800', color: Colors.accent },
  headerName: { fontSize: 20, fontWeight: '700', color: '#fff', textAlign: 'center' },
  headerBiz: { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 4, textAlign: 'center' },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: 10, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  badgeText: { fontSize: 11, fontWeight: '700' },

  headerActions: {
    flexDirection: 'row', gap: 10, marginTop: 16,
  },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,153,0,0.15)', paddingHorizontal: 16,
    paddingVertical: 8, borderRadius: 6, borderWidth: 1,
    borderColor: 'rgba(255,153,0,0.4)',
  },
  editBtnText: { fontSize: 13, fontWeight: '700', color: Colors.accent },
  deactivateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(209,50,18,0.1)', paddingHorizontal: 16,
    paddingVertical: 8, borderRadius: 6, borderWidth: 1,
    borderColor: 'rgba(209,50,18,0.3)',
  },
  deactivateBtnText: { fontSize: 13, fontWeight: '700', color: Colors.error },
  reactivateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(6,125,98,0.1)', paddingHorizontal: 16,
    paddingVertical: 8, borderRadius: 6, borderWidth: 1,
    borderColor: 'rgba(6,125,98,0.3)',
  },
  reactivateBtnText: { fontSize: 13, fontWeight: '700', color: Colors.success },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.error, paddingHorizontal: 16,
    paddingVertical: 8, borderRadius: 6,
  },
  deleteBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  section: { marginTop: 16, paddingHorizontal: 14 },
  sectionTitle: {
    fontSize: 11, fontWeight: '700', color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8,
  },
  card: {
    backgroundColor: Colors.surface, borderRadius: 8,
    borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  infoLabel: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500', flex: 1 },
  infoValueRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1.5, justifyContent: 'flex-end' },
  infoValue: { fontSize: 13, color: Colors.textPrimary, fontWeight: '600', textAlign: 'right', flexShrink: 1 },
});
