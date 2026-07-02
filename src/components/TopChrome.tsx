import { useState, type CSSProperties } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { initialsOf } from '../api/requests'
import { useAwaitingCount } from '../api/activity'
import { C } from '../theme'

const qaRow: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', borderRadius: 10, cursor: 'pointer',
}

export function TopChrome() {
  const navigate = useNavigate()
  const location = useLocation()
  const { profile, signOut } = useAuth()
  const { data: awaiting } = useAwaitingCount()
  const [qaOpen, setQaOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const isRequests = location.pathname === '/' || location.pathname.startsWith('/requests')
  const go = (to: string) => {
    setQaOpen(false)
    navigate(to)
  }
  const tab = (label: string, to: string, active = false) => (
    <div
      onClick={() => go(to)}
      style={{
        color: active ? C.cyanBright : '#e7e2ef',
        fontWeight: active ? 700 : 500,
        fontSize: 17,
        cursor: 'pointer',
        position: 'relative',
      }}
    >
      {label}
      {active && (
        <span style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', bottom: -12, width: 5, height: 5, borderRadius: '50%', background: C.cyanBright }} />
      )}
    </div>
  )

  const profName = profile?.name || 'Account'
  const profColor = profile?.avatar_color || '#e7a36b'

  return (
    <>
      <div style={{ height: 6, background: C.brandBar, flex: 'none' }} />
      <div style={{ background: C.navy, height: 74, flex: 'none', display: 'flex', alignItems: 'center', padding: '0 26px', gap: 30, position: 'sticky', top: 0, zIndex: 40 }}>
        <div onClick={() => go('/')} style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', flex: 'none' }}>
          <img src="/assets/swnz-icon.png" alt="SWNZ" style={{ width: 48, height: 48, objectFit: 'contain', flex: 'none' }} />
          <div style={{ color: '#fff', fontWeight: 800, fontSize: 20, letterSpacing: '0.2px' }}>School Websites New Zealand</div>
        </div>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 34 }}>
          {tab('Requests', '/', isRequests)}
          {tab('Calendar', '/calendar', location.pathname === '/calendar')}
          {tab('Clients', '/clients', location.pathname === '/clients')}
          {tab('Team', '/team', location.pathname === '/team')}
          {tab('Templates', '/templates', location.pathname === '/templates')}
          {tab('Reminders', '/reminders', location.pathname === '/reminders')}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 22, flex: 'none' }}>
          <div onClick={() => go('/activity')} title={`${awaiting ?? 0} answer(s) awaiting review`} style={{ position: 'relative', color: '#e7e2ef', fontSize: 21, cursor: 'pointer' }}>🔔
            {(awaiting ?? 0) > 0 && (
              <span style={{ position: 'absolute', top: -7, right: -9, background: C.cyanBright, color: '#fff', fontSize: 11, fontWeight: 800, minWidth: 18, height: 18, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>{awaiting! > 9 ? '9+' : awaiting}</span>
            )}
          </div>
          <div style={{ position: 'relative', width: 26, height: 26, borderRadius: '50%', border: '2px solid #e7e2ef', color: '#e7e2ef', fontWeight: 800, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>?</div>

          <div style={{ position: 'relative' }}>
            <div onClick={() => setMenuOpen((v) => !v)} style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: profColor, border: '2px solid #2a3f5c', color: '#16294a', fontWeight: 800, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{initialsOf(profName)}</div>
              <span style={{ color: '#e7e2ef', fontSize: 12 }}>▾</span>
            </div>
            {menuOpen && (
              <div style={{ position: 'absolute', top: 52, right: 0, width: 200, background: '#fff', borderRadius: 12, boxShadow: '0 14px 40px rgba(16,28,52,.28)', padding: 8, zIndex: 60 }}>
                <div style={{ padding: '10px 12px', color: C.ink, fontWeight: 700, fontSize: 15 }}>{profName}</div>
                <div className="swnz-hover swnz-hover-blue" onClick={() => { setMenuOpen(false); signOut() }} style={{ ...qaRow, color: '#c9491f', fontWeight: 700 }}>Sign out</div>
              </div>
            )}
          </div>

          <div onClick={() => setQaOpen((v) => !v)} style={{ background: C.gradient, color: '#fff', fontWeight: 800, fontSize: 14, letterSpacing: '0.6px', padding: '13px 20px', borderRadius: 26, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', boxShadow: '0 4px 14px rgba(27,160,230,.32)' }}>
            QUICK ACTIONS <span style={{ fontSize: 11 }}>▾</span>
          </div>
          {qaOpen && (
            <div style={{ position: 'absolute', top: 70, right: 26, width: 248, background: '#fff', borderRadius: 14, boxShadow: '0 14px 40px rgba(16,28,52,.28)', padding: 8, zIndex: 50 }}>
              <div onClick={() => go('/requests/new')} className="swnz-hover swnz-hover-blue" style={qaRow}>
                <span style={{ width: 34, height: 34, borderRadius: 9, background: '#e6f3fb', color: C.navy2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flex: 'none' }}>＋</span>
                <span style={{ fontWeight: 700, fontSize: 16, color: C.ink }}>Add Request</span>
              </div>
              <div onClick={() => go('/clients')} className="swnz-hover swnz-hover-blue" style={qaRow}>
                <span style={{ width: 34, height: 34, borderRadius: 9, background: '#dff0fb', color: C.cyan, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flex: 'none' }}>👤</span>
                <span style={{ fontWeight: 700, fontSize: 16, color: C.ink }}>Add Client</span>
              </div>
              <div onClick={() => go('/templates')} className="swnz-hover swnz-hover-blue" style={qaRow}>
                <span style={{ width: 34, height: 34, borderRadius: 9, background: '#e7f5f1', color: '#1b9e7a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flex: 'none' }}>📄</span>
                <span style={{ fontWeight: 700, fontSize: 16, color: C.ink }}>Templates</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
