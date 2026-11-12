import { useCallback, useState } from 'react'
import { dialog } from '../../src/dialog'
import { Pressable, View } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { api, ApiError, msg, serverAddress, useSession, type Billing, type InterviewSummary, type Job } from '../../src/lib'
import { Btn, Card, Chip, ErrorText, Input, Label, Locked, Row, Screen, T, Tag, useColors } from '../../src/ui'

/** Mock interview coach: start from a job or a typed role; past sessions below. */
export default function Interviews() {
  const { gaps } = useSession()
  const c = useColors()
  const [jobs, setJobs] = useState<Job[]>([])
  const [history, setHistory] = useState<InterviewSummary[] | null>(null)
  const [jobId, setJobId] = useState('')
  const [role, setRole] = useState('')
  const [live, setLive] = useState(true)
  const [billing, setBilling] = useState<Billing | null>(null)
  const [needsPlan, setNeedsPlan] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const unlocked = gaps?.missing.length === 0

  useFocusEffect(useCallback(() => {
    if (!unlocked) return
    api.listJobs({ status: 'ACTIVE', q: '', includeClosed: false, page: 0, sort: 'match' }).then(p => setJobs(p.items)).catch(e => setError(msg(e)))
    api.listInterviews().then(setHistory).catch(e => setError(msg(e)))
    api.billing().then(setBilling).catch(() => {})
  }, [unlocked]))

  if (!unlocked) return <Locked gaps={gaps} what="Interview practice" />

  async function start() {
    setBusy(true)
    setError(null)
    try { router.push(`/interview/${(await api.startInterview({ ...(jobId ? { jobId } : { role: role.trim() }), live })).id}`) }
    catch (e) {
      if (e instanceof ApiError && e.code === 'PAYMENT_REQUIRED') { setNeedsPlan(true); api.billing().then(setBilling).catch(() => {}) }
      else setError(msg(e))
    } finally { setBusy(false) }
  }
  function remove(s: InterviewSummary) {
    dialog('Delete this session?', s.title, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => api.deleteInterview(s.id).then(() => setHistory(h => h && h.filter(x => x.id !== s.id))).catch(e => setError(msg(e))) },
    ])
  }

  return (
    <Screen header>
      <T muted small>A spoken mock interview with Arjun, your AI interviewer: he asks out loud, you answer out loud, and he follows up on what you actually said. 8 questions, then a report and a recording you can download for an hour. Practice only, not for a real interview.</T>
      {billing?.enabled && (needsPlan || billing.credits === 0)
        ? <Plans billing={billing} onPaid={b => { setBilling(b); if (b.credits > 0 && needsPlan) { setNeedsPlan(false); start() } }} />
        : billing?.enabled ? <T small muted>{billing.credits} live interview{billing.credits === 1 ? '' : 's'} left.</T> : null}
      <Card>
        <Label>A job from your list</Label>
        <Row wrap gap={6}>
          {jobs.slice(0, 12).map(j => (
            <Chip key={j.id} label={`${j.title} · ${j.company}`} on={jobId === j.id} onPress={() => { setJobId(jobId === j.id ? '' : j.id); setRole('') }} />
          ))}
          {jobs.length === 0 && <T small muted>No jobs in your inbox yet.</T>}
        </Row>
        <Input label="Or a role" placeholder="Backend Engineer" maxLength={120} value={role} onChangeText={v => { setRole(v); if (v) setJobId('') }} />
        <Row wrap gap={6}>
          <Chip label="Live interview" on={live} onPress={() => setLive(true)} />
          <Chip label="Practice set (6 fixed)" on={!live} onPress={() => setLive(false)} />
        </Row>
        <Btn kind="accent" title={busy ? 'Starting…' : live ? 'Start interview' : 'Start practice'} busy={busy} disabled={!jobId && !role.trim()} onPress={start} />
        <ErrorText>{error}</ErrorText>
      </Card>

      <Label>Past sessions</Label>
      {history === null ? <T muted>Loading…</T> : history.length === 0 ? <T small muted>None yet.</T> : (
        <Card style={{ padding: 0, gap: 0 }}>
          {history.map((s, i) => (
            <Pressable key={s.id} onPress={() => router.push(`/interview/${s.id}`)} onLongPress={() => remove(s)}
              style={({ pressed }) => ({ padding: 14, borderTopWidth: i ? 1 : 0, borderTopColor: c.line, opacity: pressed ? 0.6 : 1 })}>
              <Row>
                <View style={{ flex: 1 }}>
                  <T bold>{s.title}</T>
                  <T small muted>{s.mode === 'LIVE' ? 'Interview' : 'Practice'} · {s.answered}/{s.total} answered · {new Date(s.createdAt).toLocaleDateString()}</T>
                </View>
                {s.readiness != null ? <Tag label={`ready ${s.readiness}%`} tone="accent" /> : s.averageScore != null && <Tag label={`avg ${s.averageScore}/5`} tone="accent" />}
              </Row>
            </Pressable>
          ))}
        </Card>
      )}
      {history && history.length > 0 && <T small muted>Long-press a session to delete it.</T>}
    </Screen>
  )
}

/** Rs 10 first interview, Rs 49 each, or 4 in 7 days for Rs 200. Razorpay's own page takes the payment in the in-app browser. */
function Plans({ billing, onPaid }: { billing: Billing; onPaid: (b: Billing) => void }) {
  const c = useColors()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  async function buy(plan: Billing['plans'][number]['id']) {
    setBusy(plan); setError(null)
    try {
      await WebBrowser.openBrowserAsync(serverAddress() + (await api.buy(plan)).payUrl) // resolves when the browser is closed
      const b = await api.billing()
      onPaid(b)
      if (b.credits === 0) setError("We haven't received a payment yet. If you paid, wait a few seconds and open this screen again.")
    } catch (e) { setError(msg(e)) } finally { setBusy(null) }
  }
  return (
    <Card tone="accent">
      <T bold style={{ fontSize: 17 }}>Get your live interview</T>
      {billing.plans.map(p => (
        <Pressable key={p.id} disabled={!!busy} onPress={() => buy(p.id)}
          style={({ pressed }) => ({ borderWidth: 1, borderColor: c.line, borderRadius: 12, padding: 12, backgroundColor: c.card, opacity: pressed || busy === p.id ? 0.6 : 1 })}>
          <Row>
            <T bold style={{ fontSize: 22 }}>₹{p.rupees}</T>
            <View style={{ flex: 1 }}>
              <T bold>{p.label}</T>
              <T small muted>{p.interviews} interview{p.interviews === 1 ? '' : 's'}{p.days ? `, within ${p.days} days` : ''} · report + recording</T>
            </View>
          </Row>
        </Pressable>
      ))}
      <ErrorText>{error}</ErrorText>
    </Card>
  )
}
