import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

// Desktop-web layout for the hub tabs (Work / People / Finance). Native
// keeps each hub's own mobile layout — render this only when
// Platform.OS === 'web'. Mirrors the dashboard's centered column + compact
// stat-card grid so all top-level pages feel like one app.

export interface HubCard {
  key: string;
  label: string;
  sub?: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  bg: string;
  route: string;
  count: number | null;
}

interface Props {
  title: string;
  subtitle: string;
  loading: boolean;
  cards: HubCard[];
  emptyMessage: string;
}

export default function WebHubPage({ title, subtitle, loading, cards, emptyMessage }: Props) {
  return (
    <View style={styles.safe}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>

        {loading ? (
          <ActivityIndicator size="large" color={Colors.accent} style={{ marginTop: 60, alignSelf: 'center' }} />
        ) : cards.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="lock-closed-outline" size={32} color={Colors.textMuted} />
            <Text style={styles.emptyText}>{emptyMessage}</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {cards.map((c) => (
              <TouchableOpacity
                key={c.key}
                style={styles.card}
                onPress={() => router.push(c.route as any)}
                activeOpacity={0.75}
              >
                <View style={[styles.iconBox, { backgroundColor: c.bg }]}>
                  <Ionicons name={c.icon} size={20} color={c.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.count}>{c.count ?? '—'}</Text>
                  <Text style={styles.label}>{c.label}</Text>
                  {!!c.sub && <Text style={styles.sub}>{c.sub}</Text>}
                </View>
                <Ionicons name="chevron-forward" size={14} color={Colors.border} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  page: { alignSelf: 'center', width: '100%', maxWidth: 1240, paddingHorizontal: 32, paddingTop: 26, paddingBottom: 40 },

  title:    { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  subtitle: { fontSize: 12, color: Colors.textSecondary, marginTop: 2, marginBottom: 22 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  card: {
    flexGrow: 1, flexBasis: 230, maxWidth: 300,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: 8, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14, paddingVertical: 14,
    ...Platform.select({ web: { boxShadow: '0 1px 2px rgba(0,0,0,0.04)' } }),
  },
  iconBox: { width: 40, height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  count: { fontSize: 19, fontWeight: '800', color: Colors.textPrimary, lineHeight: 23 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary, marginTop: 1 },
  sub:   { fontSize: 11, color: Colors.textMuted, marginTop: 1 },

  emptyBox:  { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { fontSize: 13, color: Colors.textMuted, textAlign: 'center' },
});
