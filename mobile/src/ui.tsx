import { useEffect, useRef, type ReactNode } from 'react'
import { ActivityIndicator, Animated, Easing, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, useColorScheme, View, type TextInputProps, type ViewStyle } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'

// JobPilot palette (same brand as the website): ink on warm paper, forest green for action and progress, one warm
// marigold accent used sparingly (waypoints, highlights). Neutrals are warm, never lavender. Plus a dark twin.
const light = {
  bg: '#F6F4EF', card: '#FFFFFF', ink: '#16181D', muted: '#6B6A64', line: '#E4E0D6',
  accent: '#1F6F5C', accentSoft: '#E1EFE9', pop: '#A8591A', popSoft: '#FBEEDC',
  good: '#2F7D4F', goodSoft: '#E0F0E5', info: '#2B5F9E', infoSoft: '#E3ECF6',
  danger: '#B42318', dangerSoft: '#FBE7E4', warn: '#A15C0B', warnSoft: '#FBF0DC',
}
const dark: typeof light = {
  bg: '#101311', card: '#191D1A', ink: '#ECEAE4', muted: '#9C9A92', line: '#2A2F2B',
  accent: '#5DBB9C', accentSoft: '#183028', pop: '#E9A23B', popSoft: '#3A2A14',
  good: '#6CC38E', goodSoft: '#163022', info: '#7AA9E0', infoSoft: '#16263A',
  danger: '#F2877C', dangerSoft: '#3A1A17', warn: '#E9A23B', warnSoft: '#36280F',
}
export type Colors = typeof light
export const useColors = () => (useColorScheme() === 'dark' ? dark : light)

export const space = 16

/** header: the screen sits under a stack header, which already covers the status bar. */
export function Screen({ children, onRefresh, refreshing = false, footer, header }: { children: ReactNode; onRefresh?: () => void; refreshing?: boolean; footer?: ReactNode; header?: boolean }) {
  const c = useColors()
  const top = useSafeAreaInsets().top
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView
        contentContainerStyle={{ padding: space, paddingTop: header ? space : top + 12, paddingBottom: 48, gap: 14 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} colors={[c.accent]} /> : undefined}>
        {children}
      </ScrollView>
      {footer}
    </View>
  )
}

export function Title({ children, kicker }: { children: ReactNode; kicker?: string }) {
  const c = useColors()
  return (
    <View style={{ marginBottom: 2 }}>
      {kicker && <Text style={[s.kicker, { color: c.pop }]}>{kicker}</Text>}
      <Text style={[s.title, { color: c.ink }]}>{children}</Text>
      <View style={{ flexDirection: 'row', gap: 4, marginTop: 8 }}>
        <View style={{ width: 28, height: 4, borderRadius: 2, backgroundColor: c.accent }} />
        <View style={{ width: 10, height: 4, borderRadius: 2, backgroundColor: c.pop }} />
      </View>
    </View>
  )
}

export function T({ children, muted, small, bold, style, selectable, onPress }: { children: ReactNode; muted?: boolean; small?: boolean; bold?: boolean; style?: object; selectable?: boolean; onPress?: () => void }) {
  const c = useColors()
  return <Text selectable={selectable} onPress={onPress} style={[{ color: muted ? c.muted : c.ink, fontSize: small ? 13 : 15, lineHeight: small ? 18 : 22, fontWeight: bold ? '700' : '400' }, style]}>{children}</Text>
}

export function Label({ children }: { children: ReactNode }) {
  const c = useColors()
  return <Text style={[s.label, { color: c.muted }]}>{children}</Text>
}

export function Card({ children, tone, style }: { children: ReactNode; tone?: 'accent' | 'warn' | 'danger'; style?: ViewStyle }) {
  const c = useColors()
  const stripe = tone === 'accent' ? c.accent : tone === 'warn' ? c.warn : tone === 'danger' ? c.danger : null
  const bg = tone === 'warn' ? c.warnSoft : tone === 'accent' ? c.accentSoft : tone === 'danger' ? c.dangerSoft : c.card
  return <View style={[s.card, { backgroundColor: bg, borderColor: c.line, shadowColor: '#000000' }, stripe && { borderLeftWidth: 5, borderLeftColor: stripe }, style]}>{children}</View>
}

