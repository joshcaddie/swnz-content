import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { C } from '../theme'

/**
 * Landing page for invite links. The Supabase action link signs the invitee in
 * and redirects here, where they confirm their name and choose a password.
 */
export function WelcomePage() {
  const navigate = useNavigate()
  const { session, profile, loading } = useAuth()
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const metaName = (session?.user?.user_metadata as { name?: string } | undefined)?.name
    setName((n) => n || profile?.name || metaName || '')
  }, [session, profile])

  const input: React.CSSProperties = {
    width: '100%', border: '1px solid #e1e0e7', borderRadius: 10, padding: '14px 16px',
    fontFamily: 'inherit', fontSize: 16, color: C.ink, outline: 'none', marginBottom: 14,
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (password.length < 8) { setError('Please choose a password of at least 8 characters.'); return }
    if (password !== confirm) { setError("Those passwords don't match."); return }
    setError(null)
    setBusy(true)
    try {
      const { error: uErr } = await supabase.auth.updateUser({ password, data: { name } })
      if (uErr) { setError(uErr.message); return }
      if (session?.user?.id) {
        await supabase
          .from('profiles')
          .update({ ...(name.trim() ? { name: name.trim() } : {}), invite_pending: false })
          .eq('id', session.user.id)
      }
      navigate('/', { replace: true })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 6, background: C.brandBar }} />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ width: 440, maxWidth: '100%', background: '#fff', borderRadius: 18, padding: 40, boxShadow: '0 10px 40px rgba(16,28,52,.12)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
            <img src="/assets/swnz-icon.png" alt="Get Content" style={{ width: 46, height: 46 }} />
            <div style={{ fontWeight: 800, fontSize: 20, color: C.navy }}>Get Content</div>
          </div>

          {loading ? (
            <div style={{ color: C.muted, fontSize: 15 }}>Checking your invite…</div>
          ) : !session ? (
            <>
              <div style={{ fontWeight: 800, fontSize: 24, color: C.inkDark, marginBottom: 6 }}>Invite link expired</div>
              <div style={{ color: C.muted, fontSize: 15, lineHeight: 1.6 }}>
                This invite link is invalid or has expired. Ask a team member to send you a fresh
                invite from the Team page, then use the new link within 24 hours.
              </div>
            </>
          ) : (
            <>
              <div style={{ fontWeight: 800, fontSize: 24, color: C.inkDark, marginBottom: 6 }}>Welcome aboard</div>
              <div style={{ color: C.muted, fontSize: 15, marginBottom: 24 }}>
                Confirm your name and choose a password to finish setting up your account.
              </div>
              <form onSubmit={submit}>
                <input
                  style={{ ...input, background: '#f7f7fa', color: C.muted }}
                  type="email"
                  name="username"
                  autoComplete="username"
                  value={session.user.email ?? ''}
                  readOnly
                />
                <input style={input} name="name" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} required />
                <input style={input} type="password" name="new-password" autoComplete="new-password" placeholder="Choose a password (min 8 characters)" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
                <input style={input} type="password" name="confirm-password" autoComplete="new-password" placeholder="Confirm password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
                {error && <div style={{ color: '#c9491f', fontSize: 14, marginBottom: 12 }}>{error}</div>}
                <button type="submit" disabled={busy} style={{ width: '100%', background: C.navy2, color: '#fff', fontWeight: 800, fontSize: 15, letterSpacing: '0.4px', padding: '15px', borderRadius: 28, border: 'none', cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.7 : 1 }}>
                  {busy ? 'Setting up…' : 'FINISH SETUP'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
