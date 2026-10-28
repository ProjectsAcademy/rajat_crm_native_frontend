import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

export interface ModuleItemConfig {
  key: string;
  kpiKey: string;
  label: string;
  icon: string;
  color: string;
  bg: string;
  route: string;
}

interface ModuleCardProps {
  config: ModuleItemConfig;
  count: number | string;
  phase?: number;
  isMigrated: boolean;
  variant?: 'compact' | 'full';
  onPress: () => void;
  style?: any;
}

export default function ModuleCard({
  config,
  count,
  phase,
  isMigrated,
  variant = 'full',
  onPress,
  style,
}: ModuleCardProps) {
  const { label, icon, color, bg } = config;

  if (variant === 'compact') {
    return (
      <TouchableOpacity
        style={[styles.compactCard, style]}
        activeOpacity={0.75}
        onPress={onPress}
      >
        <View style={[styles.compactIconBox, { backgroundColor: bg }]}>
          <Ionicons name={icon as any} size={20} color={color} />
        </View>

        <View style={styles.compactContent}>
          <Text style={styles.compactCount} numberOfLines={1}>
            {count}
          </Text>
          <Text style={styles.compactLabel} numberOfLines={1}>
            {label}
          </Text>
        </View>

        <View style={styles.compactRight}>
          {!isMigrated ? (
            <View style={[styles.badge, styles.badgePhase]}>
              <Text style={styles.badgeTextPhase}>P{phase}</Text>
            </View>
          ) : (
            <View style={[styles.badge, styles.badgeActive]}>
              <Text style={styles.badgeTextActive}>ACTIVE</Text>
            </View>
          )}
          <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.fullCard, style]}
      activeOpacity={0.75}
      onPress={onPress}
    >
      <View style={styles.fullHeader}>
        <View style={[styles.fullIconBox, { backgroundColor: bg }]}>
          <Ionicons name={icon as any} size={22} color={color} />
        </View>
        {!isMigrated ? (
          <View style={[styles.badge, styles.badgePhase]}>
            <Text style={styles.badgeTextPhase}>Phase {phase}</Text>
          </View>
        ) : (
          <View style={[styles.badge, styles.badgeActive]}>
            <Text style={styles.badgeTextActive}>Active</Text>
          </View>
        )}
      </View>

      <View style={styles.fullBody}>
        <Text style={styles.fullCount} numberOfLines={1}>
          {count}
        </Text>
        <Text style={styles.fullLabel} numberOfLines={1}>
          {label}
        </Text>
      </View>

      <View style={[styles.accentStrip, { backgroundColor: color }]} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Compact card (Recently Visited)
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 64,
    gap: 12,
    ...Platform.select({
      web: {
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        transition: 'all 0.15s ease-in-out',
      },
      default: {
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
      },
    }),
  },
  compactIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactContent: {
    flex: 1,
    minWidth: 0,
  },
  compactCount: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  compactLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 2,
  },
  compactRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  // Full card (All Modules)
  fullCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    minHeight: 126,
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        transition: 'all 0.15s ease-in-out',
      },
      default: {
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
      },
    }),
  },
  fullHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  fullIconBox: {
    width: 42,
    height: 42,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullBody: {
    marginTop: 14,
  },
  fullCount: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
    lineHeight: 30,
  },
  fullLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 3,
  },
  accentStrip: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },

  // Badges
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeActive: {
    backgroundColor: Colors.successLight,
  },
  badgeTextActive: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.success,
    letterSpacing: 0.3,
  },
  badgePhase: {
    backgroundColor: '#FFF3CD',
  },
  badgeTextPhase: {
    fontSize: 10,
    fontWeight: '700',
    color: '#7A5400',
    letterSpacing: 0.3,
  },
});
