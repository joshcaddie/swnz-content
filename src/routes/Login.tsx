import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { C } from '../theme'

export function Login() {
  const { session, signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [name, setName] = useState('')
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
    const res = mode === 'in' ? await signIn(email, password) : await signUp(name, email, password)
    setBusy(false)
    if (res.error) {
      setError(res.error)
    } else if (mode === 'up') {
      setInfo('Account created. You can sign in now.')
      setMode('in')
    }
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
            <img src="/assets/swnz-icon.png" alt="SWNZ" style={{ width: 46, height: 46 }} />
            <div style={{ fontWeight: 800, fontSize: 20, color: C.navy }}>SWNZ Content</div>
          </div>
          <div style={{ fontWeight: 800, fontSize: 24, color: C.inkDark, marginBottom: 6 }}>
            {mode === 'in' ? 'Sign in' : 'Create your account'}
          </div>
          <div style={{ color: C.muted, fontSize: 15, marginBottom: 24 }}>
            {mode === 'in' ? 'Welcome back to the SWNZ content desk.' : 'Set up a team account to manage content requests.'}
          </div>

          <form onSubmit={submit}>
            {mode === 'up' && (
              <input style={input} placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} required />
            )}
            <input style={input} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input style={input} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />

            {error && <div style={{ color: '#c9491f', fontSize: 14, marginBottom: 12 }}>{error}</div>}
            {info && <div style={{ color: '#1f8a4c', fontSize: 14, marginBottom: 12 }}>{info}</div>}

            <button type="submit" disabled={busy} style={{ width: '100%', background: C.navy2, color: '#fff', fontWeight: 800, fontSize: 15, letterSpacing: '0.4px', padding: '15px', borderRadius: 28, border: 'none', cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.7 : 1 }}>
              {busy ? 'Please wait…' : mode === 'in' ? 'SIGN IN' : 'CREATE ACCOUNT'}
            </button>
          </form>

          <div style={{ marginTop: 18, fontSize: 14, color: C.muted, textAlign: 'center' }}>
            {mode === 'in' ? "Don't have an account? " : 'Already have one? '}
            <span onClick={() => { setMode(mode === 'in' ? 'up' : 'in'); setError(null) }} style={{ color: C.cyan, fontWeight: 700, cursor: 'pointer' }}>
              {mode === 'in' ? 'Sign up' : 'Sign in'}
            </span>
          </div>
          {mode === 'in' && (
            <div style={{ marginTop: 10, fontSize: 14, textAlign: 'center' }}>
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
          )}
        </div>
      </div>
    </div>
  )
}
