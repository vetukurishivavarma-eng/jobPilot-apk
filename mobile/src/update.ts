// In-app updates: the newest GitHub release of jobPilot-apk is the latest version. Publish a release (tag vX.Y.Z,
// with the .apk attached, from the GitHub app on a phone is fine) and every installed copy offers it on next open.
// Updates install over the old app only if signed with the same key (this PC's release build config).
import { useEffect, useRef } from 'react'
import { dialog, progress } from './dialog'
import { AppState, Platform } from 'react-native'
import Constants from 'expo-constants'
import * as FileSystem from 'expo-file-system/legacy'
import * as IntentLauncher from 'expo-intent-launcher'

const LATEST = 'https://api.github.com/repos/vetukurishivavarma-eng/jobPilot-apk/releases/latest'
const EVERY_MS = 6 * 60 * 60 * 1000

/** true when version a (e.g. "v1.3.2" or "1.3.2") is newer than b. */
export function newer(a: string, b: string) {
  const pa = a.replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0)
  const pb = b.replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) > (pb[i] ?? 0)
  }
  return false
}

type Release = { tag_name: string; body?: string; assets: { name: string; browser_download_url: string }[] }

async function install(url: string, tag: string) {
  const title = `Downloading JobPilot ${tag}`
  progress({ title, done: 0, total: 0 })
  const target = `${FileSystem.cacheDirectory}jobpilot-${tag}.apk`
  await FileSystem.deleteAsync(target, { idempotent: true })
  const dl = FileSystem.createDownloadResumable(url, target, {}, e => progress({ title, done: e.totalBytesWritten, total: e.totalBytesExpectedToWrite }))
  let res
  try { res = await dl.downloadAsync() } finally { progress(null) }
  if (!res || res.status !== 200) throw new Error(`download failed (${res?.status ?? 'cancelled'})`)
  const uri = res.uri
  const contentUri = await FileSystem.getContentUriAsync(uri)
  await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
    data: contentUri, type: 'application/vnd.android.package-archive', flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
  })
}

/** Checks on launch and when the app comes back to the front (at most every 6 hours). */
export function useAutoUpdate() {
  const last = useRef(0)
  const asking = useRef(false)
  useEffect(() => {
    if (Platform.OS !== 'android') return
    const check = async () => {
      if (asking.current || Date.now() - last.current < EVERY_MS) return
      last.current = Date.now()
      try {
        const res = await fetch(LATEST, { headers: { Accept: 'application/vnd.github+json' } })
        if (!res.ok) return
        const r = (await res.json()) as Release
        const current = Constants.expoConfig?.version ?? '0'
        const apk = r.assets.find(a => a.name.toLowerCase().endsWith('.apk'))
        if (!apk || !newer(r.tag_name, current)) return
        asking.current = true
        const notes = (r.body ?? '').split('\n').map(l => l.trim()).filter(l => l.startsWith('-')).slice(0, 4).join('\n')
        dialog(`Update available: ${r.tag_name}`, `You have ${current}.${notes ? `\n\n${notes}` : ''}`, [
          { text: 'Later', style: 'cancel', onPress: () => { asking.current = false } },
          { text: 'Update', onPress: () => install(apk.browser_download_url, r.tag_name)
              .catch(e => dialog('Update failed', String(e?.message ?? e)))
              .finally(() => { asking.current = false }) },
        ])
      } catch { /* offline: try again next time */ }
    }
    check()
    const sub = AppState.addEventListener('change', s => { if (s === 'active') check() })
    return () => sub.remove()
  }, [])
}
