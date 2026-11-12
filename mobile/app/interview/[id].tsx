import { useEffect, useState } from 'react'
import { PermissionsAndroid, Pressable, View } from 'react-native'
import { WebView } from 'react-native-webview'
import { Stack, useLocalSearchParams } from 'expo-router'
import { api, DEFAULT_SERVER, msg, type InterviewReport, type InterviewSession } from '../../src/lib'
import { Btn, Card, ErrorText, Input, Label, Loading, Row, Screen, T, Tag, useColors } from '../../src/ui'

const TYPE = { BEHAVIOURAL: 'Behavioural', TECHNICAL: 'Technical', ROLE: 'Role', INTRO: 'Opening', FOLLOW_UP: 'Follow-up' } as const
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

  if (s.mode === 'LIVE' && !s.report) return <LiveInterview s={s} onChange={setS} />

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

/** Live mode: one question at a time, no feedback until the report (like a real interview). */
function LiveInterview({ s, onChange }: { s: InterviewSession; onChange: (s: InterviewSession) => void }) {
  const c = useColors()
  const i = s.items.length - 1
  const item = s.items[i]
  const last = i + 1 >= 8
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    setBusy(true); setError(null)
    try { onChange(await api.answerInterview(s.id, i, draft.trim())); setDraft('') } catch (e) { setError(msg(e)) } finally { setBusy(false) }
  }

  return (
    <Screen header>
      <Stack.Screen options={{ title: s.title }} />
      <View style={{ height: 6, borderRadius: 3, backgroundColor: c.line, overflow: 'hidden' }}>
        <View style={{ height: 6, width: `${(i / 8) * 100}%`, backgroundColor: c.pop }} />
      </View>
      <Card>
        <Label>{TYPE[item.type]} · question {i + 1} of 8</Label>
        <T bold style={{ fontSize: 20, lineHeight: 28 }}>{item.question}</T>
        <Input label="Your answer" multiline maxLength={5000} value={draft} style={{ minHeight: 180 }}
          placeholder="Tap the mic on your keyboard to speak, or type. Be specific: what you did, why, what happened."
          onChangeText={setDraft} />
        <ErrorText>{error}</ErrorText>
        <Btn kind="accent" title={busy ? (last ? 'Writing your report…' : 'Interviewer is thinking…') : last ? 'Finish interview' : 'Answer'}
          busy={busy} disabled={!draft.trim()} onPress={submit} />
      </Card>
      <EyeContact />
      <T small muted>Answer each question once, as you would in the room. Feedback comes in the report at the end.</T>
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

/**
 * Eye-contact coach: the backend's eye.html (HTTPS, needed for the camera) runs face tracking inside the WebView,
 * on the phone; video never leaves it. It posts "away" after 2s out of frame or head turned.
 */
function EyeContact() {
  const c = useColors()
  const [state, setState] = useState<'off' | 'loading' | 'on' | 'error'>('off')
  const [away, setAway] = useState(false)
  const [count, setCount] = useState(0)

  async function start() {
    const ok = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA)
    setState(ok === PermissionsAndroid.RESULTS.GRANTED ? 'loading' : 'error')
  }
  function onMessage(m: string) {
    if (m === 'ready') setState('on')
    else if (m === 'error') setState('error')
    else if (m === 'away') { setAway(true); setCount(n => n + 1) }
    else if (m === 'back') setAway(false)
  }

  if (state === 'off') return (
    <Card>
      <Label>Eye contact</Label>
      <T small muted>Optional. Warns you when you look away, like a real video interview. Video stays on your phone.</T>
      <Btn kind="ghost" small title="Turn on camera" onPress={start} />
    </Card>
  )
  if (state === 'error') return <Card><T small muted>Camera unavailable (permission denied, or no connection to load the face tracker).</T></Card>
  return (
    <Card tone={away ? 'warn' : undefined}>
      <Row style={{ alignItems: 'flex-start' }}>
        <View style={{ width: 96, height: 128, borderRadius: 10, overflow: 'hidden', backgroundColor: '#111' }}>
          <WebView source={{ uri: `${DEFAULT_SERVER}/eye.html` }} onMessage={e => onMessage(e.nativeEvent.data)}
            mediaPlaybackRequiresUserAction={false} allowsInlineMediaPlayback javaScriptEnabled scrollEnabled={false}
            style={{ backgroundColor: '#111' }} />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Label>Eye contact</Label>
          {state === 'loading' && <T small muted>Starting the camera… (first time downloads the face tracker)</T>}
          {away ? <T bold style={{ color: c.warn }}>Look at the camera. Interviewers notice when you look away.</T>
            : state === 'on' && <T small>Good, keep looking at the camera.</T>}
          {state === 'on' && <T small muted>Looked away {count} time{count === 1 ? '' : 's'}.</T>}
        </View>
      </Row>
    </Card>
  )
}
