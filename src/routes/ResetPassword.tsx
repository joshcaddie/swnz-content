import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { C } from '../theme'

/** Landing page for the password-recovery email link (Supabase auth). */
export function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (error) setError(error.message)
    else navigate('/')
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 6, background: C.brandBar }} />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <form onSubmit={submit} style={{ width: 420, maxWidth: '100%', background: '#fff', borderRadius: 18, padding: 40, boxShadow: '0 10px 40px rgba(16,28,52,.12)' }}>
          <div style={{ fontWeight: 800, fontSize: 24, color: C.inkDark, marginBottom: 6 }}>Set a new password</div>
          <div style={{ color: C.muted, fontSize: 15, marginBottom: 24 }}>Enter a new password for your account.</div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New password"
            minLength={6}
            required
            style={{ width: '100%', border: '1px solid #e1e0e7', borderRadius: 10, padding: '14px 16px', fontFamily: 'inherit', fontSize: 16, outline: 'none', marginBottom: 14 }}
          />
          {error && <div style={{ color: '#c9491f', fontSize: 14, marginBottom: 12 }}>{error}</div>}
          <button type="submit" disabled={busy} style={{ width: '100%', background: C.navy2, color: '#fff', fontWeight: 800, fontSize: 15, padding: 15, borderRadius: 28, border: 'none', cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.7 : 1 }}>
            {busy ? 'Saving…' : 'SAVE PASSWORD'}
          </button>
        </form>
      </div>
    </div>
  )
}
