import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  FlatList, RefreshControl, Platform, Alert,
} from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { adminApi, AdminGroup } from '../../../services/api';
import { Colors } from '../../../constants/colors';
import GroupFormSheet from '../../../components/GroupFormSheet';

function confirm(title: string, message: string, onYes: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onYes();
  } else {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onYes },
    ]);
  }
}

function notify(message: string) {
  if (Platform.OS === 'web') window.alert(message);
  else Alert.alert('Error', message);
}

export default function AdminGroupsScreen() {
  const [groups, setGroups] = useState<AdminGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editGroup, setEditGroup] = useState<AdminGroup | null>(null);

  const fetchGroups = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const { data } = await adminApi.groups.list();
      setGroups(data.groups);
    } catch {
      setError('Could not load groups.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchGroups(true); }, [fetchGroups]));

  const handleDelete = (group: AdminGroup) => {
    const doDelete = async (force: boolean) => {
      try {
        await adminApi.groups.remove(group.id, force);
        fetchGroups(true);
      } catch (e: any) {
        const msg = e?.response?.data?.error ?? 'Failed to delete group.';
        // Backend refuses when the group still has members — offer a forced delete
        if (!force && e?.response?.status === 400 && msg.includes('member')) {
          confirm(
            'Group Has Members',
            `${msg}\nMembers will lose this group's access. Delete anyway?`,
            () => doDelete(true)
          );
        } else {
          notify(msg);
        }
      }
    };
    confirm('Delete Group', `Delete "${group.name}" permanently?`, () => doDelete(false));
  };

  const renderGroup = ({ item }: { item: AdminGroup }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => { setEditGroup(item); setShowForm(true); }}
      activeOpacity={0.75}
    >
      <View style={styles.iconBox}>
        <Ionicons name="people-circle-outline" size={22} color={Colors.info} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{item.name}</Text>
        {!!item.description && <Text style={styles.sub}>{item.description}</Text>}
        <Text style={styles.meta}>
          {item.memberCount} member{item.memberCount === 1 ? '' : 's'} · {item.features.length} module{item.features.length === 1 ? '' : 's'}
        </Text>
      </View>
      <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)} hitSlop={8}>
        <Ionicons name="trash-outline" size={18} color={Colors.error} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.safe}>
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.accent} /></View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={36} color={Colors.textMuted} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchGroups()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(g) => String(g.id)}
          renderItem={renderGroup}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="people-circle-outline" size={40} color={Colors.textMuted} />
              <Text style={styles.errorText}>No groups yet. Create one to start assigning module access.</Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchGroups(true); }}
              tintColor={Colors.accent}
            />
          }
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => { setEditGroup(null); setShowForm(true); }}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color="#111" />
      </TouchableOpacity>

      <GroupFormSheet
        visible={showForm}
        onClose={() => setShowForm(false)}
        onSaved={() => fetchGroups(true)}
        group={editGroup}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 32 },
  errorText: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center' },
  retryBtn:  { marginTop: 6, backgroundColor: Colors.accent, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 6 },
  retryText: { color: '#111', fontWeight: '700', fontSize: 14 },

  list: { padding: 14, gap: 10, paddingBottom: 90, flexGrow: 1 },
  card: {
    backgroundColor: Colors.surface, borderRadius: 10, borderWidth: 1,
    borderColor: Colors.border, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  iconBox: {
    width: 42, height: 42, borderRadius: 10,
    backgroundColor: Colors.infoLight, justifyContent: 'center', alignItems: 'center',
  },
  name: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  sub:  { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  meta: { fontSize: 11, color: Colors.textMuted, marginTop: 4 },
  deleteBtn: {
    width: 36, height: 36, borderRadius: 8, borderWidth: 1,
    borderColor: Colors.error + '40', backgroundColor: Colors.errorLight,
    justifyContent: 'center', alignItems: 'center',
  },

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
