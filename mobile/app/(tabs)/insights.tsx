import { useCallback, useState } from 'react'
import { View } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { api, msg, useSession, type Insights } from '../../src/lib'
import { Card, ErrorText, Label, Locked, Row, Screen, T, Title, useColors } from '../../src/ui'

export default function InsightsScreen() {
  const { gaps } = useSession()
  const c = useColors()
  const [d, setD] = useState<Insights | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const unlocked = gaps?.missing.length === 0
  const load = useCallback(() => api.insights().then(x => { setD(x); setError(null) }).catch(e => setError(msg(e))), [])
  useFocusEffect(useCallback(() => { if (unlocked) load() }, [unlocked, load]))

  if (!unlocked) return <Locked gaps={gaps} what="Insights" />

  const f = d?.funnel
  const stages: [string, number][] = f ? [['Applied', f.applied], ['Screening', f.screening], ['Interview', f.interview], ['Offer', f.offer]] : []
  const maxStage = Math.max(1, ...stages.map(s => s[1]))
  const maxGap = Math.max(1, ...(d?.skillGaps.map(g => g.jobs) ?? []))
  const nothingYet = f && f.submitted === 0 && d!.skillGaps.length === 0

  return (
    <Screen refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false) }}>
      <Title kicker="How your search is going">Insights</Title>
      <ErrorText>{error}</ErrorText>
      {!d ? <T muted>Loading…</T> : nothingYet ? (
        <Card><T muted>Nothing to show yet. Apply to a few jobs and track their outcomes; your funnel and skill gaps appear here.</T></Card>
      ) : (
        <>
          <Row gap={8}>
            <Stat label="Submitted" value={`${f!.submitted}`} sub={`${f!.submittedThisWeek} this week`} />
            <Stat label="Reply rate" value={f!.replyRatePct == null ? '—' : `${f!.replyRatePct}%`} sub={f!.replyRatePct == null ? 'no replies' : 'of submitted'} />
            <Stat label="Avg reply" value={f!.avgDaysToReply == null ? '—' : `${f!.avgDaysToReply}d`} sub="to first reply" />
          </Row>

          <Card>
            <Label>Your funnel</Label>
            <View style={{ gap: 8, marginTop: 6 }}>
              {stages.map(([name, n]) => (
                <Row key={name}>
                  <T small muted style={{ width: 70 }}>{name}</T>
                  <View style={{ flex: 1, height: 22, borderRadius: 6, backgroundColor: c.bg, overflow: 'hidden' }}>
                    <View style={{ height: '100%', borderRadius: 6, backgroundColor: c.accent, width: `${Math.max(n ? 8 : 0, (n / maxStage) * 100)}%`, justifyContent: 'center', paddingHorizontal: 6 }}>
                      {n > 0 && <T small style={{ color: '#fff', fontWeight: '800' }}>{n}</T>}
                    </View>
                  </View>
                </Row>
              ))}
            </View>
            {(f!.offer > 0 || f!.accepted > 0 || f!.rejected > 0) && (
              <T small muted style={{ marginTop: 8 }}>
                {f!.offer > 0 ? `${f!.offer} offer${f!.offer === 1 ? '' : 's'}. ` : ''}{f!.accepted > 0 ? `${f!.accepted} accepted. ` : ''}{f!.rejected > 0 ? `${f!.rejected} rejected.` : ''}
              </T>
            )}
          </Card>

          <Card>
            <Label>Skills to learn next</Label>
            <T small muted>Most asked for across your {d.jobsConsidered} open job{d.jobsConsidered === 1 ? '' : 's'}, not yet on your profile.</T>
            {d.skillGaps.length === 0 ? <T small muted style={{ marginTop: 6 }}>No gaps — your profile covers what your jobs ask for. 🎯</T> : (
              <View style={{ gap: 8, marginTop: 8 }}>
                {d.skillGaps.map(g => (
                  <Row key={g.skill}>
                    <T small style={{ width: 110, fontWeight: '600' }}>{g.skill}</T>
                    <View style={{ flex: 1, height: 18, borderRadius: 6, backgroundColor: c.bg, overflow: 'hidden' }}>
                      <View style={{ height: '100%', borderRadius: 6, backgroundColor: c.pop, width: `${(g.jobs / maxGap) * 100}%` }} />
                    </View>
                    <T small muted style={{ width: 54, textAlign: 'right' }}>{g.jobs} job{g.jobs === 1 ? '' : 's'}</T>
                  </Row>
                ))}
              </View>
            )}
          </Card>
        </>
      )}
    </Screen>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <Card style={{ flex: 1, gap: 2 }}>
      <T small muted style={{ textTransform: 'uppercase', letterSpacing: 0.4, fontSize: 10 }}>{label}</T>
      <T bold style={{ fontSize: 24, lineHeight: 28 }}>{value}</T>
      <T muted style={{ fontSize: 10 }}>{sub}</T>
    </Card>
  )
}
