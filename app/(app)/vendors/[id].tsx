import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { vendorsApi, Vendor } from '../../../services/api';
import { Colors } from '../../../constants/colors';

function InfoRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export default function VendorDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    vendorsApi.detail(parseInt(id!))
      .then(({ data }) => setVendor(data.vendor))
      .catch(() => setError('Could not load vendor.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={Colors.accent} /></View>;
  if (error || !vendor) {
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

  const hasBanking = vendor.bankName || vendor.accountNumber || vendor.ifscCode;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.headerCard}>
          <View style={styles.bigAvatar}>
            <Text style={styles.bigAvatarText}>{vendor.name.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.headerName}>{vendor.name}</Text>
          {vendor.contactPerson ? <Text style={styles.headerSub}>{vendor.contactPerson}</Text> : null}
          <View style={[styles.badge, { backgroundColor: vendor.isActive ? Colors.successLight : Colors.errorLight }]}>
            <Ionicons
              name={vendor.isActive ? 'checkmark-circle' : 'close-circle'}
              size={12}
              color={vendor.isActive ? Colors.success : Colors.error}
            />
            <Text style={[styles.badgeText, { color: vendor.isActive ? Colors.success : Colors.error }]}>
              {vendor.isActive ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>

        {/* Contact */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <View style={styles.card}>
            <InfoRow label="Vendor Code" value={vendor.vendorCode} />
            <InfoRow label="Phone" value={vendor.phone} />
            <InfoRow label="Email" value={vendor.email} />
            <InfoRow label="Address" value={vendor.address} />
          </View>
        </View>

        {/* Business */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Business Details</Text>
          <View style={styles.card}>
            <InfoRow label="GSTIN" value={vendor.gstin} />
            <InfoRow label="PAN" value={vendor.pan} />
            <InfoRow label="Added On" value={new Date(vendor.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} />
          </View>
        </View>

        {/* Banking */}
        {hasBanking ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Banking Details</Text>
            <View style={styles.card}>
              <InfoRow label="Bank Name" value={vendor.bankName} />
              <InfoRow label="Account No" value={vendor.accountNumber} />
              <InfoRow label="IFSC Code" value={vendor.ifscCode} />
            </View>
          </View>
        ) : null}

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
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 4, textAlign: 'center' },
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
  card: { backgroundColor: Colors.surface, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  infoLabel: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500', flex: 1 },
  infoValue: { fontSize: 13, color: Colors.textPrimary, fontWeight: '600', textAlign: 'right', flex: 1.5, flexShrink: 1 },
});
