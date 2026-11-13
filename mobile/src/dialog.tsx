// App-styled replacement for Alert.alert (same arguments), so confirmations look like JobPilot, not stock Android.
// <DialogHost /> is mounted once in app/_layout.tsx; a dialog() called before it mounts (the update check on a slow
// start) waits for it instead of falling back to the stock Android pop-up.
import { useEffect, useRef, useState } from 'react'
import { Animated, Modal, Pressable, Text, View } from 'react-native'
import { Bar, Btn, useColors } from './ui'

export type DialogButton = { text: string; style?: 'default' | 'cancel' | 'destructive'; onPress?: () => void }
type Dialog = { title: string; message?: string; buttons: DialogButton[] }

let show: ((d: Dialog) => void) | null = null
let pending: Dialog | null = null

export function dialog(title: string, message?: string, buttons: DialogButton[] = [{ text: 'OK' }]) {
  if (show) show({ title, message, buttons })
  else pending = { title, message, buttons }
}

/** After applying in a new city: offer adding it to the preferred locations (more jobs there show up). */
export function offerLocation(city: string | null | undefined, add: (city: string) => Promise<unknown>) {
  if (!city) return
  dialog(`Add ${city} to your preferred locations?`, `You applied to a job in ${city}. Adding it shows you more jobs there.`, [
    { text: 'Not now', style: 'cancel' },
    { text: `Add ${city}`, onPress: () => { add(city).then(() => dialog(`${city} added`, 'Your job list now includes it.')).catch(e => dialog('Could not add it', String(e?.message ?? e))) } },
  ])
}

type Progress = { title: string; done: number; total: number }
let setProgress: ((p: Progress | null) => void) | null = null

/** Shows (or, with null, hides) the download progress pop-up. done/total in bytes; total <= 0 = unknown size. */
export function progress(p: Progress | null) { setProgress?.(p) }

export function ProgressHost() {
  const c = useColors()
  const [p, setP] = useState<Progress | null>(null)
  useEffect(() => { setProgress = setP; return () => { setProgress = null } }, [])
  const mb = (b: number) => (b / 1048576).toFixed(1)
  const pct = p && p.total > 0 ? Math.min(100, Math.round((p.done / p.total) * 100)) : null
  return (
    <Modal transparent visible={!!p} animationType="fade" statusBarTranslucent onRequestClose={() => {}}>
      <View style={{ flex: 1, backgroundColor: 'rgba(16,19,17,0.55)', justifyContent: 'center', padding: 24 }}>
        {p && (
          <View style={{ backgroundColor: c.card, borderRadius: 20, padding: 20, gap: 12, borderWidth: 1, borderColor: c.line }}>
            <Text style={{ color: c.ink, fontSize: 19, fontWeight: '800' }}>{p.title}</Text>
            <Bar percent={pct ?? 0} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: c.accent, fontWeight: '800', fontSize: 15 }}>{pct === null ? '…' : `${pct}%`}</Text>
              <Text style={{ color: c.muted, fontSize: 13 }}>{mb(p.done)}{p.total > 0 ? ` of ${mb(p.total)}` : ''} MB</Text>
            </View>
            <Text style={{ color: c.muted, fontSize: 13, lineHeight: 18 }}>Keep the app open. Android asks you to confirm the install when it's done.</Text>
          </View>
        )}
      </View>
    </Modal>
  )
}

export function DialogHost() {
  const c = useColors()
  const [d, setD] = useState<Dialog | null>(null)
  const pop = useRef(new Animated.Value(0)).current
  useEffect(() => {
    show = setD
    if (pending) { setD(pending); pending = null }
    return () => { show = null }
  }, [])
  useEffect(() => {
    if (!d) return
    pop.setValue(0)
    Animated.spring(pop, { toValue: 1, friction: 7, tension: 90, useNativeDriver: true }).start()
  }, [d, pop])

  const press = (b?: DialogButton) => { setD(null); b?.onPress?.() }
  const cancel = d?.buttons.find(b => b.style === 'cancel')
  return (
    <Modal transparent visible={!!d} animationType="fade" statusBarTranslucent onRequestClose={() => press(cancel)}>
      <Pressable onPress={() => cancel && press(cancel)} style={{ flex: 1, backgroundColor: 'rgba(16,19,17,0.55)', justifyContent: 'center', padding: 24 }}>
        {d && (
          <Animated.View style={{ transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }], opacity: pop }}>
            <Pressable style={{ backgroundColor: c.card, borderRadius: 20, padding: 20, gap: 10, borderWidth: 1, borderColor: c.line }}>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <View style={{ width: 22, height: 4, borderRadius: 2, backgroundColor: c.accent }} />
                <View style={{ width: 10, height: 4, borderRadius: 2, backgroundColor: c.pop }} />
              </View>
              <Text style={{ color: c.ink, fontSize: 19, fontWeight: '800' }}>{d.title}</Text>
              {d.message ? <Text style={{ color: c.muted, fontSize: 15, lineHeight: 21 }}>{d.message}</Text> : null}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
                {d.buttons.map((b, i) => (
                  <Btn key={i} small title={b.text} onPress={() => press(b)}
                    kind={b.style === 'cancel' ? 'ghost' : b.style === 'destructive' ? 'danger' : i === d.buttons.length - 1 ? 'solid' : 'ghost'} />
                ))}
              </View>
            </Pressable>
          </Animated.View>
        )}
      </Pressable>
    </Modal>
  )
}
