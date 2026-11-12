// Phone client. Every type, endpoint and profile rule comes from ../../shared/api.ts (shared with the website).
import { createContext, useContext } from 'react'
import * as SecureStore from 'expo-secure-store'
import { File, Paths } from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import { createApi, ApiError, type ApplicationStatus, type User } from '../../shared/api'
export * from '../../shared/api'

/** The hosted backend (Render free plan, sleeps when idle: the first request can take ~50 s). */
export const DEFAULT_SERVER = 'https://jobpilot-api-gpa6.onrender.com'
let server = DEFAULT_SERVER
let token: string | null = null
export const auth = { onSignedOut: () => {} }

export const api = createApi({
  baseUrl: () => server,
  getToken: () => token,
  onUnauthorized: () => { setToken(null); auth.onSignedOut() },
})

export async function loadStored() {
  server = (await SecureStore.getItemAsync('server')) || DEFAULT_SERVER
  token = await SecureStore.getItemAsync('token')
  return { server, token }
}
export async function setServer(s: string) {
  server = s.trim().replace(/\/+$/, '')
  if (!/^https?:\/\//.test(server)) server = 'http://' + server
  await SecureStore.setItemAsync('server', server)
}
export function setToken(t: string | null) {
  token = t
  return t ? SecureStore.setItemAsync('token', t) : SecureStore.deleteItemAsync('token')
}
export const serverAddress = () => server
/** The signed-in token, for handing to the live-interview WebView (in the URL fragment, never sent to the server). */
export const currentToken = () => token

export const msg = (e: unknown) =>
  e instanceof ApiError ? e.message : server === DEFAULT_SERVER
    ? 'The server is waking up (free hosting sleeps when idle). Wait half a minute and try again.'
    : `Can't reach ${server || 'the server'}. Is the PC on, JobPilot running, and the phone on the same Wi-Fi?`

export type Gaps = { missing: string[]; percent: number }
type Session = { user: User | null; setUser: (u: User | null) => void; gaps: Gaps | null; recheck: () => Promise<void> }
export const SessionCtx = createContext<Session>({ user: null, setUser: () => {}, gaps: null, recheck: async () => {} })
export const useSession = () => useContext(SessionCtx)

/** Downloads a tailored resume / cover letter as PDF and opens the share sheet (save, WhatsApp, mail...). */
export async function sharePdf(docId: string, fallbackName: string) {
  const res = await api.documentFile(docId, 'pdf')
  const header = /filename\*=UTF-8''([^;]+)/.exec(res.headers.get('Content-Disposition') ?? '')?.[1]
  const name = (header ? decodeURIComponent(header) : fallbackName).replace(/[\\/:*?"<>|]/g, '_')
  const f = new File(Paths.cache, name)
  if (f.exists) f.delete()
  f.create()
  f.write(new Uint8Array(await res.arrayBuffer()))
  await Sharing.shareAsync(f.uri, { mimeType: 'application/pdf', dialogTitle: name })
}

/** Downloads the interview recording (kept on the server for 1 hour) and opens the share sheet to save it. */
export async function shareRecording(sessionId: string) {
  const res = await api.recordingFile(sessionId)
  const type = res.headers.get('Content-Type') ?? 'video/webm'
  const name = `jobpilot-interview-${sessionId.slice(0, 8)}.${type.includes('mp4') ? 'mp4' : 'webm'}`
  const f = new File(Paths.cache, name)
  if (f.exists) f.delete()
  f.create()
  f.write(new Uint8Array(await res.arrayBuffer()))
  await Sharing.shareAsync(f.uri, { mimeType: type, dialogTitle: name })
}

export function ago(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  return d <= 0 ? 'today' : d === 1 ? 'yesterday' : d < 30 ? `${d}d ago` : new Date(iso).toLocaleDateString()
}

/** Is this clipboard text a link worth offering as a job? */
export function looksLikeJob(s: string) {
  const t = s.trim()
  if (!/^https?:\/\/\S+$/i.test(t)) return false
  return /greenhouse|lever\.co|myworkdayjobs|workday|smartrecruiters|ashbyhq|workable|linkedin\.com\/jobs|naukri|indeed|instahyre|wellfound|careers?|jobs?|position|opening|vacanc|apply/i.test(t)
}

/** Label + tag tone per status, in the order the Applications list shows them. */
export const STATUS: Record<ApplicationStatus, [string, 'warn' | 'accent' | 'ink' | 'danger' | undefined]> = {
  NEEDS_INPUT: ['Needs your answers', 'warn'],
  FAILED: ['Needs attention', 'danger'],
  READY: ['Ready to fill', 'accent'],
  FILLING: ['Filling…', undefined],
  SUBMITTED: ['Submitted', 'ink'],
}

