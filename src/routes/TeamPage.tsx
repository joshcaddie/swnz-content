import { useProfiles } from '../api/profiles'
import { useBoard, initialsOf } from '../api/requests'
import { C } from '../theme'
import { FullScreenMessage } from '../App'

export function TeamPage() {
  const { data: profiles, isLoading } = useProfiles()
  const { data: cards } = useBoard()

  if (isLoading) return <FullScreenMessage text="Loading team…" />

  const countFor = (name: string) => (cards ?? []).filter((c) => c.ownerName === name).length

  return (
    <div className="swnz-scroll" style={{ flex: 1, overflowY: 'auto', padding: '28px 36px 60px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ fontWeight: 800, fontSize: 30, color: C.inkDark }}>Team</div>
        <div style={{ color: C.muted, fontSize: 15, margin: '6px 0 24px' }}>
          Everyone with a team login. New members simply sign up on the login page.
        </div>
        <div style={{ background: '#fff', border: '1px solid #e9e8ee', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 10px rgba(40,30,60,.05)' }}>
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
    </div>
  )
}