export function Btn({ title, onPress, kind = 'solid', disabled, busy, small }: { title: string; onPress: () => void; kind?: 'solid' | 'ghost' | 'danger' | 'accent'; disabled?: boolean; busy?: boolean; small?: boolean }) {
  const c = useColors()
  const bg = kind === 'solid' ? c.accent : kind === 'accent' ? c.ink : 'transparent'
  const fg = kind === 'solid' ? '#ffffff' : kind === 'accent' ? c.bg : kind === 'danger' ? c.danger : c.accent
  const off = disabled || busy
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: !!off }} disabled={off} onPress={onPress}
      style={({ pressed }) => [s.btn, small && s.btnSmall, { backgroundColor: bg, borderColor: kind === 'ghost' ? c.accent : kind === 'danger' ? c.danger : bg, opacity: off ? 0.45 : pressed ? 0.75 : 1 }]}>
      {busy && <ActivityIndicator size="small" color={fg} />}
      <Text style={{ color: fg, fontWeight: '700', fontSize: small ? 13 : 15 }}>{title}</Text>
    </Pressable>
  )
}

export function Input({ label, error, hint, style, ...p }: TextInputProps & { label: string; error?: string; hint?: string }) {
  const c = useColors()
  return (
    <View style={{ gap: 6 }}>
      <Label>{label}</Label>
      <TextInput placeholderTextColor={c.muted} {...p}
        style={[s.input, { color: c.ink, backgroundColor: c.card, borderColor: error ? c.danger : c.line }, p.multiline && { minHeight: 110, textAlignVertical: 'top' }, style]} />
      {hint && !error && <T small muted>{hint}</T>}
      {error && <T small style={{ color: c.danger }}>{error}</T>}
    </View>
  )
}

/** Tappable pill: segmented controls, select options, filters. */
export function Chip({ label, on, onPress, disabled }: { label: string; on: boolean; onPress: () => void; disabled?: boolean }) {
  const c = useColors()
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: on, disabled }} disabled={disabled} onPress={onPress}
      style={[s.chip, { backgroundColor: on ? c.accent : c.card, borderColor: on ? c.accent : c.line, opacity: disabled ? 0.5 : 1 }]}>
      <Text style={{ color: on ? '#ffffff' : c.ink, fontWeight: '600', fontSize: 13 }}>{label}</Text>
    </Pressable>
  )
}

export function Tag({ label, tone }: { label: string; tone?: 'accent' | 'warn' | 'danger' | 'ink' }) {
  const c = useColors()
  const [bg, fg] = tone === 'accent' ? [c.accentSoft, c.accent] : tone === 'warn' ? [c.warnSoft, c.warn] : tone === 'danger' ? [c.dangerSoft, c.danger] : tone === 'ink' ? [c.infoSoft, c.info] : [c.accentSoft, c.accent]
  return <Text style={[s.tag, { backgroundColor: bg, color: fg }]}>{label}</Text>
}

export function Row({ children, gap = 8, wrap, style }: { children: ReactNode; gap?: number; wrap?: boolean; style?: ViewStyle }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap, flexWrap: wrap ? 'wrap' : 'nowrap' }, style]}>{children}</View>
}

export function ErrorText({ children }: { children: ReactNode }) {
  const c = useColors()
  return children ? <Text accessibilityRole="alert" style={{ color: c.danger, fontSize: 14 }}>{children}</Text> : null
}

export function Score({ score, big }: { score: number; big?: boolean }) {
  const c = useColors()
  const tone = score >= 75 ? c.good : score >= 50 ? c.warn : c.muted
  const soft = score >= 75 ? c.goodSoft : score >= 50 ? c.warnSoft : c.bg
  const size = big ? 64 : 46
  return (
    <View accessibilityLabel={`Match ${score}`} style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 3, borderColor: tone, backgroundColor: soft, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: tone, fontWeight: '800', fontSize: big ? 22 : 16, lineHeight: big ? 24 : 18 }}>{score}</Text>
      <Text style={{ color: tone, fontSize: 8, fontWeight: '700', letterSpacing: 0.8 }}>MATCH</Text>
    </View>
  )
}

