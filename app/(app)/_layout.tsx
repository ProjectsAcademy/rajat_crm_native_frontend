import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          height: 80,
          paddingBottom: 20,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', lineHeight: 16 },
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700', fontSize: 17 },
        headerShown: false,
      }}
    >
      {/* ── Primary tabs ── */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="work"
        options={{
          title: 'Work',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Ionicons name="briefcase-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="people"
        options={{
          title: 'People',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: 'Inventory',
          tabBarIcon: ({ color, size }) => <Ionicons name="cube-outline" size={size} color={color} />,
        }}
      />

      <Tabs.Screen
        name="finance"
        options={{
          title: 'Finance',
          tabBarIcon: ({ color, size }) => <Ionicons name="wallet-outline" size={size} color={color} />,
        }}
      />

      {/* ── Hidden from tab bar but navigable ── */}
      <Tabs.Screen name="tenders"   options={{ href: null }} />
      <Tabs.Screen name="projects"  options={{ href: null }} />
      <Tabs.Screen name="customers" options={{ href: null }} />
      <Tabs.Screen name="vendors"   options={{ href: null }} />
      <Tabs.Screen name="employees" options={{ href: null }} />
      <Tabs.Screen name="orders"    options={{ href: null }} />
      <Tabs.Screen name="invoices"  options={{ href: null }} />
      <Tabs.Screen name="purchases" options={{ href: null }} />
      <Tabs.Screen name="hr"                    options={{ href: null }} />
      <Tabs.Screen name="hr/index"              options={{ href: null }} />
      <Tabs.Screen name="hr/attendance"         options={{ href: null }} />
      <Tabs.Screen name="hr/salary-payments"    options={{ href: null }} />
      <Tabs.Screen name="hr/salary-components"  options={{ href: null }} />
      <Tabs.Screen name="hr/incentives"         options={{ href: null }} />
      <Tabs.Screen name="hr/epf-esic"           options={{ href: null }} />
    </Tabs>
  );
}
