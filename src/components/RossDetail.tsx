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

const tick = (size: number): CSSProperties => ({
  width: size,
  height: size,
  borderRadius: '50%',
  background: '#28b463',
  color: '#fff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: size >= 24 ? 13 : 12,
  fontWeight: 800,
})

const emptyCircle: CSSProperties = {
  width: 22,
  height: 22,
  border: '2px solid #cfcdd6',
  borderRadius: '50%',
}

const collapsedSection: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: '16px 20px',
  borderTop: '1px solid #f0eff3',
}

const editorIcon: CSSProperties = { color: '#cfcdd6' }

const COLLAPSED = [
  { num: '2', name: 'Our School', frac: '2/15' },
  { num: '3', name: 'Our Learning', frac: '3/9' },
  { num: '4', name: 'Whānau Information', frac: '1/15' },
  { num: '5', name: 'News & Events', frac: '0/2' },
  { num: '6', name: 'Contact', frac: '4/5' },
]

const toolRound: CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: '50%',
  border: '1.5px solid #d8d6df',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#9b95a5',
  fontSize: 15,
  cursor: 'pointer',
}

export function RossDetail({ onBack }: Props) {
  return (
    <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
      {/* sidebar */}
      <div style={{ width: 625, flex: 'none', background: '#fff', borderRight: '1px solid #e6e5ec', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ padding: '26px 28px 18px', borderBottom: '1px solid #eeedf1' }}>
          <div style={{ fontWeight: 800, fontSize: 30, lineHeight: 1.2, color: '#241d33' }}>Ross School - inner pages content</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14 }}>
            <span style={{ color: '#8b8595', fontWeight: 600, fontSize: 15 }}>Due: 01/03/2026</span>
            <span style={{ background: '#f7d9d0', color: '#c9491f', fontWeight: 800, fontSize: 12, letterSpacing: '0.6px', padding: '5px 11px', borderRadius: 7 }}>OVERDUE</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginTop: 18 }}>
            <div style={{ width: 46, height: 46, borderRadius: '50%', background: '#c9a8e9', color: '#3a2456', fontWeight: 800, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>JL</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 17, color: '#2b2535' }}>Jodie Linklater &nbsp;-&nbsp; Ross School</div>
              <div style={{ color: '#7b7686', fontSize: 14, marginTop: 3 }}>✉ principal@ross.school.nz</div>
            </div>
          </div>
        </div>

        <div className="swnz-scroll" style={{ flex: 1, overflowY: 'auto', padding: 18 }}>
          <div style={{ background: '#1d3a5f', borderRadius: 30, display: 'flex', alignItems: 'center', padding: '13px 20px', color: '#fff', gap: 12 }}>
            <span style={{ fontSize: 13 }}>▲</span>
            <span style={{ fontWeight: 800, fontSize: 17, flex: 1 }}>1. Home</span>
            <span style={{ fontWeight: 700, fontSize: 15 }}>2/2</span>
            <span style={tick(22)}>✓</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', padding: '14px 20px 8px' }}>
            <span style={{ fontWeight: 800, fontSize: 16, color: '#2b2535', flex: 1 }}>1.1. Homepage welcome text</span>
            <span style={{ fontWeight: 700, fontSize: 15, color: '#4b4556', marginRight: 12 }}>2/2</span>
            <span style={tick(22)}>✓</span>
          </div>
          <div style={{ paddingLeft: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '11px 14px', borderLeft: '2px solid #1d3a5f', background: '#e9f5fc', borderRadius: '0 8px 8px 0' }}>
              <span style={{ fontSize: 16, color: '#1d3a5f', fontWeight: 600, flex: 1 }}>Text for this page</span>
              <span style={tick(24)}>✓</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '11px 14px', borderLeft: '2px solid #e4e2ea' }}>
              <span style={{ fontSize: 16, color: '#3b3548', flex: 1 }}>Images for this page</span>
              <span style={tick(24)}>✓</span>
            </div>
          </div>

          {COLLAPSED.map((sec, i) => (
            <div
              key={sec.num}
              style={{
                ...collapsedSection,
                ...(i === 0 ? { padding: '18px 20px 16px', marginTop: 8 } : {}),
              }}
            >
              <span style={{ fontSize: 13, color: '#7b7686', marginRight: 14 }}>▼</span>
              <span style={{ fontWeight: 800, fontSize: 17, color: '#2b2535', flex: 1 }}>{sec.num}. {sec.name}</span>
              <span style={{ fontWeight: 700, fontSize: 15, color: '#4b4556', marginRight: 12 }}>{sec.frac}</span>
              <span style={emptyCircle} />
            </div>
          ))}
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
          <div style={{ display: 'flex', alignItems: 'center', maxWidth: 1500, margin: '0 auto 4px' }}>
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
              <div style={{ border: '1.5px solid #bcd4f0', color: '#3f6cab', background: '#eaf2fc', fontWeight: 700, fontSize: 16, padding: '9px 16px', borderRadius: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
                Approve 1 / 2 <span style={{ fontSize: 12 }}>⌃</span> <span style={{ fontSize: 12 }}>▾</span>
              </div>
            </div>
            <div style={{ color: '#5b5667', fontWeight: 700, fontSize: 16, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              Our School <span style={{ fontSize: 13 }}>›</span>
            </div>
          </div>

          <div style={{ maxWidth: 1500, margin: '18px auto 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '0 4px 16px', borderBottom: '1px solid #e4e3e9' }}>
              <div style={{ fontWeight: 800, fontSize: 26, color: '#241d33', flex: 1 }}>Homepage welcome text</div>
              <span style={toolRound}>↑</span>
              <span style={toolRound}>↓</span>
              <span style={toolRound}>⌂</span>
            </div>
          </div>

          <div style={{ background: '#fff', border: '2px solid #b5e6c4', borderRadius: 20, padding: '30px 36px 40px', maxWidth: 1500, margin: '24px auto 0', boxShadow: '0 6px 22px rgba(60,40,90,.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: '#e7f7ec', borderRadius: 12, padding: '16px 20px' }}>
              <span style={{ width: 30, height: 30, borderRadius: '50%', background: '#28b463', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, flex: 'none' }}>✓</span>
              <span style={{ color: '#1f8a4c', fontWeight: 700, fontSize: 17 }}>The answer is saved and submitted for approval.</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 30 }}>
              <div style={{ fontWeight: 800, fontSize: 23, color: '#241d33', flex: 1 }}>Text for this page</div>
              <span style={{ color: '#9b95a5', fontSize: 19, cursor: 'pointer' }}>⤢</span>
            </div>
            <div style={{ border: '1px solid #e3e2e8', borderRadius: 12, marginTop: 18, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '11px 16px', borderBottom: '1px solid #ececf0', background: '#fbfbfc', color: '#9b95a5', fontSize: 16 }}>
                <div style={{ border: '1px solid #d8d6df', borderRadius: 6, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 18, color: '#4b4556', fontWeight: 600, fontSize: 15 }}>
                  Normal <span style={{ fontSize: 11 }}>▾</span>
                </div>
                <span style={{ fontWeight: 800, ...editorIcon }}>B</span>
                <span style={{ fontStyle: 'italic', ...editorIcon }}>I</span>
                <span style={{ textDecoration: 'underline', ...editorIcon }}>U</span>
                <span style={editorIcon}>☰</span>
                <span style={editorIcon}>⇥</span>
                <span style={editorIcon}>⇤</span>
                <span style={editorIcon}>≡</span>
                <span style={editorIcon}>≣</span>
                <span style={editorIcon}>⊟</span>
                <span style={editorIcon}>🔗</span>
                <span style={editorIcon}>☺</span>
              </div>
              <div style={{ padding: '24px 26px', color: '#2b2535', fontSize: 18, lineHeight: 1.7 }}>
                <p style={{ margin: '0 0 16px' }}>Nau mai, haere mai – Welcome to Ross School</p>
                <p style={{ margin: '0 0 16px' }}>Located on the beautiful West Coast, our community is built on a proud gold mining history, famously home to the 1909 discovery of New Zealand's largest gold nugget, the "Honourable Roddy." Having proudly celebrated our 150th anniversary in 2025, we continue that rich legacy of learning and community spirit today.</p>
                <p style={{ margin: '0 0 16px' }}>Just as the early miners searched for treasure, our mission is to uncover the "gold" within every single student by providing a genuinely welcoming, inclusive, and supportive environment where every child is valued.</p>
                <p style={{ margin: '0 0 16px' }}>Whether your family has been on the Coast for generations or you are brand new to town, we are absolutely thrilled to have you join our school family.</p>
                <p style={{ margin: '0 0 16px' }}>Ngā mihi nui,</p>
                <p style={{ margin: 0 }}>The Ross School Team</p>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 30 }}>
            <div style={{ width: 240, height: 8, background: '#e4e2ea', borderRadius: 6, overflow: 'hidden' }}>
              <div style={{ width: '60%', height: '100%', background: 'linear-gradient(90deg,#1ed79a,#1ba0e6)', borderRadius: 6 }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
