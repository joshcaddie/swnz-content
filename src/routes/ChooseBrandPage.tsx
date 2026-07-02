import { BRANDS } from '../brands'
import { BrandLogo } from '../components/BrandLogo'
import { useBrand } from '../lib/brand'
import { useAuth } from '../lib/auth'
import { C } from '../theme'

/** Shown after login until a dashboard is picked (and via "Choose dashboard" in the menu). */
export function ChooseBrandPage() {
  const { setBrandId } = useBrand()
  const { profile, signOut } = useAuth()

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 6, background: `linear-gradient(90deg,#1ed79a 0%,#1ba0e6 50%,${BRANDS.caddie.accent} 100%)` }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 30 }}>
        <div style={{ fontWeight: 800, fontSize: 30, color: C.inkDark, marginBottom: 6 }}>
          {profile?.name ? `Kia ora, ${profile.name.split(' ')[0]}` : 'Kia ora'}
        </div>
        <div style={{ color: C.muted, fontSize: 17, marginBottom: 40 }}>Which dashboard would you like to work in?</div>

        <div style={{ display: 'flex', gap: 26, flexWrap: 'wrap', justifyContent: 'center' }}>
          <div
            onClick={() => setBrandId('swnz')}
            className="swnz-hover-lift"
            style={{ width: 340, background: BRANDS.swnz.topBar, borderRadius: 20, padding: '44px 34px', cursor: 'pointer', textAlign: 'center', boxShadow: '0 10px 34px rgba(22,41,74,.25)' }}
          >
            <BrandLogo brand={BRANDS.swnz} size={64} />
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 21, marginTop: 18 }}>School Websites</div>
            <div style={{ color: '#9fb3d4', fontSize: 14, marginTop: 6 }}>New Zealand</div>
            <div style={{ display: 'inline-block', marginTop: 24, background: BRANDS.swnz.gradient, color: '#fff', fontWeight: 800, fontSize: 13, letterSpacing: '0.5px', padding: '12px 26px', borderRadius: 24 }}>OPEN DASHBOARD</div>
          </div>

          <div
            onClick={() => setBrandId('caddie')}
            className="swnz-hover-lift"
            style={{ width: 340, background: '#fff', border: '1px solid #eee7e5', borderRadius: 20, padding: '44px 34px', cursor: 'pointer', textAlign: 'center', boxShadow: '0 10px 34px rgba(240,80,60,.14)' }}
          >
            <BrandLogo brand={BRANDS.caddie} size={64} />
            <div style={{ color: '#2b2530', fontWeight: 800, fontSize: 21, marginTop: 18 }}>Caddie Digital</div>
            <div style={{ color: BRANDS.caddie.accent, fontSize: 14, marginTop: 6 }}>{BRANDS.caddie.tagline}</div>
            <div style={{ display: 'inline-block', marginTop: 24, background: BRANDS.caddie.gradient, color: '#fff', fontWeight: 800, fontSize: 13, letterSpacing: '0.5px', padding: '12px 26px', borderRadius: 24 }}>OPEN DASHBOARD</div>
          </div>
        </div>

        <div onClick={signOut} style={{ marginTop: 44, color: C.muted2, fontSize: 14, textDecoration: 'underline', cursor: 'pointer' }}>Sign out</div>
      </div>
    </div>
  )
}
