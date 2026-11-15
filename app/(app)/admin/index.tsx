import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useState, useCallback } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { adminApi } from '../../../services/api';
import { Colors } from '../../../constants/colors';

// Admin hub (super admin only): users, groups, roles, effective access and
// the activity log (docs/shared/PERMISSIONS_PLAN.md §7).
export default function AdminHubScreen() {
  const [counts, setCounts] = useState<{ users?: number; groups?: number; roles?: number }>({});

  useFocusEffect(
    useCallback(() => {
      adminApi.users.list().then(({ data }) => setCounts((c) => ({ ...c, users: data.total }))).catch(() => {});
      adminApi.groups.list().then(({ data }) => setCounts((c) => ({ ...c, groups: data.total }))).catch(() => {});
      adminApi.roles.list().then(({ data }) => setCounts((c) => ({ ...c, roles: data.total }))).catch(() => {});
    }, [])
  );

  const cards: { route: string; icon: React.ComponentProps<typeof Ionicons>['name']; title: string; count?: number; sub: string; color: string; bg: string }[] = [
    { route: 'users', icon: 'person-outline', title: 'Users', count: counts.users, sub: 'accounts · passwords · their groups and own roles', color: Colors.accent, bg: Colors.accentLight },
    { route: 'groups', icon: 'people-circle-outline', title: 'Groups', count: counts.groups, sub: 'sets of users · the roles each group gets', color: Colors.info, bg: Colors.infoLight },
    { route: 'roles', icon: 'key-outline', title: 'Roles & Permissions', count: counts.roles, sub: 'what a role may do: view · create · edit · delete · each action', color: Colors.success, bg: Colors.successLight },
    { route: 'access', icon: 'shield-checkmark-outline', title: 'Effective Access', sub: 'what one user can do, and why · "Can X do Y?"', color: '#6A1B9A', bg: '#F3E5F5' },
    { route: 'audit', icon: 'time-outline', title: 'Activity Log', sub: 'every login and change, refused attempts too', color: '#7A5400', bg: Colors.warningLight },
  ];

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.intro}>
        Users belong to groups; groups and users get roles; a role says what may be done in each module.
        A Deny in any role wins over every Allow.
      </Text>

      {cards.map((c) => (
        <TouchableOpacity key={c.route} style={[styles.card, { borderLeftColor: c.color }]} onPress={() => router.push(`/(app)/admin/${c.route}` as any)} activeOpacity={0.8}>
          <View style={[styles.iconBox, { backgroundColor: c.bg }]}>
            <Ionicons name={c.icon} size={26} color={c.color} />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>{c.title}</Text>
            {c.count !== undefined && <Text style={[styles.cardCount, { color: c.color }]}>{c.count}</Text>}
            <Text style={styles.cardSub}>{c.sub}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
        </TouchableOpacity>
      ))}

      <View style={styles.note}>
        <Ionicons name="information-circle-outline" size={16} color={Colors.textMuted} />
        <Text style={styles.noteText}>
          Super admins always have full access and cannot be limited. Changes reach a signed-in user within a
          minute, or when they reopen the app.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll:  { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, gap: 12 },
  intro:   { fontSize: 13, color: Colors.textSecondary, lineHeight: 19, marginBottom: 4 },
  card: {
    backgroundColor: Colors.surface, borderRadius: 10, borderWidth: 1,
    borderLeftWidth: 4, borderLeftColor: Colors.accent, borderColor: Colors.border,
    padding: 18, flexDirection: 'row', alignItems: 'center', gap: 16,
  },
  iconBox: {
    width: 52, height: 52, borderRadius: 10,
    backgroundColor: Colors.accentLight, justifyContent: 'center', alignItems: 'center',
  },
  cardBody:  { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  cardCount: { fontSize: 28, fontWeight: '800', color: Colors.accent, marginTop: 2 },
  cardSub:   { fontSize: 12, color: Colors.textMuted },
  note: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    backgroundColor: Colors.surface, borderRadius: 8, borderWidth: 1,
    borderColor: Colors.border, padding: 12, marginTop: 4,
  },
  noteText: { flex: 1, fontSize: 12, color: Colors.textMuted, lineHeight: 17 },
});
