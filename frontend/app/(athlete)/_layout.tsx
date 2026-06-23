import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { COLORS, RADIUS, FONTS } from '@/constants/design';

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <View style={[styles.iconContainer, focused && styles.iconActive]}>
      <View style={{ opacity: focused ? 1 : 0.6 }}>
        {/* We use emoji as icons to avoid vector icon dependency issues on web */}
      </View>
    </View>
  );
}

export default function AthleteLayout() {
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
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: FONTS.semibold, fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'My QR',
          tabBarIcon: ({ color }) => (
            <View style={{ backgroundColor: 'transparent' }}>
              {/* QR icon approximation */}
              <View style={[styles.tabIcon, { borderColor: color }]}>
                <View style={[styles.qrDot, { backgroundColor: color }]} />
              </View>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => (
            <View style={[styles.personIcon, { borderColor: color }]}>
              <View style={[styles.personHead, { backgroundColor: color }]} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color }) => (
            <View style={[styles.chartIcon, { borderColor: color }]}>
              <View style={[styles.chartBar, { height: 6, backgroundColor: color }]} />
              <View style={[styles.chartBar, { height: 10, backgroundColor: color }]} />
              <View style={[styles.chartBar, { height: 8, backgroundColor: color }]} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: { padding: 6, borderRadius: RADIUS.md },
  iconActive: { backgroundColor: COLORS.primary + '20' },
  tabIcon: { width: 22, height: 22, borderWidth: 2, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  qrDot: { width: 8, height: 8, borderRadius: 2 },
  personIcon: { width: 22, height: 22, borderWidth: 2, borderRadius: 11, alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden', paddingBottom: 1 },
  personHead: { width: 8, height: 8, borderRadius: 4, marginBottom: 1 },
  chartIcon: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, borderWidth: 0, height: 20 },
  chartBar: { width: 5, borderRadius: 2 },
});
