import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useState, useCallback } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { adminApi } from '../../../services/api';
import { Colors } from '../../../constants/colors';

export default function AdminHubScreen() {
  const [userCount, setUserCount] = useState<number | null>(null);
  const [groupCount, setGroupCount] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      adminApi.users.list().then(({ data }) => setUserCount(data.total)).catch(() => {});
      adminApi.groups.list().then(({ data }) => setGroupCount(data.total)).catch(() => {});
    }, [])
  );

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.intro}>
        Manage who can sign in and which modules each group of users can access.
      </Text>

      <TouchableOpacity style={styles.card} onPress={() => router.push('/(app)/admin/users' as any)} activeOpacity={0.8}>
        <View style={styles.iconBox}>
          <Ionicons name="person-outline" size={26} color={Colors.accent} />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>Users</Text>
          <Text style={styles.cardCount}>{userCount ?? '—'}</Text>
          <Text style={styles.cardSub}>create accounts · reset passwords · assign groups</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.card} onPress={() => router.push('/(app)/admin/groups' as any)} activeOpacity={0.8}>
        <View style={[styles.iconBox, { backgroundColor: Colors.infoLight }]}>
          <Ionicons name="people-circle-outline" size={26} color={Colors.info} />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>Groups & Permissions</Text>
          <Text style={[styles.cardCount, { color: Colors.info }]}>{groupCount ?? '—'}</Text>
          <Text style={styles.cardSub}>define which modules each group can access</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
      </TouchableOpacity>

      <View style={styles.note}>
        <Ionicons name="information-circle-outline" size={16} color={Colors.textMuted} />
        <Text style={styles.noteText}>
          Super admins always have full access. Users without any group keep full
          access until strict mode is enabled on the server.
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
