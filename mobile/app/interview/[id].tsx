import { useEffect, useRef, useState } from 'react'
import { PermissionsAndroid, Pressable, View } from 'react-native'
import { WebView } from 'react-native-webview'
import { Stack, useLocalSearchParams } from 'expo-router'
import * as Speech from 'expo-speech'
import * as Notifications from 'expo-notifications'
import { usePreventScreenCapture } from 'expo-screen-capture'
import { api, currentToken, DEFAULT_SERVER, msg, shareRecording, type InterviewReport, type InterviewSession } from '../../src/lib'
import { Btn, Card, ErrorText, Input, Label, Loading, Row, Screen, T, Tag, useColors } from '../../src/ui'

const TYPE = { BEHAVIOURAL: 'Behavioural', TECHNICAL: 'Technical', ROLE: 'Role', INTRO: 'Opening', FOLLOW_UP: 'Follow-up', PROBE: 'Check-in' } as const
const RUBRIC = [['relevance', 'Relevance'], ['specificity', 'Specificity'], ['technical', 'Technical'], ['concision', 'Concision']] as const

/** One question at a time; drafts survive a failed scoring (e.g. 503 AI_UNAVAILABLE) so the user can retry. */
export default function InterviewSessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const c = useColors()
  const [s, setS] = useState<InterviewSession | null>(null)
  const [i, setI] = useState(0)
  const [drafts, setDrafts] = useState<Record<number, string>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.getInterview(id).then(x => { setS(x); const next = x.items.findIndex(q => !q.answer); setI(next < 0 ? 0 : next) }).catch(e => setError(msg(e)))
  }, [id])
  if (!s) return error ? <Screen header><ErrorText>{error}</ErrorText></Screen> : <Loading />

  if (s.mode === 'LIVE' && !s.report && !s.ended && !s.done)
    return <LiveInterview id={s.id} onFinished={() => api.getInterview(s.id).then(setS).catch(e => setError(msg(e)))} />

  const item = s.items[i]
  const draft = drafts[i] ?? item.answer ?? ''
  const fb = item.feedback

  async function submit() {
    setBusy(true)
    setError(null)
    try { setS(await api.answerInterview(s!.id, i, draft)); setDrafts(d => { const { [i]: _, ...rest } = d; return rest }) }
    catch (e) { setError(msg(e)) } finally { setBusy(false) }
  }

  return (
    <Screen header>
      <Stack.Screen options={{ title: s.title }} />
      {s.source === 'TEMPLATE' && <T small muted>Standard questions (the local AI wasn't available to write ones for this job).</T>}
      {s.recordingExpiresAt && <Recording s={s} />}
      {s.mode === 'LIVE' && s.done && !s.report && <RetryReport s={s} onChange={setS} />}
      {s.report && <Report r={s.report} />}
      {s.report && <Label>Question by question</Label>}
      <Row wrap gap={6}>
        {s.items.map((q, n) => (
          <Pressable key={n} onPress={() => { setI(n); setError(null) }} accessibilityState={{ selected: n === i }}
            style={{ minWidth: 44, alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1,
              borderColor: n === i ? c.pop : q.answer ? c.accent : c.line, backgroundColor: n === i ? c.pop : q.answer ? c.accentSoft : c.card }}>
            <T small bold style={{ color: n === i ? '#ffffff' : q.answer ? c.accent : c.muted }}>{n + 1}{q.feedback?.score != null ? ` · ${q.feedback.score}` : ''}</T>
          </Pressable>
        ))}
      </Row>

      <Card>
        <Label>{TYPE[item.type]} · {i + 1} of {s.items.length}</Label>
        <T bold style={{ fontSize: 19, lineHeight: 26 }}>{item.question}</T>
        <Input label="Your answer" multiline maxLength={5000} value={draft} style={{ minHeight: 160 }} editable={s.mode !== 'LIVE'}
          placeholder="Answer as you would out loud. Behavioural: situation, task, action, result."
          onChangeText={v => setDrafts({ ...drafts, [i]: v })} />
        <ErrorText>{error}</ErrorText>
        <Row>
          {s.mode !== 'LIVE' && <View style={{ flex: 1 }}>
            <Btn title={busy ? 'Scoring…' : item.answer ? 'Score again' : 'Get feedback'} busy={busy} disabled={!draft.trim() || draft === item.answer} onPress={submit} />
          </View>}
          {i + 1 < s.items.length && <Btn kind="ghost" title="Next ›" onPress={() => { setI(i + 1); setError(null) }} />}
        </Row>
      </Card>

      {fb && (
        <Card>
          <Row><T bold style={{ flex: 1, fontSize: 18 }}>Feedback</T>{fb.score != null && <Tag label={`${fb.score}/5`} tone="accent" />}</Row>
          <Row gap={6}>
            {RUBRIC.map(([k, label]) => (
              <View key={k} style={{ flex: 1, borderWidth: 1, borderColor: c.line, borderRadius: 8, padding: 8 }}>
                <T small muted style={{ fontSize: 10 }}>{label}</T>
                <T bold>{fb.rubric[k] != null ? `${fb.rubric[k]}/5` : '–'}</T>
              </View>
            ))}
          </Row>
          {fb.improvements.length > 0 && <View style={{ gap: 4 }}><Label>To improve</Label>{fb.improvements.map((x, n) => <T key={n} small>• {x}</T>)}</View>}
          {fb.improvedAnswer && (
            <View style={{ gap: 4 }}>
              <Label>A stronger answer, from your own facts</Label>
              <View style={{ backgroundColor: c.bg, borderRadius: 8, padding: 10 }}><T small selectable>{fb.improvedAnswer}</T></View>
            </View>
          )}
          {fb.warnings.length > 0 && <Card tone="warn">{fb.warnings.map((w, n) => <T key={n} small>• {w}</T>)}</Card>}
        </Card>
      )}
    </Screen>
  )
}

function Report({ r }: { r: InterviewReport }) {
  const c = useColors()
  return (
    <Card tone="accent">
      <Row>
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: c.pop, alignItems: 'center', justifyContent: 'center' }}>
          <T bold style={{ color: '#ffffff', fontSize: 22 }}>{r.readiness ?? '–'}%</T>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <T bold style={{ fontSize: 18 }}>Interview readiness</T>
          {r.verdict ? <T small>{r.verdict}</T> : <T small muted>From your scores (the AI wasn't available for a written review).</T>}
        </View>
      </Row>
      {r.gaps.length > 0 && <View style={{ gap: 6 }}>
        <Label>Behind the market standard</Label>
        {r.gaps.map((g, n) => <Card key={n} tone="warn"><T small><T small bold>{g.area}</T>{g.detail ? ` — ${g.detail}` : ''}</T></Card>)}
      </View>}
      {r.strengths.length > 0 && <View style={{ gap: 4 }}><Label>Strengths</Label>{r.strengths.map((x, n) => <T key={n} small>• {x}</T>)}</View>}
      {r.focus.length > 0 && <View style={{ gap: 4 }}><Label>Practise next</Label>{r.focus.map((x, n) => <T key={n} small>• {x}</T>)}</View>}
    </Card>
  )
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
})

