import type { CSSProperties } from 'react'

interface Props {
  onBack: () => void
}

const gettingStarted: CSSProperties = {
  background: 'linear-gradient(135deg,#1ed79a,#1ba0e6)',
  color: '#fff',
  fontWeight: 800,
  fontSize: 13,
  letterSpacing: '0.6px',
  padding: 14,
  borderRadius: 26,
  textAlign: 'center',
  cursor: 'pointer',
  boxShadow: '0 4px 12px rgba(27,160,230,.3)',
}

const emptyCircle = (size: number, color: string): CSSProperties => ({
  width: size,
  height: size,
  border: `2px solid ${color}`,
  borderRadius: '50%',
})

// Home-page question list — the active (highlighted) one is index 1.
const QUESTIONS = [
  'What is your website address?',
  'Please list at least 3 websites that …',
  'What are your goals of the new w…',
  'What colours represent your Scho…',
  'Do you have a tagline, Values, Visi…',
  'Logos, Brandkit, Stratgic Plan docs…',
  'Main header images',
  'What forms of communication an…',
  'Ideally, when would you like to ha…',
  'Do you have your web content rea…',
  'Are you interested in moving to a …',
]

export function OrangaDetail({ onBack }: Props) {
  return (
    <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
      {/* sidebar */}
      <div style={{ width: 625, flex: 'none', background: '#fff', borderRight: '1px solid #e6e5ec', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ padding: '26px 28px 18px', borderBottom: '1px solid #eeedf1' }}>
          <div style={{ fontWeight: 800, fontSize: 30, lineHeight: 1.2, color: '#241d33' }}>Oranga School - Design brief</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14 }}>
            <span style={{ color: '#8b8595', fontWeight: 600, fontSize: 15 }}>Due: 12/07/2026</span>
            <span style={{ background: '#dbe6f6', color: '#5570a0', fontWeight: 800, fontSize: 12, letterSpacing: '0.6px', padding: '5px 11px', borderRadius: 7 }}>ACTIVE</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginTop: 18 }}>
            <div style={{ width: 46, height: 46, borderRadius: '50%', background: '#86d29a', color: '#1f3a28', fontWeight: 800, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>BL</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 17, color: '#2b2535' }}>Bridget Lummis &nbsp;-&nbsp; Oranga School</div>
              <div style={{ color: '#7b7686', fontSize: 14, marginTop: 3 }}>✉ principal@oranga.school.nz</div>
            </div>
          </div>
        </div>

        <div className="swnz-scroll" style={{ flex: 1, overflowY: 'auto', padding: 18 }}>
          <div style={{ background: '#1d3a5f', borderRadius: 30, display: 'flex', alignItems: 'center', padding: '13px 20px', color: '#fff', gap: 12 }}>
            <span style={{ fontSize: 13 }}>▲</span>
            <span style={{ fontWeight: 800, fontSize: 17, flex: 1 }}>1. Home page</span>
            <span style={{ fontWeight: 700, fontSize: 15 }}>1/11</span>
            <span style={emptyCircle(20, '#ffffff99')} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', padding: '14px 20px 8px' }}>
            <span style={{ fontWeight: 800, fontSize: 16, color: '#2b2535', flex: 1 }}>1.1. Get started</span>
            <span style={{ fontWeight: 700, fontSize: 15, color: '#4b4556', marginRight: 12 }}>1/11</span>
            <span style={emptyCircle(20, '#cfcdd6')} />
          </div>

          <div style={{ paddingLeft: 14 }}>
            {/* completed first question */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '11px 14px', borderLeft: '2px solid #e4e2ea' }}>
              <span style={{ fontSize: 16, color: '#3b3548', flex: 1 }}>{QUESTIONS[0]}</span>
              <span style={{ width: 24, height: 24, borderRadius: '50%', background: '#28b463', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800 }}>✓</span>
            </div>
            {/* active question */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '11px 14px', borderLeft: '2px solid #1d3a5f', background: '#e9f5fc', borderRadius: '0 8px 8px 0' }}>
              <span style={{ fontSize: 16, color: '#1d3a5f', fontWeight: 600, flex: 1 }}>{QUESTIONS[1]}</span>
              <span style={emptyCircle(22, '#a9d6ef')} />
            </div>
            {/* remaining */}
            {QUESTIONS.slice(2).map((q) => (
              <div key={q} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '11px 14px', borderLeft: '2px solid #e4e2ea' }}>
                <span style={{ fontSize: 16, color: '#3b3548', flex: 1 }}>{q}</span>
                <span style={emptyCircle(22, '#cfcdd6')} />
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: 18, borderTop: '1px solid #eeedf1' }}>
          <div style={gettingStarted}>GETTING STARTED - VALUE…</div>
        </div>
      </div>

      {/* right panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, background: '#f3f3f6' }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '22px 30px', gap: 16 }}>
          <div onClick={onBack} style={{ width: 48, height: 48, borderRadius: '50%', background: '#fff', border: '1px solid #e1e0e7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6f6a7a', fontSize: 20, cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,.05)' }}>‹</div>
          <div style={{ flex: 1 }} />
          <div style={{ border: '1.5px solid #1493d6', color: '#1493d6', fontWeight: 800, fontSize: 13, letterSpacing: '0.5px', padding: '11px 18px', borderRadius: 22, display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', background: '#fff' }}>⚡ ACTIVITY</div>
          <div style={{ background: '#1d3a5f', color: '#fff', fontWeight: 800, fontSize: 13, letterSpacing: '0.5px', padding: '13px 22px', borderRadius: 26, cursor: 'pointer' }}>APPROVE ALL SUBMITTED</div>
          <div style={{ color: '#6f6a7a', fontWeight: 800, fontSize: 20, cursor: 'pointer' }}>⋯</div>
        </div>

        <div className="swnz-scroll" style={{ flex: 1, overflowY: 'auto', padding: '0 40px 40px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}>
            <div style={{ border: '1.5px solid #bcd4f0', color: '#3f6cab', background: '#eaf2fc', fontWeight: 700, fontSize: 16, padding: '9px 22px', borderRadius: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
              Approve 0 / 1 <span style={{ fontSize: 11 }}>▾</span>
            </div>
          </div>
          <div style={{ background: '#fff', border: '1.5px solid #bfe0f2', borderRadius: 20, padding: '42px 46px', maxWidth: 1500, margin: '0 auto', boxShadow: '0 6px 22px rgba(60,40,90,.08)' }}>
            <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
              <div style={{ fontWeight: 800, fontSize: 28, lineHeight: 1.4, color: '#241d33', flex: 1 }}>
                Please list at least 3 websites that you like and specifically what you like about them. Be as specific as possible as this is probably the best way for us to determine what you are after.
              </div>
              <span style={{ color: '#9b95a5', fontSize: 20, cursor: 'pointer' }}>⤢</span>
            </div>
            <div style={{ position: 'relative', marginTop: 30 }}>
              <div style={{ minHeight: 280, background: '#f0f0f3', border: '1px solid #e3e2e8', borderRadius: 10, padding: '18px 20px', color: '#a8a4b0', fontSize: 18 }}>Enter text here...</div>
              <span style={{ position: 'absolute', top: -2, right: -34, color: '#b5b1bd', fontSize: 18 }}>⧉</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', marginTop: 34, gap: 18 }}>
              <div style={{ background: '#1d3a5f', color: '#fff', fontWeight: 800, fontSize: 15, letterSpacing: '0.4px', padding: '15px 26px', borderRadius: 28, cursor: 'pointer' }}>SUBMIT FOR REVIEW</div>
              <span style={{ color: '#6f6a7a', fontSize: 17 }}>or</span>
              <span style={{ color: '#1493d6', fontWeight: 700, fontSize: 17, textDecoration: 'underline', cursor: 'pointer' }}>Save draft and continue</span>
              <div style={{ flex: 1 }} />
              <div style={{ border: '1.5px solid #1d3a5f', color: '#1d3a5f', fontWeight: 800, fontSize: 13, letterSpacing: '0.6px', padding: '12px 22px', borderRadius: 24, cursor: 'pointer' }}>COMMENTS</div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 30 }}>
            <div style={{ width: 240, height: 8, background: '#e4e2ea', borderRadius: 6, overflow: 'hidden' }}>
              <div style={{ width: '24%', height: '100%', background: 'linear-gradient(90deg,#1ed79a,#1ba0e6)', borderRadius: 6 }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
