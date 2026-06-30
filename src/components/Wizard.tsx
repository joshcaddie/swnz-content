import type { CSSProperties } from 'react'
import type { AppState, OptKey } from '../types'
import {
  WIZARD_STEPS,
  BUILDER_TITLE,
  GALLERY_CATS,
  MY_TEMPLATES,
  ACCT_TEMPLATES,
} from '../data'

interface Props {
  state: AppState
  onBack: () => void
  onGotoStep: (n: number) => void
  onGoBoard: () => void
  onSelectPage: (i: number) => void
  onAddPage: () => void
  onAddSection: () => void
  onOpenFieldModal: () => void
  onToggleOpt: (k: OptKey) => void
}

const NEXT_MAP: Record<number, { label: string; go: number; dim?: boolean }> = {
  1: { label: 'ESSENTIALS', go: 2, dim: true },
  2: { label: 'BUILDER', go: 3 },
  3: { label: 'PREVIEW', go: 4 },
  4: { label: 'FINALIZE', go: 5 },
  5: { label: 'SEND', go: 0 },
}

const gettingStartedSmall: CSSProperties = {
  background: 'linear-gradient(135deg,#1ed79a,#1ba0e6)',
  color: '#fff',
  fontWeight: 800,
  fontSize: 13,
  letterSpacing: '0.6px',
  padding: 13,
  borderRadius: 24,
  textAlign: 'center',
}

const OPT_LABELS: { key: OptKey; label: string }[] = [
  { key: 'instructions', label: 'Instructions' },
  { key: 'repeatable', label: 'Repeatable section' },
  { key: 'conditions', label: 'Conditions' },
]

