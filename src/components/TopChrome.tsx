import { useState, type CSSProperties } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useBrand } from '../lib/brand'
import { otherBrand } from '../brands'
import { BrandLogo } from './BrandLogo'
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
  const { brand, brandId, setBrandId, clearBrand } = useBrand()
  const other = otherBrand(brandId ?? 'swnz')
  const { data: awaiting } = useAwaitingCount()
  const [qaOpen, setQaOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const switchBrand = () => {
    setBrandId(other.id)
    navigate('/')
  }

  const isRequests = location.pathname === '/' || location.pathname.startsWith('/requests')
  const go = (to: string) => {
    setQaOpen(false)
    navigate(to)
  }
  const tab = (label: string, to: string, active = false) => (
    <div
      onClick={() => go(to)}
      style={{
        color: active ? brand.accentBright : '#e7e2ef',
        fontWeight: active ? 700 : 500,
        fontSize: 17,
        cursor: 'pointer',
        position: 'relative',
      }}
    >
      {label}
      {active && (
        <span style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', bottom: -12, width: 5, height: 5, borderRadius: '50%', background: brand.accentBright }} />
      )}
    </div>
  )

  const profName = profile?.name || 'Account'
  const profColor = profile?.avatar_color || '#e7a36b'

  return (
    <>
      <div style={{ height: 6, background: brand.bar, flex: 'none' }} />
      <div style={{ background: brand.topBar, height: 74, flex: 'none', display: 'flex', alignItems: 'center', padding: '0 26px', gap: 30, position: 'sticky', top: 0, zIndex: 40 }}>
        <div onClick={() => go('/')} style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', flex: 'none' }}>
          <BrandLogo brand={brand} size={48} light={!brand.logoImg} />
          {brand.logoImg && <div style={{ color: '#fff', fontWeight: 800, fontSize: 20, letterSpacing: '0.2px' }}>{brand.name}</div>}
        </div>
        <div
          onClick={switchBrand}
          title={`Switch to the ${other.name} dashboard`}
          style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1.5px solid rgba(255,255,255,.35)', color: '#e7e2ef', fontWeight: 800, fontSize: 12, letterSpacing: '0.6px', padding: '9px 14px', borderRadius: 20, cursor: 'pointer', flex: 'none' }}
        >
          ⇄ {other.short.toUpperCase()}
        </div>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 34 }}>
          {tab('Requests', '/', isRequests)}
          {tab('Clients', '/clients', location.pathname === '/clients')}
          {tab('Team', '/team', location.pathname === '/team')}
          {tab('Templates', '/templates', location.pathname === '/templates')}
          {tab('Reminders', '/reminders', location.pathname === '/reminders')}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 22, flex: 'none' }}>
          <div onClick={() => go('/activity')} title={`${awaiting ?? 0} answer(s) awaiting review`} style={{ position: 'relative', color: '#e7e2ef', fontSize: 21, cursor: 'pointer' }}>🔔
            {(awaiting ?? 0) > 0 && (
              <span style={{ position: 'absolute', top: -7, right: -9, background: brand.accentBright, color: '#fff', fontSize: 11, fontWeight: 800, minWidth: 18, height: 18, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>{awaiting! > 9 ? '9+' : awaiting}</span>
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
                <div className="swnz-hover swnz-hover-blue" onClick={() => { setMenuOpen(false); clearBrand() }} style={{ ...qaRow, color: C.ink, fontWeight: 700 }}>Choose dashboard</div>
                <div className="swnz-hover swnz-hover-blue" onClick={() => { setMenuOpen(false); signOut() }} style={{ ...qaRow, color: '#c9491f', fontWeight: 700 }}>Sign out</div>
              </div>
            )}
          </div>

          <div onClick={() => setQaOpen((v) => !v)} style={{ background: brand.gradient, color: '#fff', fontWeight: 800, fontSize: 14, letterSpacing: '0.6px', padding: '13px 20px', borderRadius: 26, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', boxShadow: '0 4px 14px rgba(0,0,0,.22)' }}>
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
