import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { customersApi, Customer } from '../../../services/api';
import { Colors } from '../../../constants/colors';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    customersApi.detail(parseInt(id!))
      .then(({ data }) => setCustomer(data.customer))
      .catch(() => setError('Could not load customer.'))
      .finally(() => setLoading(false));
  }, [id]);

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
        </View>

        {/* Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <View style={styles.card}>
            <InfoRow label="Customer Code" value={customer.customerCode} />
            <InfoRow label="Phone" value={customer.phone} icon="call-outline" />
            <InfoRow label="Email" value={customer.email} icon="mail-outline" />
            <InfoRow label="Address" value={customer.address} icon="location-outline" />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Business Details</Text>
          <View style={styles.card}>
            <InfoRow label="GSTIN" value={customer.gstin} />
            <InfoRow label="Added On" value={new Date(customer.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} />
          </View>
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
