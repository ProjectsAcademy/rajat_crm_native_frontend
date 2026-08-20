import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore, userHasFeature } from '../store/auth';
import { Colors } from '../constants/colors';

// Desktop-web top navigation bar. Replaces the bottom tab bar on web only —
// native keeps the standard tabs. Rendered by app/(app)/_layout.tsx.

type NavLink = {
  label: string;
  path: string;                 // pathname prefix used for the active state
  route: string;                // expo-router push target
  icon: React.ComponentProps<typeof Ionicons>['name'];
  features?: string[];          // hidden unless the user has one of these
};

const LINKS: NavLink[] = [
  { label: 'Home',      path: '/',          route: '/(app)',           icon: 'grid-outline' },
  { label: 'Work',      path: '/work',      route: '/(app)/work',      icon: 'briefcase-outline' },
  { label: 'People',    path: '/people',    route: '/(app)/people',    icon: 'people-outline' },
  { label: 'Inventory', path: '/inventory', route: '/(app)/inventory', icon: 'cube-outline', features: ['inventory', 'stock'] },
  { label: 'Finance',   path: '/finance',   route: '/(app)/finance',   icon: 'wallet-outline' },
];

export default function WebTopNav() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const isActive = (link: NavLink) =>
    link.path === '/' ? pathname === '/' : pathname.startsWith(link.path);

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <View style={styles.bar}>
      <View style={styles.inner}>
        {/* Brand */}
        <TouchableOpacity style={styles.brand} onPress={() => router.push('/(app)' as any)} activeOpacity={0.8}>
          <View style={styles.logo}>
            <Ionicons name="flash" size={15} color={Colors.accent} />
          </View>
          <Text style={styles.brandText}>Rajat Electricals</Text>
        </TouchableOpacity>

        {/* Primary links */}
        <View style={styles.links}>
          {LINKS.filter((l) => !l.features || l.features.some((f) => userHasFeature(user, f))).map((link) => {
            const active = isActive(link);
            return (
              <TouchableOpacity
                key={link.label}
                style={[styles.link, active && styles.linkActive]}
                onPress={() => router.push(link.route as any)}
                activeOpacity={0.7}
              >
                <Ionicons name={link.icon} size={15} color={active ? Colors.accent : 'rgba(255,255,255,0.7)'} />
                <Text style={[styles.linkText, active && styles.linkTextActive]}>{link.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ flex: 1 }} />

        {/* Right actions */}
        {user?.isSuperuser && (
          <TouchableOpacity
            style={[styles.link, pathname.startsWith('/admin') && styles.linkActive]}
            onPress={() => router.push('/(app)/admin' as any)}
            activeOpacity={0.7}
          >
            <Ionicons name="settings-outline" size={15} color={pathname.startsWith('/admin') ? Colors.accent : 'rgba(255,255,255,0.7)'} />
            <Text style={[styles.linkText, pathname.startsWith('/admin') && styles.linkTextActive]}>Admin</Text>
          </TouchableOpacity>
        )}
        <View style={styles.divider} />
        <Text style={styles.userText}>{user?.username ?? ''}</Text>
        <TouchableOpacity style={styles.link} onPress={handleLogout} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={15} color="rgba(255,255,255,0.7)" />
          <Text style={styles.linkText}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: Colors.primary,
    borderBottomWidth: 2,
    borderBottomColor: Colors.accent,
    zIndex: 10,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    paddingHorizontal: 24,
    gap: 4,
    width: '100%',
    maxWidth: 1400,
    alignSelf: 'center',
  },

  brand:     { flexDirection: 'row', alignItems: 'center', gap: 9, marginRight: 28 },
  logo:      { width: 26, height: 26, borderRadius: 6, backgroundColor: 'rgba(255,153,0,0.15)', justifyContent: 'center', alignItems: 'center' },
  brandText: { color: '#fff', fontSize: 14, fontWeight: '700', letterSpacing: 0.2 },

  links: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  link: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 6,
  },
  linkActive:     { backgroundColor: 'rgba(255,153,0,0.12)' },
  linkText:       { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },
  linkTextActive: { color: Colors.accent },

  divider:  { width: 1, height: 20, backgroundColor: 'rgba(255,255,255,0.15)', marginHorizontal: 10 },
  userText: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginRight: 6 },
});
