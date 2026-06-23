import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { COLORS, RADIUS, FONTS } from '@/constants/design';
import { useAuthStore } from '@/stores/useAuthStore';

export default function CoachLayout() {
  const { role } = useAuthStore();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.card,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.muted,
        tabBarLabelStyle: { fontSize: 11, fontFamily: FONTS.semibold, fontWeight: '600', marginTop: 2 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Dashboard',
        tabBarIcon: ({ color }) => (
          <View style={[styles.icon, { borderColor: color }]}>
            <View style={[styles.iconInner, { backgroundColor: color }]} />
          </View>
        ),
      }} />
      <Tabs.Screen name="scan" options={{ title: 'Scan QR', href: role === 'admin' ? null : '/(coach)/scan',
        tabBarIcon: ({ color }) => (
          <View style={[styles.scanIcon, { borderColor: color }]}>
            <View style={[styles.scanDot, { backgroundColor: color }]} />
          </View>
        ),
      }} />

      <Tabs.Screen name="users" options={{ title: 'Users', href: role === 'admin' ? '/(coach)/users' : null,
        tabBarIcon: ({ color }) => (
          <View style={[styles.icon, { borderColor: color, borderRadius: 11 }]}>
            <View style={[styles.iconInner, { backgroundColor: color, borderRadius: 4, height: 6 }]} />
          </View>
        ),
      }} />

      <Tabs.Screen name="consolidated" options={{ title: 'Rankings', href: role === 'admin' ? '/(coach)/consolidated' : null,
        tabBarIcon: ({ color }) => (
          <View style={[styles.icon, { borderColor: color, borderRadius: 11, transform: [{ rotate: '45deg' }] }]}>
            <View style={[styles.iconInner, { backgroundColor: color, borderRadius: 4, height: 6 }]} />
          </View>
        ),
      }} />

      <Tabs.Screen name="events" options={{ title: 'Events',
        tabBarIcon: ({ color }) => (
          <View style={[styles.calIcon, { borderColor: color }]}>
            <View style={[styles.calDot, { backgroundColor: color }]} />
          </View>
        ),
      }} />
      <Tabs.Screen name="results" options={{ title: 'Results', href: role === 'admin' ? null : '/(coach)/results',
        tabBarIcon: ({ color }) => (
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2 }}>
            {[10, 16, 12].map((h, i) => (
              <View key={i} style={[styles.bar, { height: h, backgroundColor: color }]} />
            ))}
          </View>
        ),
      }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  icon: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  iconInner: { width: 8, height: 8, borderRadius: 2 },
  scanIcon: { width: 22, height: 22, borderRadius: 6, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  scanDot: { width: 8, height: 8, borderRadius: 4 },
  queueLine: { height: 2.5, width: 22, borderRadius: 2 },
  calIcon: { width: 22, height: 22, borderRadius: 4, borderWidth: 2, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 2 },
  calDot: { width: 8, height: 4, borderRadius: 1 },
  bar: { width: 5, borderRadius: 2 },
});
