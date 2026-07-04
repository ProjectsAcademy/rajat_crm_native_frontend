import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { vehiclesApi, VehicleDetail, VehicleUsageEntry } from '../../../services/api';
import { Colors } from '../../../constants/colors';

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function expiryChip(label: string, dateStr: string | null) {
  if (!dateStr) return null;
  const days = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
  const expired = days < 0;
  const warn = days >= 0 && days <= 30;
  const bg = expired ? Colors.errorLight : warn ? Colors.warningLight : Colors.successLight;
  const color = expired ? Colors.error : warn ? '#7A5400' : Colors.success;
  return (
    <View style={[styles.chip, { backgroundColor: bg }]} key={label}>
      <Text style={[styles.chipLabel, { color }]}>{label}</Text>
      <Text style={[styles.chipDate, { color }]}>{fmtDate(dateStr)}</Text>
    </View>
  );
}

function Row({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={14} color={Colors.textMuted} style={{ width: 20 }} />
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export default function VehicleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [vehicle, setVehicle] = useState<VehicleDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    vehiclesApi.detail(parseInt(id)).then(r => setVehicle(r.data.vehicle)).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={Colors.accent} /></View>;
  if (!vehicle) return <View style={styles.center}><Text style={styles.emptyText}>Vehicle not found</Text></View>;

  const totalFuel = vehicle.usages.reduce((s, u) => s + parseFloat(u.fuelCost || '0'), 0);
  const totalKm = vehicle.usages.reduce((s, u) => s + parseFloat(u.distanceKm || '0'), 0);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header card */}
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <Text style={styles.vehicleNo}>{vehicle.vehicleNo}</Text>
            <View style={[styles.badge, { backgroundColor: vehicle.isActive ? Colors.successLight : Colors.errorLight }]}>
              <Text style={[styles.badgeText, { color: vehicle.isActive ? Colors.success : Colors.error }]}>
                {vehicle.isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
          <Text style={styles.vehicleName}>
            {[vehicle.make, vehicle.vehicleModel, vehicle.year].filter(Boolean).join(' ') || vehicle.vehicleType}
          </Text>
          <Text style={styles.vehicleType}>{vehicle.vehicleType.toUpperCase()}</Text>
        </View>

        {/* Expiry chips */}
        <View style={styles.chipRow}>
          {expiryChip('Insurance', vehicle.insuranceExpiry)}
          {expiryChip('Permit', vehicle.permitExpiry)}
          {expiryChip('Fitness', vehicle.fitnessExpiry)}
        </View>

        {/* Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          <Row icon="person-outline" label="Driver" value={vehicle.driverName || '—'} />
          <Row icon="call-outline" label="Driver Phone" value={vehicle.driverPhone || '—'} />
          <Row icon="calendar-outline" label="Registered" value={fmtDate(vehicle.registrationDate)} />
          {vehicle.notes ? <Row icon="document-text-outline" label="Notes" value={vehicle.notes} /> : null}
        </View>

        {/* Usage summary */}
        <View style={styles.summaryBar}>
          <View style={styles.sumItem}>
            <Text style={styles.sumValue}>{vehicle.usages.length}</Text>
            <Text style={styles.sumLabel}>Trips</Text>
          </View>
          <View style={[styles.sumItem, styles.sumBorder]}>
            <Text style={styles.sumValue}>{totalKm.toFixed(0)}</Text>
            <Text style={styles.sumLabel}>Total km</Text>
          </View>
          <View style={styles.sumItem}>
            <Text style={styles.sumValue}>₹{totalFuel.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
            <Text style={styles.sumLabel}>Fuel cost</Text>
          </View>
        </View>

        {/* Usage log */}
        {vehicle.usages.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Usage</Text>
            {vehicle.usages.map((u: VehicleUsageEntry) => (
              <View key={u.id} style={styles.usageCard}>
                <View style={styles.usageTop}>
                  <Text style={styles.usageDate}>
                    {new Date(u.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                  </Text>
                  {u.distanceKm ? <Text style={styles.usageKm}>{parseFloat(u.distanceKm).toFixed(1)} km</Text> : null}
                  {parseFloat(u.fuelCost) > 0 ? (
                    <Text style={styles.usageFuel}>₹{parseFloat(u.fuelCost).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
                  ) : null}
                </View>
                {u.purpose ? <Text style={styles.usagePurpose} numberOfLines={2}>{u.purpose}</Text> : null}
                {u.project ? (
                  <View style={styles.metaItem}>
                    <Ionicons name="briefcase-outline" size={11} color={Colors.textMuted} />
                    <Text style={styles.metaText}>{u.project.projectNo} — {u.project.name}</Text>
                  </View>
                ) : null}
                {u.driverName ? (
                  <View style={styles.metaItem}>
                    <Ionicons name="person-outline" size={11} color={Colors.textMuted} />
                    <Text style={styles.metaText}>{u.driverName}</Text>
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 14, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: Colors.textSecondary },

  headerCard: { backgroundColor: Colors.surface, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, padding: 16 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  vehicleNo: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  vehicleName: { fontSize: 14, color: Colors.textSecondary, marginBottom: 2 },
  vehicleType: { fontSize: 10, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '700' },

  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { borderRadius: 8, padding: 10, minWidth: 90, alignItems: 'center' },
  chipLabel: { fontSize: 10, fontWeight: '700', marginBottom: 2 },
  chipDate: { fontSize: 12, fontWeight: '600' },

  summaryBar: {
    flexDirection: 'row', backgroundColor: Colors.primary,
    borderRadius: 10, paddingVertical: 12,
  },
  sumItem: { flex: 1, alignItems: 'center' },
  sumBorder: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  sumValue: { fontSize: 18, fontWeight: '800', color: '#fff' },
  sumLabel: { fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 2 },

  section: { backgroundColor: Colors.surface, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, padding: 14 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Colors.border },
  rowLabel: { flex: 1, fontSize: 13, color: Colors.textSecondary, marginLeft: 6 },
  rowValue: { fontSize: 13, color: Colors.textPrimary, fontWeight: '500', flex: 1.5, textAlign: 'right' },

  usageCard: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  usageTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  usageDate: { fontSize: 12, fontWeight: '600', color: Colors.textPrimary, flex: 1 },
  usageKm: { fontSize: 12, color: Colors.info, fontWeight: '600' },
  usageFuel: { fontSize: 12, color: Colors.success, fontWeight: '600' },
  usagePurpose: { fontSize: 12, color: Colors.textSecondary, marginBottom: 3 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  metaText: { fontSize: 11, color: Colors.textMuted },
});
