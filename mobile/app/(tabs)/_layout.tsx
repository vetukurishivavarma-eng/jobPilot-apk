import { Ionicons } from '@expo/vector-icons'
import { Tabs } from 'expo-router'
import { type ColorValue } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useColors } from '../../src/ui'

type IconName = keyof typeof Ionicons.glyphMap
const icon = (name: IconName) => ({ color, size }: { color: ColorValue; size: number }) => <Ionicons name={name} size={size} color={color} />

export default function TabsLayout() {
  const c = useColors()
  // edge-to-edge: leave room for Android's own nav buttons / gesture bar, or they sit on top of the tabs
  const bottom = useSafeAreaInsets().bottom
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: c.accent,
      tabBarInactiveTintColor: c.muted,
      tabBarStyle: { backgroundColor: c.card, borderTopColor: c.line, height: 60 + bottom, paddingBottom: 6 + bottom, paddingTop: 6 },
      tabBarLabelStyle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },
    }}>
      <Tabs.Screen name="index" options={{ title: 'Inbox', tabBarIcon: icon('mail-outline') }} />
      <Tabs.Screen name="jobs" options={{ title: 'Jobs', tabBarIcon: icon('briefcase-outline') }} />
      <Tabs.Screen name="applications" options={{ title: 'Applied', tabBarIcon: icon('document-text-outline') }} />
      <Tabs.Screen name="insights" options={{ title: 'Insights', tabBarIcon: icon('stats-chart-outline') }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: icon('person-outline') }} />
    </Tabs>
  )
}
