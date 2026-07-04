import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  FlatList, RefreshControl, Platform,
} from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { adminApi, AdminUser } from '../../../services/api';
import { Colors } from '../../../constants/colors';
import UserFormSheet from '../../../components/UserFormSheet';

export default function AdminUsersScreen() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);

  const fetchUsers = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const { data } = await adminApi.users.list();
      setUsers(data.users);
    } catch {
      setError('Could not load users.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchUsers(true); }, [fetchUsers]));

  const openCreate = () => { setEditUser(null); setShowForm(true); };
  const openEdit = (u: AdminUser) => { setEditUser(u); setShowForm(true); };

  const renderUser = ({ item }: { item: AdminUser }) => {
    const fullName = `${item.firstName} ${item.lastName}`.trim();
    return (
      <TouchableOpacity style={styles.card} onPress={() => openEdit(item)} activeOpacity={0.75}>
        <View style={[styles.avatar, !item.isActive && { backgroundColor: Colors.errorLight }]}>
          <Ionicons
            name={item.isSuperuser ? 'shield-checkmark' : 'person'}
            size={20}
            color={!item.isActive ? Colors.error : item.isSuperuser ? Colors.accent : Colors.info}
          />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.nameRow}>
            <Text style={styles.username}>{item.username}</Text>
            {item.isSuperuser && <View style={[styles.badge, { backgroundColor: Colors.warningLight }]}><Text style={[styles.badgeText, { color: '#7A5400' }]}>Super Admin</Text></View>}
            {!item.isActive && <View style={[styles.badge, { backgroundColor: Colors.errorLight }]}><Text style={[styles.badgeText, { color: Colors.error }]}>Disabled</Text></View>}
          </View>
          {!!fullName && <Text style={styles.sub}>{fullName}</Text>}
          <View style={styles.groupRow}>
            {item.isSuperuser ? (
              <Text style={styles.groupHint}>Full access to all modules</Text>
            ) : item.groups.length === 0 ? (
              <Text style={styles.groupHint}>No groups — legacy full access</Text>
            ) : (
              item.groups.map((g) => (
                <View key={g.id} style={styles.groupChip}>
                  <Text style={styles.groupChipText}>{g.name}</Text>
                </View>
              ))
            )}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.safe}>
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.accent} /></View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={36} color={Colors.textMuted} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchUsers()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(u) => String(u.id)}
          renderItem={renderUser}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchUsers(true); }}
              tintColor={Colors.accent}
            />
          }
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={openCreate} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color="#111" />
      </TouchableOpacity>

      <UserFormSheet
        visible={showForm}
        onClose={() => setShowForm(false)}
        onSaved={() => fetchUsers(true)}
        user={editUser}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 32 },
  errorText: { fontSize: 13, color: Colors.textSecondary },
  retryBtn:  { marginTop: 6, backgroundColor: Colors.accent, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 6 },
  retryText: { color: '#111', fontWeight: '700', fontSize: 14 },

  list: { padding: 14, gap: 10, paddingBottom: 90 },
  card: {
    backgroundColor: Colors.surface, borderRadius: 10, borderWidth: 1,
    borderColor: Colors.border, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  avatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: Colors.infoLight, justifyContent: 'center', alignItems: 'center',
  },
  nameRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  username: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  sub:      { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  badge:     { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 4 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  groupRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  groupChip: { backgroundColor: Colors.accentLight, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  groupChipText: { fontSize: 11, fontWeight: '600', color: '#7A5400' },
  groupHint: { fontSize: 11, color: Colors.textMuted, fontStyle: 'italic' },

  fab: {
    position: 'absolute', right: 20, bottom: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.accent, justifyContent: 'center', alignItems: 'center',
    elevation: 6,
    ...Platform.select({
      web: { boxShadow: '0 4px 12px rgba(0,0,0,0.25)' },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12 },
    }),
  },
});
