import { useState } from 'react'
import { Image, View } from 'react-native'
import { api, ApiError, DEFAULT_SERVER, msg, serverAddress, setServer, setToken, useSession } from '../src/lib'
import { Btn, Chip, ErrorText, Input, Row, Screen, T, Title } from '../src/ui'

export default function SignIn() {
  const { setUser } = useSession()
  const [register, setRegister] = useState(false)
  const [server, setServerText] = useState(serverAddress())
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<{ text: string; fields?: Record<string, string> } | null>(null)
  const [busy, setBusy] = useState(false)
  const [custom, setCustom] = useState(serverAddress() !== DEFAULT_SERVER)

  async function submit() {
    if (!server.trim()) return setError({ text: 'Enter the server address.' })
    setBusy(true)
    setError(null)
    try {
      await setServer(custom ? server : DEFAULT_SERVER)
      setServerText(serverAddress())
      const res = register ? await api.register(email.trim(), password, fullName.trim()) : await api.login(email.trim(), password)
      await setToken(res.token)
      setUser(res.user)
    } catch (e) {
      setError({ text: msg(e), fields: e instanceof ApiError ? e.fields : undefined })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen>
      <View style={{ marginTop: 24, marginBottom: 8, gap: 12 }}>
        <Image source={require('../assets/icon.png')} style={{ width: 72, height: 72, borderRadius: 18 }} accessibilityLabel="JobPilot logo" />
        <Title kicker="JobPilot">{register ? 'Create your account' : 'Welcome back'}</Title>
        <T muted>Your AI job agent: it finds jobs that fit your resume, prepares every application and asks you only what it can't answer.</T>
      </View>
      <Row>
        <Chip label="Sign in" on={!register} onPress={() => setRegister(false)} />
        <Chip label="Create account" on={register} onPress={() => setRegister(true)} />
      </Row>
      {custom
        ? <Input label="Server address" value={server} onChangeText={setServerText} placeholder="http://192.168.x.x:8080"
            autoCapitalize="none" autoCorrect={false} keyboardType="url"
            hint="Only for your own JobPilot server, e.g. the PC on your Wi-Fi with :8080." />
        : null}
      <T small muted onPress={() => { setCustom(!custom); setServerText(custom ? DEFAULT_SERVER : '') }}>
        {custom ? 'Use the JobPilot cloud server' : 'Use my own server instead'}
      </T>
      {register && <Input label="Full name" value={fullName} onChangeText={setFullName} autoComplete="name" maxLength={120} error={error?.fields?.fullName} />}
      <Input label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" error={error?.fields?.email} />
      <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry maxLength={72}
        autoComplete={register ? 'new-password' : 'current-password'} hint={register ? 'At least 8 characters.' : undefined} error={error?.fields?.password} />
      {error && !error.fields && <ErrorText>{error.text}</ErrorText>}
      <Btn title={register ? 'Create account' : 'Sign in'} onPress={submit} busy={busy} />
    </Screen>
  )
}
