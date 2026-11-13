import { useEffect, useRef, useState } from 'react'
import { View } from 'react-native'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import { WebView, type WebViewMessageEvent } from 'react-native-webview'
import * as FileSystem from 'expo-file-system/legacy'
import { api, currentToken, msg, serverAddress, type Application } from '../../src/lib'
import { Card, ErrorText, Loading, T, useColors } from '../../src/ui'
import { offerLocation } from '../../src/dialog'

/**
 * Auto-fill (and submit) on the phone: the job's own application page in a WebView, filled by the same script the
 * PC extension uses (served by the backend at /fill.js). The script asks for data with chrome.runtime.sendMessage;
 * here `chrome` is a stand-in that posts to this screen, which answers from the API. A CAPTCHA stays with the user.
 */
export default function AutoApplyScreen() {
  const { id, submit } = useLocalSearchParams<{ id: string; submit?: string }>()
  const c = useColors()
  const web = useRef<WebView>(null)
  const [app, setApp] = useState<Application | null>(null)
  const [script, setScript] = useState<string | null>(null)
  const [note, setNote] = useState('Filling the form…')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.getApplication(id).then(setApp).catch(e => setError(msg(e)))
    fetch(`${serverAddress()}/fill.js`).then(r => (r.ok ? r.text() : Promise.reject(new Error('Could not load the form filler')))).then(setScript).catch(e => setError(msg(e)))
  }, [id])

  if (error) return <View style={{ flex: 1, padding: 16 }}><ErrorText>{error}</ErrorText></View>
  if (!app || !script) return <Loading />
  if (!app.applyUrl) return <View style={{ flex: 1, padding: 16 }}><ErrorText>This job has no application form link.</ErrorText></View>

  // fill.js runs inside a function whose `chrome` parameter is our bridge, so the page's own globals are untouched
  const inject = `(function(){
    if (!window.__jpBridge) {
      var n = 0, cbs = {};
      window.__jpBridge = {
        reply: function (id, r) { var cb = cbs[id]; delete cbs[id]; if (cb) cb(r) },
        chrome: {
          runtime: { lastError: null, sendMessage: function (m, cb) { var id = ++n; cbs[id] = cb; window.ReactNativeWebView.postMessage(JSON.stringify({ id: id, msg: m })) } },
          storage: { local: { get: function () { return Promise.resolve({}) }, set: function () {} } },
        },
      };
    }
    (function (chrome) { ${script}\n })(window.__jpBridge.chrome);
  })(); true;`

  const reply = (rid: number, r: unknown) =>
    web.current?.injectJavaScript(`window.__jpBridge && window.__jpBridge.reply(${rid}, ${JSON.stringify(r)}); true;`)

  async function resume() {
    const dest = `${FileSystem.cacheDirectory}jp-resume-${id}`
    const r = await FileSystem.downloadAsync(`${serverAddress()}/api/applications/${id}/resume`, dest, { headers: { Authorization: `Bearer ${currentToken()}` } })
    if (r.status !== 200) throw new Error('Could not download your resume (' + r.status + ')')
    const h = Object.fromEntries(Object.entries(r.headers).map(([k, v]) => [k.toLowerCase(), v]))
    const cd = h['content-disposition'] || ''
    const star = cd.match(/filename\*=UTF-8''([^;]+)/i), plain = cd.match(/filename="([^"]+)"/i)
    const b64 = await FileSystem.readAsStringAsync(dest, { encoding: FileSystem.EncodingType.Base64 })
    FileSystem.deleteAsync(dest, { idempotent: true })
    return { name: star ? decodeURIComponent(star[1]) : plain ? plain[1] : 'Resume.pdf', type: h['content-type'] || 'application/pdf', b64 }
  }

  async function onMessage(e: WebViewMessageEvent) {
    let m: { id: number; msg: { type: string; reason?: string } }
    try { m = JSON.parse(e.nativeEvent.data) } catch { return }
    try {
      switch (m.msg.type) {
        case 'forPage': return reply(m.id, { data: await api.getApplication(id) })
        case 'resume': return reply(m.id, await resume())
        case 'role': return reply(m.id, { auto: true, autoSubmit: submit === '1' })
        case 'needsYou': setNote(m.msg.reason ?? 'Please finish this form yourself.'); return reply(m.id, {})
        case 'submitted': {
          const a = await api.markApplied(id)
          setNote('Applied ✓ Saved to your tracker.')
          reply(m.id, { data: a })
          setTimeout(() => { router.back(); offerLocation(a.suggestLocation, api.addPreferredLocation) }, 2500)
          return
        }
        default: return reply(m.id, {})
      }
    } catch (err) { reply(m.id, { error: msg(err) }) }
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Stack.Screen options={{ title: app.company ?? 'Apply' }} />
      <Card tone={note.startsWith('Applied') ? 'accent' : 'warn'} style={{ margin: 8 }}>
        <T small>{note}</T>
      </Card>
      <WebView
        ref={web}
        source={{ uri: app.applyUrl }}
        onLoadEnd={() => web.current?.injectJavaScript(inject)}
        onMessage={onMessage}
        javaScriptEnabled
        domStorageEnabled
        setSupportMultipleWindows={false}
        style={{ flex: 1 }}
      />
    </View>
  )
}