/** Google's Indian-English male voices first ("ene"/"enc"/"end"), then any en-IN voice; the device default otherwise. */
function indianMaleVoice(vs: Speech.Voice[]) {
  const en = vs.filter(v => v.language.replace('_', '-').toLowerCase() === 'en-in')
  return (['en-in-x-ene', 'en-in-x-enc', 'en-in-x-end'].map(k => en.find(v => v.identifier.toLowerCase().startsWith(k))).find(Boolean)
    ?? en.find(v => /male/i.test(v.name) && !/female/i.test(v.name)) ?? en[0])?.identifier
}

/**
 * The spoken interview: the website's /live page (camera, mic, recording, on-device face and phone detection) in a
 * WebView. The app adds the interviewer's voice, the "recording ready" notification and FLAG_SECURE, so screen
 * recordings and screenshots of the interview come out black.
 */
function LiveInterview({ id, onFinished }: { id: string; onFinished: () => void }) {
  usePreventScreenCapture()
  const web = useRef<WebView>(null)
  const voice = useRef<string | undefined>(undefined)
  const [perm, setPerm] = useState<'asking' | 'ok' | 'denied'>('asking')

  useEffect(() => {
    PermissionsAndroid.requestMultiple([PermissionsAndroid.PERMISSIONS.CAMERA, PermissionsAndroid.PERMISSIONS.RECORD_AUDIO])
      .then(r => setPerm(Object.values(r).every(x => x === PermissionsAndroid.RESULTS.GRANTED) ? 'ok' : 'denied'))
    Speech.getAvailableVoicesAsync().then(vs => { voice.current = indianMaleVoice(vs) }).catch(() => {})
    Notifications.setNotificationChannelAsync('default', { name: 'Interview', importance: Notifications.AndroidImportance.HIGH }).catch(() => {})
    Notifications.requestPermissionsAsync().catch(() => {})
    return () => { Speech.stop() }
  }, [])

  const spoken = () => web.current?.injectJavaScript("window.dispatchEvent(new Event('jp-spoken'));true;")
  function onMessage(raw: string) {
    let m: { type?: string; text?: string; title?: string; body?: string }
    try { m = JSON.parse(raw) } catch { return }
    if (m.type === 'speak' && m.text)
      Speech.speak(m.text, { language: 'en-IN', voice: voice.current, pitch: 0.9, rate: 0.95, onDone: spoken, onStopped: spoken, onError: spoken })
    else if (m.type === 'stopSpeaking') Speech.stop()
    else if (m.type === 'notify') Notifications.scheduleNotificationAsync({ content: { title: m.title ?? 'JobPilot', body: m.body ?? '' }, trigger: null }).catch(() => {})
    else if (m.type === 'finished') onFinished()
  }

  if (perm !== 'ok') return (
    <Screen header>
      <Stack.Screen options={{ title: 'Interview' }} />
      <Card><T>{perm === 'asking' ? 'Allow the camera and microphone to start the interview.' : 'The interview needs your camera and microphone. Allow them in Settings > Apps > JobPilot > Permissions, then open this interview again.'}</T></Card>
    </Screen>
  )
  return (
    <View style={{ flex: 1, backgroundColor: '#0f0d17' }}>
      <Stack.Screen options={{ headerShown: false }} />
      <WebView ref={web} source={{ uri: `${DEFAULT_SERVER}/live/${id}#t=${encodeURIComponent(currentToken() ?? '')}` }}
        onMessage={e => onMessage(e.nativeEvent.data)} mediaPlaybackRequiresUserAction={false} allowsInlineMediaPlayback
        javaScriptEnabled domStorageEnabled style={{ flex: 1, backgroundColor: '#0f0d17' }} />
    </View>
  )
}

/** The recording is kept on the server for an hour after the interview, then deleted. */
function Recording({ s }: { s: InterviewSession }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const until = new Date(s.recordingExpiresAt!).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  async function save() {
    setBusy(true); setError(null)
    try { await shareRecording(s.id) } catch (e) { setError(msg(e)) } finally { setBusy(false) }
  }
  return (
    <Card tone="accent">
      <T bold>Your recording is ready</T>
      <T small muted>Deleted automatically at {until}. Save it to keep it.</T>
      <Btn kind="accent" small title={busy ? 'Downloading…' : 'Download recording'} busy={busy} onPress={save} />
      <ErrorText>{error}</ErrorText>
    </Card>
  )
}

function RetryReport({ s, onChange }: { s: InterviewSession; onChange: (s: InterviewSession) => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function retry() {
    setBusy(true); setError(null)
    try { onChange(await api.interviewReport(s.id)) } catch (e) { setError(msg(e)) } finally { setBusy(false) }
  }
  return (
    <Card>
      <T>Your answers are saved, but the report couldn't be written.</T>
      <Btn small title={busy ? 'Writing…' : 'Write my report'} busy={busy} onPress={retry} />
      <ErrorText>{error}</ErrorText>
    </Card>
  )
}
