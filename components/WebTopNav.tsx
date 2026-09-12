import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
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

  const initials = (user?.username ?? '?').slice(0, 2).toUpperCase();
  const role = user?.isSuperuser ? 'Administrator' : 'User';

  return (
    <View style={styles.bar}>
      <View style={styles.inner}>
        {/* Brand */}
        <TouchableOpacity style={styles.brand} onPress={() => router.push('/(app)' as any)} activeOpacity={0.8}>
          <View style={styles.logo}>
            <Ionicons name="flash" size={17} color={Colors.primary} />
          </View>
          <View>
            <Text style={styles.brandText}>RAJAT ELECTRICALS</Text>
            <Text style={styles.brandSub}>BUSINESS SUITE</Text>
          </View>
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
            style={[styles.link, styles.linkStretch, pathname.startsWith('/admin') && styles.linkActive]}
            onPress={() => router.push('/(app)/admin' as any)}
            activeOpacity={0.7}
          >
            <Ionicons name="settings-outline" size={15} color={pathname.startsWith('/admin') ? Colors.accent : 'rgba(255,255,255,0.7)'} />
            <Text style={[styles.linkText, pathname.startsWith('/admin') && styles.linkTextActive]}>Admin</Text>
          </TouchableOpacity>
        )}
        <View style={styles.divider} />
        <View style={styles.userChip}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View>
          <View>
            <Text style={styles.userText}>{user?.username ?? ''}</Text>
            <Text style={styles.userRole}>{role}</Text>
          </View>
        </View>
        <TouchableOpacity style={[styles.link, styles.linkStretch, { marginLeft: 6 }]} onPress={handleLogout} activeOpacity={0.7}>
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
    borderBottomWidth: 3,
    borderBottomColor: Colors.accent,
    zIndex: 10,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 58,
    paddingHorizontal: 28,
    gap: 2,
    width: '100%',
    maxWidth: 1440,
    alignSelf: 'center',
  },

  brand:     { flexDirection: 'row', alignItems: 'center', gap: 11, marginRight: 38 },
  logo:      { width: 30, height: 30, borderRadius: 8, backgroundColor: Colors.accent, justifyContent: 'center', alignItems: 'center' },
  brandText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: -0.1 },
  brandSub:  { color: 'rgba(255,255,255,0.45)', fontSize: 9, fontWeight: '700', letterSpacing: 1.6, marginTop: 2 },

  // alignSelf: 'stretch' pulls this row to the bar's full 58px height (its
  // parent `inner` centers everything else) so each `link`/`linkActive`
  // below — itself stretched by this row's own alignItems — becomes a
  // full-height block instead of shrink-wrapping to its text/icon.
  links: { flexDirection: 'row', alignItems: 'stretch', alignSelf: 'stretch', gap: 2 },
  link: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 15,
  },
  // For a `link` rendered directly in `inner` (Admin, Sign out) rather than
  // inside the `links` row above — `inner` only vertically centers its
  // children, so without this such a button shrink-wraps to its own text
  // height instead of the bar's, and linkActive's highlight then covers
  // just that short box instead of the full-height tab look every other
  // active link gets.
  linkStretch: { alignSelf: 'stretch' },
  linkActive: {
    backgroundColor: 'rgba(255,153,0,0.14)',
    ...Platform.select({
      web: { boxShadow: `inset 0 -3px 0 0 ${Colors.accent}` },
      default: { borderBottomWidth: 3, borderBottomColor: Colors.accent },
    }),
  },
  linkText:       { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },
  linkTextActive: { color: '#fff', fontWeight: '800' },

  divider:  { width: 1, height: 22, backgroundColor: 'rgba(255,255,255,0.16)', marginHorizontal: 14 },
  userChip: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar:     { width: 28, height: 28, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 11, fontWeight: '800', color: Colors.accent, letterSpacing: 0.5 },
  userText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  userRole: { fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 1 },
});