export function Wizard({
  state,
  onBack,
  onGotoStep,
  onGoBoard,
  onSelectPage,
  onAddPage,
  onAddSection,
  onOpenFieldModal,
  onToggleOpt,
}: Props) {
  const { step, activePage, pages } = state
  const nx = NEXT_MAP[step]
  const nextBg = nx.dim ? '#e3f1fb' : '#1d3a5f'
  const nextColor = nx.dim ? '#9cc7e6' : '#fff'
  const onNext = () => (nx.go === 0 ? onGoBoard() : onGotoStep(nx.go))

  const ap = pages[activePage]
  const builderPageHeader = `${activePage + 1}. ${ap.name}`

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, background: '#f3f3f6' }}>
      {/* stepper */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e6e5ec', display: 'flex', alignItems: 'center', padding: '16px 26px', gap: 16, flex: 'none' }}>
        <div onClick={onBack} style={{ width: 44, height: 44, borderRadius: '50%', background: '#fff', border: '1px solid #e1e0e7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6f6a7a', fontSize: 19, cursor: 'pointer', flex: 'none', boxShadow: '0 2px 5px rgba(0,0,0,.05)' }}>‹</div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          {WIZARD_STEPS.map((label, i) => {
            const num = i + 1
            const active = step === num
            return (
              <div key={label} onClick={() => onGotoStep(num)} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                {active ? (
                  <>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#1493d6', color: '#fff', fontWeight: 800, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{num}</div>
                    <span style={{ fontWeight: 800, fontSize: 21, color: '#241d33' }}>{label}</span>
                  </>
                ) : (
                  <>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', border: '2px solid #cfcdd6', color: '#9b95a5', fontWeight: 800, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{num}</div>
                    <span style={{ fontWeight: 700, fontSize: 21, color: '#9b95a5' }}>{label}</span>
                  </>
                )}
                {i < 4 && <span style={{ color: '#cfcdd6', fontSize: 22, margin: '0 8px' }}>›</span>}
              </div>
            )
          })}
        </div>
        <div onClick={onNext} style={{ background: nextBg, color: nextColor, fontWeight: 800, fontSize: 14, letterSpacing: '0.6px', padding: '13px 22px', borderRadius: 26, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, flex: 'none' }}>
          {nx.label} ›
        </div>
      </div>

      {/* STEP 1: TEMPLATES */}
      {step === 1 && (
        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
          <div style={{ width: 420, flex: 'none', background: '#fff', borderRight: '1px solid #e6e5ec', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ padding: '22px 26px 10px', color: '#9b95a5', fontWeight: 800, fontSize: 13, letterSpacing: '1.2px' }}>TEMPLATE GALLERY</div>
            <div className="swnz-scroll" style={{ flex: 1, overflowY: 'auto', padding: '6px 14px 14px' }}>
              {GALLERY_CATS.map((cat) => (
                <div key={cat.name} className="swnz-hover swnz-hover-grey" style={{ display: 'flex', alignItems: 'center', gap: 15, padding: '12px 14px', borderRadius: 10, cursor: 'pointer' }}>
                  <span style={{ width: 13, height: 13, borderRadius: '50%', background: cat.dot, flex: 'none' }} />
                  <span style={{ fontWeight: 700, fontSize: 19, color: '#2b2535' }}>{cat.name}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="swnz-scroll" style={{ flex: 1, overflowY: 'auto', padding: '28px 36px 50px' }}>
            <div onClick={() => onGotoStep(2)} style={{ display: 'inline-block', background: '#1d3a5f', color: '#fff', fontWeight: 800, fontSize: 15, letterSpacing: '0.6px', padding: '16px 28px', borderRadius: 28, cursor: 'pointer' }}>
              START FROM SCRATCH
            </div>
            <div style={{ background: '#fff', border: '1px solid #e3e2e8', borderRadius: 14, padding: '16px 22px', display: 'flex', alignItems: 'center', gap: 12, marginTop: 26 }}>
              <input placeholder="Search for a template..." style={{ border: 'none', outline: 'none', fontFamily: 'inherit', fontSize: 18, color: '#5b5667', flex: 1, background: 'transparent', width: '100%' }} />
              <span style={{ color: '#9b95a5', fontSize: 18 }}>🔍</span>
            </div>
            <div style={{ fontWeight: 800, fontSize: 27, color: '#241d33', margin: '36px 0 18px' }}>My Templates</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 22 }}>
              {MY_TEMPLATES.map((t) => (
                <div key={t.title} onClick={() => onGotoStep(2)} style={{ background: '#fff', border: '1px solid #e9e8ee', borderRadius: 14, padding: 24, minHeight: 210, display: 'flex', flexDirection: 'column', cursor: 'pointer', boxShadow: '0 2px 8px rgba(40,30,60,.05)' }}>
                  <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                    <div style={{ width: 56, height: 56, borderRadius: 12, background: '#e7f5f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flex: 'none' }}>🏠</div>
                    <div style={{ fontWeight: 800, fontSize: 20, color: '#241d33', lineHeight: 1.3 }}>{t.title}</div>
                  </div>
                  <div style={{ color: '#9b95a5', fontSize: 16, marginTop: 16, flex: 1 }}>{t.desc}</div>
                  <div style={{ color: '#b5b1bd', fontSize: 14, textAlign: 'right' }}>Last Updated: {t.date}</div>
                </div>
              ))}
            </div>
            <div style={{ fontWeight: 800, fontSize: 27, color: '#241d33', margin: '40px 0 18px' }}>Accounting</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 22 }}>
              {ACCT_TEMPLATES.map((t) => (
                <div key={t.title} onClick={() => onGotoStep(2)} style={{ background: '#fff', border: '1px solid #e9e8ee', borderRadius: 14, padding: 24, minHeight: 210, display: 'flex', flexDirection: 'column', cursor: 'pointer', boxShadow: '0 2px 8px rgba(40,30,60,.05)' }}>
                  <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                    <div style={{ width: 56, height: 56, borderRadius: 12, background: t.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flex: 'none' }}>{t.icon}</div>
                    <div style={{ fontWeight: 800, fontSize: 19, color: '#241d33', lineHeight: 1.3 }}>{t.title}</div>
                  </div>
                  <div style={{ color: '#9b95a5', fontSize: 15, marginTop: 16, lineHeight: 1.55, flex: 1 }}>{t.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: ESSENTIALS */}
      {step === 2 && (
        <div className="swnz-scroll" style={{ flex: 1, overflowY: 'auto', padding: 38, display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: 760, maxWidth: '100%', background: '#fff', border: '1px solid #e9e8ee', borderRadius: 18, padding: '38px 42px', boxShadow: '0 4px 16px rgba(40,30,60,.06)', height: 'fit-content' }}>
            <div style={{ fontWeight: 800, fontSize: 28, color: '#241d33' }}>Request essentials</div>
            <div style={{ color: '#8b8595', fontSize: 16, margin: '6px 0 30px' }}>The basics — name it, choose the client, set a due date.</div>

            <div style={{ fontWeight: 700, fontSize: 15, color: '#4b4556', marginBottom: 9 }}>Request name</div>
            <input defaultValue="SchoolName - inner pages content" style={{ width: '100%', border: '1px solid #e1e0e7', borderRadius: 10, padding: '14px 16px', fontFamily: 'inherit', fontSize: 17, color: '#2b2535', outline: 'none', marginBottom: 24 }} />

            <div style={{ fontWeight: 700, fontSize: 15, color: '#4b4556', marginBottom: 9 }}>Client</div>
            <div style={{ border: '1px solid #e1e0e7', borderRadius: 10, padding: '14px 16px', fontSize: 17, color: '#8b8595', display: 'flex', alignItems: 'center', marginBottom: 24 }}>
              <span style={{ flex: 1 }}>Select a client…</span>
              <span style={{ fontSize: 12 }}>▾</span>
            </div>

            <div style={{ display: 'flex', gap: 24 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#4b4556', marginBottom: 9 }}>Due date</div>
                <div style={{ border: '1px solid #e1e0e7', borderRadius: 10, padding: '14px 16px', fontSize: 17, color: '#2b2535', display: 'flex', alignItems: 'center' }}>
                  <span style={{ flex: 1 }}>01/03/2026</span>
                  <span>📅</span>
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#4b4556', marginBottom: 9 }}>Folder</div>
                <div style={{ border: '1px solid #e1e0e7', borderRadius: 10, padding: '14px 16px', fontSize: 17, color: '#2b2535', display: 'flex', alignItems: 'center' }}>
                  <span style={{ flex: 1 }}>📁 Default Folder</span>
                  <span style={{ fontSize: 12 }}>▾</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 28, paddingTop: 24, borderTop: '1px solid #f0eff3' }}>
              <div style={{ width: 50, height: 28, borderRadius: 16, background: '#1d3a5f', position: 'relative' }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: 25 }} />
              </div>
              <span style={{ fontWeight: 600, fontSize: 17, color: '#2b2535' }}>Send automated reminders to the client</span>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: BUILDER */}
      {step === 3 && (
        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
          {/* pages */}
          <div style={{ width: 330, flex: 'none', background: '#fff', borderRight: '1px solid #e6e5ec', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', padding: '22px 22px 14px' }}>
              <span style={{ fontWeight: 800, fontSize: 14, letterSpacing: '1.2px', color: '#6f6a7a', flex: 1 }}>PAGES</span>
              <span style={{ color: '#1ba0e6', fontSize: 21 }}>☁</span>
            </div>
            <div className="swnz-scroll" style={{ flex: 1, overflowY: 'auto', padding: '0 14px' }}>
              {pages.map((pg, pi) => (
                <div key={pi}>
                  <div onClick={() => onSelectPage(pi)} className="swnz-hover swnz-hover-grey" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 12px', borderRadius: 8, cursor: 'pointer' }}>
                    <span style={{ fontWeight: 800, fontSize: 18, flex: 1, color: pi === activePage ? '#1493d6' : '#2b2535' }}>{pi + 1}. {pg.name}</span>
                    <span style={{ color: '#b5b1bd', fontWeight: 800, fontSize: 17 }}>⋯</span>
                  </div>
                  {(pi === activePage ? pg.sections : []).map((sec, si) => (
                    <div key={si}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px 8px 24px' }}>
                        <span style={{ fontWeight: 700, fontSize: 16, color: '#3b3548', flex: 1 }}>{pi + 1}.{si + 1} {sec.name}</span>
                        <span style={{ color: '#b5b1bd', fontWeight: 800, fontSize: 16 }}>⋯</span>
                      </div>
                      {sec.fields.map((f, fi) => (
                        <div key={fi} style={{ padding: '6px 12px 6px 36px', color: '#7b7686', fontSize: 15 }}>{f.label}</div>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
              <div onClick={onAddPage} style={{ display: 'inline-flex', alignItems: 'center', gap: 10, border: '1.5px solid #1d3a5f', color: '#1d3a5f', fontWeight: 800, fontSize: 14, letterSpacing: '0.5px', padding: '11px 18px', borderRadius: 24, margin: '16px 4px', cursor: 'pointer' }}>
                ADD A PAGE <span style={{ fontSize: 11 }}>▾</span>
              </div>
            </div>
            <div style={{ padding: 16 }}>
              <div style={gettingStartedSmall}>GETTING STARTED - VALUE…</div>
            </div>
          </div>

          {/* main */}
          <div className="swnz-scroll" style={{ flex: 1, overflowY: 'auto', padding: '28px 36px 60px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontWeight: 800, fontSize: 30, color: '#241d33', flex: 1 }}>{BUILDER_TITLE}</div>
              <span style={{ color: '#9b95a5', fontWeight: 800, fontSize: 21 }}>⋯</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', marginTop: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, color: '#6f6a7a', fontWeight: 600, fontSize: 16 }}>
                <span>📁</span> Default Folder <span style={{ fontSize: 11 }}>▾</span>
              </div>
              <div style={{ flex: 1 }} />
              <span style={{ color: '#1493d6', fontWeight: 700, fontSize: 16, textDecoration: 'underline', cursor: 'pointer' }}>Edit request instructions</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', marginTop: 30 }}>
              <div style={{ fontWeight: 800, fontSize: 24, color: '#241d33', flex: 1 }}>{builderPageHeader}</div>
              <span style={{ color: '#b5b1bd', fontSize: 19, marginRight: 16 }}>⚙</span>
              <span style={{ color: '#b5b1bd', fontWeight: 800, fontSize: 19 }}>⋯</span>
            </div>

            {ap.sections.map((sec, si) => (
              <div key={si} style={{ background: '#fff', border: '1.5px solid #bfe0f2', borderRadius: 16, padding: 24, marginTop: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontWeight: 800, fontSize: 20, color: '#241d33' }}>{activePage + 1}.{si + 1} {sec.name}</div>
                  <span style={{ color: '#9b95a5', fontSize: 15 }}>✎</span>
                  <div style={{ flex: 1 }} />
                  <span style={{ color: '#b5b1bd', fontSize: 18, marginRight: 12 }}>⚙</span>
                  <span style={{ color: '#b5b1bd', fontWeight: 800, fontSize: 18 }}>⋯</span>
                </div>
                {sec.fields.map((f, fi) => (
                  <div key={fi}>
                    {f.tag && (
                      <div style={{ display: 'inline-block', background: '#e6f3fb', color: '#1d3a5f', fontWeight: 600, fontSize: 14, padding: '5px 12px', borderRadius: 7, margin: '16px 0 0' }}>{f.tag}</div>
                    )}
                    <div style={{ background: '#fff', border: '1px solid #ededf1', borderRadius: 10, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14, marginTop: 12, boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
                      <span style={{ color: '#1d3a5f', fontSize: 18 }}>{f.icon}</span>
                      <span style={{ fontWeight: 600, fontSize: 18, color: '#2b2535', flex: 1 }}>{f.label}</span>
                      <span style={{ color: '#cfcdd6', fontSize: 17, marginRight: 10 }}>⚙</span>
                      <span style={{ color: '#cfcdd6', fontWeight: 800, fontSize: 17 }}>⋯</span>
                    </div>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 14, marginTop: 22 }}>
                  <div onClick={onOpenFieldModal} style={{ border: '1.5px solid #1d3a5f', color: '#1d3a5f', fontWeight: 800, fontSize: 13, letterSpacing: '0.5px', padding: '12px 20px', borderRadius: 24, cursor: 'pointer' }}>ADD A FIELD</div>
                  <div style={{ border: '1.5px solid #1493d6', color: '#1493d6', fontWeight: 800, fontSize: 13, letterSpacing: '0.5px', padding: '12px 20px', borderRadius: 24, cursor: 'pointer' }}>ADD FIELDS FROM AI PROMPT</div>
                </div>
              </div>
            ))}

            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 30 }}>
              <div onClick={onAddSection} style={{ border: '1.5px solid #1d3a5f', color: '#1d3a5f', fontWeight: 800, fontSize: 14, letterSpacing: '0.5px', padding: '14px 26px', borderRadius: 26, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, background: '#fff' }}>
                ADD A SECTION <span style={{ fontSize: 11 }}>▾</span>
              </div>
            </div>
          </div>

          {/* section options */}
          <div style={{ width: 420, flex: 'none', background: '#fff', borderLeft: '1px solid #e6e5ec', padding: '24px 26px', minHeight: 0 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#9b95a5', fontWeight: 800, fontSize: 13, letterSpacing: '1.2px' }}>SECTION OPTIONS</div>
                <div style={{ fontWeight: 800, fontSize: 24, color: '#241d33', marginTop: 8 }}>Homepage welcome text</div>
              </div>
              <span style={{ color: '#9b95a5', fontSize: 22, cursor: 'pointer' }}>✕</span>
            </div>
            {OPT_LABELS.map((o) => {
              const on = state.opts[o.key]
              return (
                <div key={o.key} style={{ display: 'flex', alignItems: 'center', padding: '20px 0', borderBottom: '1px solid #f0eff3' }}>
                  <span style={{ fontWeight: 600, fontSize: 19, color: '#2b2535', flex: 1 }}>{o.label}</span>
                  <div onClick={() => onToggleOpt(o.key)} style={{ width: 50, height: 28, borderRadius: 16, background: on ? '#1d3a5f' : '#d8d6df', position: 'relative', cursor: 'pointer' }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: on ? 25 : 3, boxShadow: '0 1px 3px rgba(0,0,0,.25)' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* STEP 4: PREVIEW */}
      {step === 4 && (
        <div className="swnz-scroll" style={{ flex: 1, overflowY: 'auto', padding: 40, display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: 900, maxWidth: '100%' }}>
            <div style={{ fontWeight: 800, fontSize: 30, color: '#241d33' }}>{BUILDER_TITLE}</div>
            <div style={{ color: '#8b8595', fontSize: 16, margin: '8px 0 26px' }}>This is how your client will see the request.</div>
            {ap.sections.map((sec, si) => (
              <div key={si} style={{ background: '#fff', border: '1px solid #e9e8ee', borderRadius: 16, padding: '32px 36px', marginBottom: 20, boxShadow: '0 2px 10px rgba(40,30,60,.05)' }}>
                <div style={{ fontWeight: 800, fontSize: 22, color: '#241d33', marginBottom: 22 }}>{sec.name}</div>
                {sec.fields.map((f, fi) => (
                  <div key={fi} style={{ marginBottom: 24 }}>
                    <div style={{ fontWeight: 700, fontSize: 18, color: '#2b2535', marginBottom: 10 }}>{f.label}</div>
                    <div style={{ minHeight: 90, background: '#f3f3f6', border: '1px solid #e3e2e8', borderRadius: 10, padding: '14px 16px', color: '#a8a4b0', fontSize: 16 }}>Client response…</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STEP 5: FINALIZE */}
      {step === 5 && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
          <div style={{ width: 620, maxWidth: '100%', background: '#fff', border: '1px solid #e9e8ee', borderRadius: 18, padding: 44, textAlign: 'center', boxShadow: '0 4px 16px rgba(40,30,60,.06)' }}>
            <div style={{ width: 74, height: 74, borderRadius: '50%', background: '#e7f5f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, margin: '0 auto 22px' }}>📨</div>
            <div style={{ fontWeight: 800, fontSize: 28, color: '#241d33', marginBottom: 12 }}>Ready to send</div>
            <div style={{ color: '#8b8595', fontSize: 17, lineHeight: 1.6, marginBottom: 30 }}>Your request is ready. Send it to your client and we'll notify them by email, then keep you posted as they fill it in.</div>
            <div onClick={onGoBoard} style={{ display: 'inline-block', background: 'linear-gradient(135deg,#1ed79a,#1ba0e6)', color: '#fff', fontWeight: 800, fontSize: 15, letterSpacing: '0.6px', padding: '16px 34px', borderRadius: 28, cursor: 'pointer', boxShadow: '0 4px 14px rgba(27,160,230,.32)' }}>SEND REQUEST</div>
          </div>
        </div>
      )}
    </div>
  )
}