export function Bar({ percent }: { percent: number }) {
  const c = useColors()
  return (
    <View style={{ height: 6, borderRadius: 3, backgroundColor: c.accentSoft, overflow: 'hidden' }}>
      <View style={{ width: `${percent}%`, height: 6, backgroundColor: percent >= 100 ? c.good : c.accent, borderRightWidth: percent > 0 && percent < 100 ? 6 : 0, borderRightColor: c.pop }} />
    </View>
  )
}

export function Loading() {
  const c = useColors()
  return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg }}><AnimatedLogo size={84} /></View>
}

/** The JobPilot mark (assets/icon.png): springs in, then floats with a soft pulsing glow (built-in Animated, native driver). */
export function AnimatedLogo({ size = 96 }: { size?: number }) {
  const c = useColors()
  const enter = useRef(new Animated.Value(0)).current
  const loop = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.spring(enter, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }).start()
    const a = Animated.loop(Animated.sequence([
      Animated.timing(loop, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(loop, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]))
    a.start()
    return () => a.stop()
  }, [enter, loop])
  return (
    <View style={{ width: size * 1.5, height: size * 1.5, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 3, backgroundColor: c.pop,
        opacity: loop.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] }),
        transform: [{ scale: loop.interpolate({ inputRange: [0, 1], outputRange: [1, 1.45] }) }] }} />
      <Animated.Image source={require('../assets/icon.png')} accessibilityLabel="JobPilot logo"
        style={{ width: size, height: size, borderRadius: size / 4, opacity: enter,
          transform: [
            { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) },
            { translateY: loop.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.07] }) },
            { rotate: loop.interpolate({ inputRange: [0, 1], outputRange: ['-3deg', '3deg'] }) },
          ] }} />
    </View>
  )
}

/** Sticky bar at the bottom of a screen (save / delete). */
export function Footer({ children }: { children: ReactNode }) {
  const c = useColors()
  const bottom = useSafeAreaInsets().bottom
  return <View style={[s.footer, { backgroundColor: c.card, borderTopColor: c.line, paddingBottom: 12 + bottom }]}>{children}</View>
}

const s = StyleSheet.create({
  kicker: { fontSize: 11, fontWeight: '800', letterSpacing: 1.6, textTransform: 'uppercase', marginBottom: 4 },
  title: { fontSize: 32, fontWeight: '800', letterSpacing: -0.8, lineHeight: 36 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  card: { borderWidth: 1, borderRadius: 16, padding: space, gap: 10, shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  btn: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 18 },
  btnSmall: { paddingVertical: 8, paddingHorizontal: 12 },
  input: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15 },
  chip: { borderWidth: 1, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14 },
  tag: { fontSize: 12, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, overflow: 'hidden' },
  footer: { flexDirection: 'row', gap: 10, alignItems: 'center', borderTopWidth: 1, paddingHorizontal: space, paddingTop: 12 },
})

/** Jobs and Applications open only with a 100% profile (same rule as the website). */
export function Locked({ gaps, what }: { gaps: { missing: string[]; percent: number } | null; what: string }) {
  if (!gaps) return <Loading />
  return (
    <Screen>
      <Title kicker={`Profile ${gaps.percent}%`}>Finish your profile first</Title>
      <T muted>{what} unlock at 100%. The agent can only answer application questions from what your profile says.</T>
      <Card tone="warn">
        <Bar percent={gaps.percent} />
        <Label>Still missing</Label>
        <Row wrap>{gaps.missing.map(m => <Tag key={m} label={m} tone="warn" />)}</Row>
      </Card>
      <Btn title="Open profile" onPress={() => router.navigate('/profile')} />
    </Screen>
  )
}
