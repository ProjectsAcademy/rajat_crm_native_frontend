import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { router, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore, userHasFeature } from '../store/auth';
import { Colors } from '../constants/colors';

// Desktop & tablet/mobile-web top navigation bar. Replaces the bottom tab bar
// on web only — native keeps the standard tabs. Rendered by app/(app)/_layout.tsx.
// On narrow web viewports (< 768px), collapses into a responsive hamburger menu.

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
  const { width } = useWindowDimensions();
  const [menuOpen, setMenuOpen] = useState(false);

  const isMobile = width < 768;
  const isCompactTablet = width >= 768 && width < 960;

  // Auto-close menu when navigating or resizing to desktop
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isMobile) {
      setMenuOpen(false);
    }
  }, [isMobile]);

  const isActive = (link: NavLink) =>
    link.path === '/' ? pathname === '/' : pathname.startsWith(link.path);

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  const initials = (user?.username ?? '?').slice(0, 2).toUpperCase();
  const role = user?.isSuperuser ? 'Administrator' : 'User';
  const accessibleLinks = LINKS.filter(
    (l) => !l.features || l.features.some((f) => userHasFeature(user, f))
  );

  return (
    <View style={styles.bar}>
      <View
        style={[
          styles.inner,
          isCompactTablet && styles.innerCompact,
          isMobile && styles.innerMobile,
        ]}
      >
        {/* Brand */}
        <TouchableOpacity
          style={[styles.brand, isCompactTablet && styles.brandCompact]}
          onPress={() => {
            setMenuOpen(false);
            router.push('/(app)' as any);
          }}
          activeOpacity={0.8}
        >
          <View style={styles.logo}>
            <Ionicons name="flash" size={17} color={Colors.primary} />
          </View>
          <View>
            <Text style={styles.brandText}>RAJAT ELECTRICALS</Text>
            <Text style={styles.brandSub}>BUSINESS SUITE</Text>
          </View>
        </TouchableOpacity>

        {isMobile ? (
          <>
            <View style={{ flex: 1 }} />
            <TouchableOpacity
              style={styles.hamburgerBtn}
              onPress={() => setMenuOpen((prev) => !prev)}
              accessibilityLabel={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              activeOpacity={0.7}
            >
              <Ionicons
                name={menuOpen ? 'close-outline' : 'menu-outline'}
                size={26}
                color="#fff"
              />
            </TouchableOpacity>
          </>
        ) : (
          <>
            {/* Primary desktop links */}
            <View style={styles.links}>
              {accessibleLinks.map((link) => {
                const active = isActive(link);
                return (
                  <TouchableOpacity
                    key={link.label}
                    style={[
                      styles.link,
                      isCompactTablet && styles.linkCompact,
                      active && styles.linkActive,
                    ]}
                    onPress={() => router.push(link.route as any)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={link.icon}
                      size={15}
                      color={active ? Colors.accent : 'rgba(255,255,255,0.7)'}
                    />
                    <Text style={[styles.linkText, active && styles.linkTextActive]}>
                      {link.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={{ flex: 1 }} />

            {/* Right actions */}
            {user?.isSuperuser && (
              <TouchableOpacity
                style={[
                  styles.link,
                  styles.linkStretch,
                  isCompactTablet && styles.linkCompact,
                  pathname.startsWith('/admin') && styles.linkActive,
                ]}
                onPress={() => router.push('/(app)/admin' as any)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="settings-outline"
                  size={15}
                  color={pathname.startsWith('/admin') ? Colors.accent : 'rgba(255,255,255,0.7)'}
                />
                <Text style={[styles.linkText, pathname.startsWith('/admin') && styles.linkTextActive]}>
                  Admin
                </Text>
              </TouchableOpacity>
            )}
            <View style={[styles.divider, isCompactTablet && styles.dividerCompact]} />
            <View style={styles.userChip}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
              <View>
                <Text style={styles.userText}>{user?.username ?? ''}</Text>
                <Text style={styles.userRole}>{role}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[
                styles.link,
                styles.linkStretch,
                isCompactTablet && styles.linkCompact,
                { marginLeft: 6 },
              ]}
              onPress={handleLogout}
              activeOpacity={0.7}
            >
              <Ionicons name="log-out-outline" size={15} color="rgba(255,255,255,0.7)" />
              <Text style={styles.linkText}>Sign out</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Mobile drawer / dropdown */}
      {isMobile && menuOpen && (
        <>
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={() => setMenuOpen(false)}
          />
          <View style={styles.mobileMenu}>
            <View style={styles.mobileLinksList}>
              {accessibleLinks.map((link) => {
                const active = isActive(link);
                return (
                  <TouchableOpacity
                    key={link.label}
                    style={[styles.mobileLinkItem, active && styles.mobileLinkItemActive]}
                    onPress={() => {
                      setMenuOpen(false);
                      router.push(link.route as any);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.mobileIconWrap, active && styles.mobileIconWrapActive]}>
                      <Ionicons
                        name={link.icon}
                        size={18}
                        color={active ? Colors.accent : 'rgba(255,255,255,0.7)'}
                      />
                    </View>
                    <Text
                      style={[
                        styles.mobileLinkLabel,
                        active && styles.mobileLinkLabelActive,
                      ]}
                    >
                      {link.label}
                    </Text>
                    {active && (
                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color={Colors.accent}
                        style={{ marginLeft: 'auto' }}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}

              {user?.isSuperuser && (
                <TouchableOpacity
                  style={[
                    styles.mobileLinkItem,
                    pathname.startsWith('/admin') && styles.mobileLinkItemActive,
                  ]}
                  onPress={() => {
                    setMenuOpen(false);
                    router.push('/(app)/admin' as any);
                  }}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.mobileIconWrap,
                      pathname.startsWith('/admin') && styles.mobileIconWrapActive,
                    ]}
                  >
                    <Ionicons
                      name="settings-outline"
                      size={18}
                      color={
                        pathname.startsWith('/admin')
                          ? Colors.accent
                          : 'rgba(255,255,255,0.7)'
                      }
                    />
                  </View>
                  <Text
                    style={[
                      styles.mobileLinkLabel,
                      pathname.startsWith('/admin') && styles.mobileLinkLabelActive,
                    ]}
                  >
                    Admin
                  </Text>
                  {pathname.startsWith('/admin') && (
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={Colors.accent}
                      style={{ marginLeft: 'auto' }}
                    />
                  )}
                </TouchableOpacity>
              )}
            </View>

            {/* Mobile drawer footer: user chip + logout */}
            <View style={styles.mobileFooter}>
              <View style={styles.mobileUserRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.userText}>{user?.username ?? ''}</Text>
                  <Text style={styles.userRole}>{role}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.mobileSignOutBtn}
                onPress={() => {
                  setMenuOpen(false);
                  handleLogout();
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="log-out-outline" size={16} color="rgba(255,255,255,0.85)" />
                <Text style={styles.mobileSignOutText}>Sign out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: Colors.primary,
    borderBottomWidth: 3,
    borderBottomColor: Colors.accent,
    zIndex: 100,
    ...Platform.select({
      web: { position: 'relative' },
    }),
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
  innerCompact: {
    paddingHorizontal: 16,
  },
  innerMobile: {
    paddingHorizontal: 16,
    height: 56,
  },

  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    marginRight: 38,
  },
  brandCompact: {
    marginRight: 16,
  },
  logo: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.1,
  },
  brandSub: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.6,
    marginTop: 2,
  },

  // Desktop links row
  links: {
    flexDirection: 'row',
    alignItems: 'stretch',
    alignSelf: 'stretch',
    gap: 2,
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 15,
  },
  linkCompact: {
    paddingHorizontal: 9,
    gap: 4,
  },
  linkStretch: {
    alignSelf: 'stretch',
  },
  linkActive: {
    backgroundColor: 'rgba(255,153,0,0.14)',
    ...Platform.select({
      web: { boxShadow: `inset 0 -3px 0 0 ${Colors.accent}` },
      default: { borderBottomWidth: 3, borderBottomColor: Colors.accent },
    }),
  },
  linkText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  linkTextActive: {
    color: '#fff',
    fontWeight: '800',
  },

  divider: {
    width: 1,
    height: 22,
    backgroundColor: 'rgba(255,255,255,0.16)',
    marginHorizontal: 14,
  },
  dividerCompact: {
    marginHorizontal: 8,
  },
  userChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 28,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
  },
  avatarText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.accent,
    letterSpacing: 0.5,
  },
  userText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  userRole: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 1,
  },

  // Mobile hamburger toggle button
  hamburgerBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
  },

  // Mobile backdrop & dropdown drawer
  backdrop: {
    ...Platform.select({
      web: {
        position: 'fixed' as any,
        top: 56,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.4)',
        zIndex: 190,
      },
      default: {
        position: 'absolute',
        top: 56,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 190,
      },
    }),
  },
  mobileMenu: {
    position: 'absolute',
    top: 56,
    left: 0,
    right: 0,
    backgroundColor: Colors.primary,
    borderBottomWidth: 3,
    borderBottomColor: Colors.accent,
    zIndex: 200,
    paddingTop: 8,
    ...Platform.select({
      web: {
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
      },
      default: {
        elevation: 8,
      },
    }),
  },
  mobileLinksList: {
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 2,
  },
  mobileLinkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 12,
  },
  mobileLinkItemActive: {
    backgroundColor: 'rgba(255,153,0,0.12)',
  },
  mobileIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mobileIconWrapActive: {
    backgroundColor: 'rgba(255,153,0,0.18)',
  },
  mobileLinkLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  mobileLinkLabelActive: {
    color: '#fff',
    fontWeight: '800',
  },

  mobileFooter: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  mobileUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  mobileSignOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minHeight: 40,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  mobileSignOutText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
});
