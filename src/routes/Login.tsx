import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { C } from '../theme'

export function Login() {
  const { session, signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [info, setInfo] = useState<string | null>(null)

  if (session) return <Navigate to="/" replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setBusy(true)
    const res = await signIn(email, password)
    setBusy(false)
    if (res.error) setError(res.error)
  }

  const input: React.CSSProperties = {
    width: '100%', border: '1px solid #e1e0e7', borderRadius: 10, padding: '14px 16px',
    fontFamily: 'inherit', fontSize: 16, color: C.ink, outline: 'none', marginBottom: 14,
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 6, background: C.brandBar }} />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ width: 420, maxWidth: '100%', background: '#fff', borderRadius: 18, padding: 40, boxShadow: '0 10px 40px rgba(16,28,52,.12)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
            <img src="/assets/swnz-icon.png" alt="Get Content" style={{ width: 46, height: 46 }} />
            <div style={{ fontWeight: 800, fontSize: 20, color: C.navy }}>Get Content</div>
          </div>
          <div style={{ fontWeight: 800, fontSize: 24, color: C.inkDark, marginBottom: 6 }}>Sign in</div>
          <div style={{ color: C.muted, fontSize: 15, marginBottom: 24 }}>Welcome back to the content desk.</div>

          <form onSubmit={submit}>
            <input style={input} type="email" name="username" autoComplete="username" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input style={input} type="password" name="password" autoComplete="current-password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />

            {error && <div style={{ color: '#c9491f', fontSize: 14, marginBottom: 12 }}>{error}</div>}
            {info && <div style={{ color: '#1f8a4c', fontSize: 14, marginBottom: 12 }}>{info}</div>}

            <button type="submit" disabled={busy} style={{ width: '100%', background: C.navy2, color: '#fff', fontWeight: 800, fontSize: 15, letterSpacing: '0.4px', padding: '15px', borderRadius: 28, border: 'none', cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.7 : 1 }}>
              {busy ? 'Please wait…' : 'SIGN IN'}
            </button>
          </form>

          <div style={{ marginTop: 16, fontSize: 14, textAlign: 'center' }}>
            <span
              onClick={async () => {
                if (!email) { setError('Enter your email above first, then click "Forgot password".'); return }
                setError(null)
                const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset` })
                setInfo(error ? error.message : `Password reset link sent to ${email}.`)
              }}
              style={{ color: C.muted2, textDecoration: 'underline', cursor: 'pointer' }}
            >
              Forgot password?
            </span>
          </div>
          <div style={{ marginTop: 12, fontSize: 13, color: C.muted2, textAlign: 'center' }}>
            Access is invite-only — ask a team member to invite you from the Team page.
          </div>
        </div>
      </div>
    </div>
  )
}
