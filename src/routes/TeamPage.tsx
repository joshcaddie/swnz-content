import { useState } from 'react'
import { useProfiles } from '../api/profiles'
import { useBoard, initialsOf } from '../api/requests'
import { supabase } from '../lib/supabase'
import { Modal } from './ClientsPage'
import { C } from '../theme'
import { FullScreenMessage } from '../App'

export function TeamPage() {
  const { data: profiles, isLoading } = useProfiles()
  const { data: cards } = useBoard()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [invName, setInvName] = useState('')
  const [invEmail, setInvEmail] = useState('')
  const [note, setNote] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (isLoading) return <FullScreenMessage text="Loading team…" />

  const countFor = (name: string) => (cards ?? []).filter((c) => c.ownerName === name).length

  const sendInvite = async () => {
    if (!invEmail.trim()) return
    setBusy(true)
    setNote(null)
    try {
      const signupUrl = `${window.location.origin}/login`
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          kind: 'custom',
          to: invEmail.trim(),
          subject: "You're invited to SWNZ Content",
          heading: 'Join the SWNZ Content team',
          body: `<p>Kia ora${invName ? ` ${invName}` : ''},</p>
                 <p>You've been invited to the School Websites New Zealand content desk —
                 where we build and review website content requests for our schools.</p>
                 <p><a href="${signupUrl}" style="display:inline-block;background:#1d3a5f;color:#fff;font-weight:700;text-decoration:none;padding:13px 26px;border-radius:26px;margin-top:10px;">Create your account</a></p>
                 <p style="color:#6f6a7a;font-size:13px;">Use this email address (${invEmail.trim()}) when signing up, and click "Sign up" on the login page.</p>`,
        },
      })
      if (error || data?.error || data?.ok === false) {
        setNote(`⚠ Could not send the invite: ${error?.message ?? data?.error ?? 'email service error'}`)
      } else {
        setNote(`✓ Invite sent to ${invEmail.trim()}`)
        setInviteOpen(false)
        setInvName('')
        setInvEmail('')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="swnz-scroll" style={{ flex: 1, overflowY: 'auto', padding: '28px 36px 60px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ fontWeight: 800, fontSize: 30, color: C.inkDark, flex: 1 }}>Team</div>
          <div onClick={() => { setNote(null); setInviteOpen(true) }} style={{ background: C.navy2, color: '#fff', fontWeight: 800, fontSize: 13, letterSpacing: '0.5px', padding: '13px 22px', borderRadius: 26, cursor: 'pointer' }}>
            ＋ INVITE TEAM MEMBER
          </div>
        </div>
        <div style={{ color: C.muted, fontSize: 15, margin: '6px 0 12px' }}>
          Invited members get an email with a link to create their account.
        </div>
        {note && <div style={{ color: note.startsWith('✓') ? '#1f8a4c' : '#c9491f', fontWeight: 700, fontSize: 14, marginBottom: 12 }}>{note}</div>}

        <div style={{ background: '#fff', border: '1px solid #e9e8ee', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 10px rgba(40,30,60,.05)', marginTop: 12 }}>
          {(profiles ?? []).map((p, i) => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 24px', borderTop: i ? '1px solid #f0eff3' : 'none' }}>
              <div style={{ width: 46, height: 46, borderRadius: '50%', background: p.avatar_color, color: '#16294a', fontWeight: 800, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>{initialsOf(p.name)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 17, color: C.inkDark }}>{p.name}</div>
                <div style={{ color: '#7b7686', fontSize: 14 }}>{p.email}</div>
              </div>
              <div style={{ color: C.muted, fontSize: 14 }}>{countFor(p.name)} request{countFor(p.name) === 1 ? '' : 's'}</div>
              <div style={{ background: '#e6f3fb', color: C.navy2, fontWeight: 800, fontSize: 12, letterSpacing: '0.5px', padding: '5px 12px', borderRadius: 7 }}>{p.role.toUpperCase()}</div>
            </div>
          ))}
          {(profiles ?? []).length === 0 && <div style={{ padding: 24, color: C.muted }}>No team members yet.</div>}
        </div>
      </div>

      {inviteOpen && (
        <Modal title="Invite a team member" onClose={() => setInviteOpen(false)} onSave={sendInvite} saveLabel={busy ? 'SENDING…' : 'SEND INVITE'}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#4b4556', marginBottom: 8 }}>Name (optional)</div>
            <input autoFocus value={invName} onChange={(e) => setInvName(e.target.value)} style={inviteInput} />
          </div>
          <div style={{ marginBottom: 6 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#4b4556', marginBottom: 8 }}>Email address</div>
            <input type="email" value={invEmail} onChange={(e) => setInvEmail(e.target.value)} placeholder="name@websites.school.nz" style={inviteInput} />
          </div>
          <div style={{ color: C.muted2, fontSize: 13 }}>They'll receive an email with a link to sign up. Once they create their account they appear here automatically.</div>
        </Modal>
      )}
    </div>
  )
}

const inviteInput: React.CSSProperties = {
  width: '100%', border: '1px solid #e1e0e7', borderRadius: 10, padding: '13px 15px', fontFamily: 'inherit', fontSize: 16, color: C.ink, outline: 'none',
}
