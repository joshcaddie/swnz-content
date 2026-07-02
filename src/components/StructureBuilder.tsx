import { useState } from 'react'
import type { FieldConfig, FieldType, Structure, StructureField, StructurePage } from '../lib/database.types'
import { FIELD_TYPES, iconFor, isDisplayField } from '../fields/registry'
import { C } from '../theme'

export const CHOICE_TYPES: FieldType[] = ['checkbox', 'single_choice', 'dropdown', 'image_choice']
export const needsOptions = (t: FieldType) => CHOICE_TYPES.includes(t)

export function newFieldKey(): string {
  return Math.random().toString(36).slice(2, 10)
}

/** Ensure every field carries a stable config.key (used by conditions). Mutates in place. */
export function backfillKeys(s: Structure): Structure {
  s.pages.forEach((p, pi) =>
    p.sections.forEach((sec, si) =>
      sec.fields.forEach((f, fi) => {
        if (!f.config) f.config = {}
        if (!f.config.key) f.config.key = `p${pi}s${si}f${fi}-${newFieldKey()}`
      }),
    ),
  )
  return s
}

export interface FieldRef {
  key: string
  label: string
}

/** All condition-eligible fields in a structure (input fields with keys). */
export function collectFieldRefs(s: Structure): FieldRef[] {
  const out: FieldRef[] = []
  s.pages.forEach((p) =>
    p.sections.forEach((sec) =>
      sec.fields.forEach((f) => {
        if (!isDisplayField(f.type) && f.config?.key) out.push({ key: f.config.key, label: f.label || 'Untitled field' })
      }),
    ),
  )
  return out
}

/**
 * Parse a pasted sitemap (one page per line, indentation/dashes for sub-pages)
 * into pages, each pre-loaded with the standard text/images/documents fields.
 * Sub-pages keep their own name and are marked indent=1 under the page above.
 */
export function sitemapToPages(text: string): StructurePage[] {
  const lines = text.split('\n')
  const entries: { name: string; depth: number }[] = []
  for (const raw of lines) {
    if (!raw.trim()) continue
    const indent = raw.match(/^[\s]*/)?.[0].replace(/\t/g, '    ').length ?? 0
    const name = raw.trim().replace(/^[-–—*•>]+\s*/, '').trim()
    if (!name) continue
    entries.push({ name, depth: indent })
  }
  if (entries.length === 0) return []
  const minIndent = Math.min(...entries.map((e) => e.depth))
  const pages: StructurePage[] = []
  for (const e of entries) {
    pages.push({
      name: e.name,
      indent: e.depth > minIndent ? 1 : 0,
      sections: [
        {
          name: 'Page content',
          fields: [
            { type: 'formatted', label: 'Text for this page', config: { key: newFieldKey() } },
            { type: 'image', label: 'Images for this page', tag: 'Multi Answer', config: { key: newFieldKey(), multi: true, maxFiles: 10 } },
            { type: 'file', label: 'Documents for this page', tag: 'Multi Answer', config: { key: newFieldKey(), multi: true, maxFiles: 10 } },
          ],
        },
      ],
    })
  }
  return pages
}

export interface BuilderApi {
  addPage: () => void
  addPages: (pages: StructurePage[]) => void | Promise<void>
  renamePage: (pi: number, v: string) => void
  /** navOnly: true also clears the page's sections (nav labels collect no content). */
  patchPage: (pi: number, patch: { navOnly?: boolean; indent?: number }) => void
  deletePage: (pi: number) => void
  addSection: () => void
  renameSection: (si: number, v: string) => void
  patchSection: (si: number, patch: { instructions?: string | null; repeatable?: boolean }) => void
  deleteSection: (si: number) => void
  deleteField: (si: number, fi: number) => void
  patchField: (si: number, fi: number, patch: Partial<StructureField>) => void
  patchConfig: (si: number, fi: number, patch: Partial<FieldConfig>) => void
  changeType: (si: number, fi: number, type: FieldType) => void
}

interface Props {
  structure: Structure
  name: string
  activePage: number
  setActivePage: (i: number) => void
  sel: { si: number; fi: number } | null
  setSel: (s: { si: number; fi: number } | null) => void
  api: BuilderApi
  openFieldModal: () => void
}

export function StructureBuilder(p: Props) {
  const [sitemapOpen, setSitemapOpen] = useState(false)
  const [sitemapText, setSitemapText] = useState('')
  const [generating, setGenerating] = useState(false)
  const ap = p.structure.pages[p.activePage] ?? p.structure.pages[0]
  const selField = ap && p.sel ? ap.sections[p.sel.si]?.fields[p.sel.fi] : null
  const fieldRefs = collectFieldRefs(p.structure)
  const parsedPages = sitemapToPages(sitemapText)

  // Hierarchical numbering: top-level pages count 1, 2, 3…; sub-pages 2.1, 2.2…
  let topN = 0
  let subN = 0
  const pageNums = p.structure.pages.map((pg) => {
    if (!pg.indent) { topN++; subN = 0; return `${topN}` }
    subN++
    return `${topN}.${subN}`
  })

  const generate = async () => {
    if (parsedPages.length === 0) return
    setGenerating(true)
    try {
      await p.api.addPages(parsedPages)
      setSitemapOpen(false)
      setSitemapText('')
    } finally {
      setGenerating(false)
    }
  }

  if (!ap) return <div style={{ padding: 40, color: C.muted }}>No pages yet — add one.</div>

  return (
    <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
      {/* pages */}
      <div style={{ width: 300, flex: 'none', background: '#fff', borderRight: `1px solid ${C.line}`, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '22px 22px 14px' }}>
          <span style={{ fontWeight: 800, fontSize: 14, letterSpacing: '1.2px', color: '#6f6a7a', flex: 1 }}>PAGES</span>
        </div>
        <div className="swnz-scroll" style={{ flex: 1, overflowY: 'auto', padding: '0 14px' }}>
          {p.structure.pages.map((pg, pi) => {
            const sub = !!pg.indent
            return (
              <div key={pi} style={sub ? { marginLeft: 22 } : undefined}>
                <div onClick={() => p.setActivePage(pi)} className="swnz-hover swnz-hover-grey" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: sub ? '9px 12px' : '11px 12px', borderRadius: 8, cursor: 'pointer' }}>
                  <span style={{ fontWeight: sub ? 700 : 800, fontSize: sub ? 15.5 : 17, flex: 1, color: pi === p.activePage ? C.cyan : sub ? '#4b4556' : C.ink }}>
                    {sub && <span style={{ color: '#b6b2c2', marginRight: 6 }}>↳</span>}
                    {pageNums[pi]}. {pg.name}
                    {pg.navOnly && <span style={{ marginLeft: 8, fontSize: 10.5, fontWeight: 800, letterSpacing: '0.5px', color: '#8b82a3', background: '#f0eff3', padding: '2px 7px', borderRadius: 6, verticalAlign: 'middle' }}>NAV ONLY</span>}
                  </span>
                  {p.structure.pages.length > 1 && <span onClick={(e) => { e.stopPropagation(); p.api.deletePage(pi) }} style={{ color: '#c9491f', fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>✕</span>}
                </div>
                {pi === p.activePage && pg.sections.map((sec, si) => (
                  <div key={si}>
                    <div style={{ padding: '8px 12px 6px 24px', fontWeight: 700, fontSize: 15, color: '#3b3548' }}>{pageNums[pi]}.{si + 1} {sec.name}</div>
                    {sec.fields.map((f, fi) => (
                      <div key={fi} onClick={() => p.setSel({ si, fi })} style={{ padding: '6px 12px 6px 36px', color: p.sel?.si === si && p.sel?.fi === fi ? C.cyan : '#7b7686', fontSize: 14, cursor: 'pointer', fontWeight: p.sel?.si === si && p.sel?.fi === fi ? 700 : 400 }}>
                        {f.label || 'Untitled field'}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )
          })}
          <div onClick={p.api.addPage} style={{ display: 'inline-flex', alignItems: 'center', gap: 10, border: `1.5px solid ${C.navy2}`, color: C.navy2, fontWeight: 800, fontSize: 14, letterSpacing: '0.5px', padding: '11px 18px', borderRadius: 24, margin: '16px 4px 6px', cursor: 'pointer' }}>ADD A PAGE ▾</div>
          <div onClick={() => setSitemapOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: `1.5px solid ${C.cyan}`, color: C.cyan, fontWeight: 800, fontSize: 13, letterSpacing: '0.5px', padding: '11px 16px', borderRadius: 24, margin: '0 4px 16px', cursor: 'pointer' }}>🗺 GENERATE FROM SITEMAP</div>
        </div>
      </div>

      {sitemapOpen && (
        <div onClick={() => setSitemapOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(16,28,52,.5)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 70, padding: '60px 20px', overflow: 'auto' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 18, width: 640, maxWidth: '100%', padding: '28px 30px 30px' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontWeight: 800, fontSize: 22, color: C.inkDark, flex: 1 }}>Generate pages from a sitemap</div>
              <span onClick={() => setSitemapOpen(false)} style={{ color: C.muted2, fontSize: 22, cursor: 'pointer' }}>✕</span>
            </div>
            <div style={{ color: C.muted, fontSize: 14, marginBottom: 14, lineHeight: 1.5 }}>
              Paste your sitemap — one page per line, indent sub-pages. Each page is created with three fields:
              <strong> Text</strong>, <strong>Images</strong> and <strong>Documents</strong>.
            </div>
            <textarea
              autoFocus
              value={sitemapText}
              onChange={(e) => setSitemapText(e.target.value)}
              placeholder={'- Home\n- About\n    - Our Team\n    - Our Board\n- School Info\n    - Enrolment\n    - Stationery\n- News & Events\n- Contact Us'}
              style={{ width: '100%', minHeight: 220, border: '1px solid #e1e0e7', borderRadius: 10, padding: '14px 16px', fontFamily: 'ui-monospace, monospace', fontSize: 14, color: C.ink, outline: 'none', resize: 'vertical', lineHeight: 1.6 }}
            />
            <div style={{ marginTop: 12, minHeight: 22, color: parsedPages.length ? C.navy2 : C.muted2, fontSize: 14, fontWeight: 600 }}>
              {parsedPages.length
                ? `Will create ${parsedPages.length} page${parsedPages.length === 1 ? '' : 's'}: ${parsedPages.map((pg) => (pg.indent ? `↳ ${pg.name}` : pg.name)).join(' · ')}`
                : 'Nothing to create yet — paste a sitemap above.'}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 16 }}>
              <div onClick={() => setSitemapOpen(false)} style={{ color: '#5b5667', fontWeight: 700, fontSize: 14, padding: '12px 18px', cursor: 'pointer' }}>Cancel</div>
              <div
                onClick={generate}
                style={{ background: parsedPages.length ? C.navy2 : '#c9ccd4', color: '#fff', fontWeight: 800, fontSize: 13, letterSpacing: '0.5px', padding: '12px 24px', borderRadius: 24, cursor: parsedPages.length ? 'pointer' : 'default' }}
              >
                {generating ? 'CREATING…' : `CREATE ${parsedPages.length || ''} PAGE${parsedPages.length === 1 ? '' : 'S'}`}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* canvas */}
      <div className="swnz-scroll" style={{ flex: 1, overflowY: 'auto', padding: '28px 36px 60px' }}>
        <div style={{ fontWeight: 800, fontSize: 30, color: C.inkDark }}>{p.name}</div>
        <input value={ap.name} onChange={(e) => p.api.renamePage(p.activePage, e.target.value)} style={{ fontWeight: 800, fontSize: 24, color: C.inkDark, border: 'none', outline: 'none', background: 'transparent', marginTop: 24, width: '100%' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 28, marginTop: 8 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13.5, color: C.muted, cursor: 'pointer', fontWeight: 700 }}>
            Page has content
            <MiniSwitch on={!ap.navOnly} onToggle={() => p.api.patchPage(p.activePage, { navOnly: !ap.navOnly })} />
          </label>
          {p.activePage > 0 && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13.5, color: C.muted, cursor: 'pointer', fontWeight: 700 }}>
              Sub-page (indent under the page above)
              <MiniSwitch on={!!ap.indent} onToggle={() => p.api.patchPage(p.activePage, { indent: ap.indent ? 0 : 1 })} />
            </label>
          )}
        </div>

        {ap.navOnly && (
          <div style={{ marginTop: 24, background: '#fff', border: '1.5px dashed #d8d6df', borderRadius: 16, padding: '34px 30px', textAlign: 'center', color: C.muted }}>
            <div style={{ fontWeight: 800, fontSize: 17, color: '#4b4556', marginBottom: 8 }}>Navigation label only</div>
            <div style={{ fontSize: 14.5, lineHeight: 1.6 }}>
              This page appears in the sitemap for structure, but no content will be requested from the client.
              <br />Turn <strong>Page has content</strong> back on to add sections and fields.
            </div>
          </div>
        )}

        {!ap.navOnly && ap.sections.map((sec, si) => (
          <div key={si} style={{ background: '#fff', border: '1.5px solid #bfe0f2', borderRadius: 16, padding: 24, marginTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <input value={sec.name} onChange={(e) => p.api.renameSection(si, e.target.value)} style={{ fontWeight: 800, fontSize: 20, color: C.inkDark, border: 'none', outline: 'none', background: 'transparent', flex: 1 }} />
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: C.muted, cursor: 'pointer', fontWeight: 700 }}>
                Repeatable
                <MiniSwitch on={!!sec.repeatable} onToggle={() => p.api.patchSection(si, { repeatable: !sec.repeatable })} />
              </label>
              <span onClick={() => p.api.deleteSection(si)} style={{ color: '#c9491f', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>Delete section</span>
            </div>
            <input
              value={sec.instructions ?? ''}
              onChange={(e) => p.api.patchSection(si, { instructions: e.target.value || null })}
              placeholder="Section instructions for the client (optional)…"
              style={{ width: '100%', marginTop: 10, border: 'none', outline: 'none', background: 'transparent', fontFamily: 'inherit', fontSize: 14, color: '#6f6a7a' }}
            />

            {sec.fields.map((f, fi) => {
              const selected = p.sel?.si === si && p.sel?.fi === fi
              const cfg = f.config ?? {}
              return (
                <div key={fi} onClick={() => p.setSel({ si, fi })} style={{ marginTop: 14, border: selected ? `2px solid ${C.cyan}` : '1px solid #ededf1', borderRadius: 10, padding: 16, cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,.04)', background: '#fff' }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: cfg.multi || cfg.condition ? 10 : 0 }}>
                    {cfg.multi && <Tag>Multi Answer</Tag>}
                    {cfg.condition && <Tag>Conditional</Tag>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ color: C.navy2, fontSize: 18, width: 22, textAlign: 'center' }}>{iconFor(f.type)}</span>
                    <input value={f.label} onChange={(e) => p.api.patchField(si, fi, { label: e.target.value })} placeholder="Question / field label" style={{ fontWeight: 600, fontSize: 17, color: C.ink, flex: 1, border: 'none', outline: 'none', background: 'transparent' }} />
                    {cfg.required && <span style={{ color: '#c9491f', fontWeight: 800 }}>*</span>}
                    {cfg.internalOnly && <span style={{ fontSize: 12, color: C.muted2, background: '#f0eff3', padding: '3px 8px', borderRadius: 6 }}>internal</span>}
                    <span onClick={(e) => { e.stopPropagation(); p.api.deleteField(si, fi) }} style={{ color: '#cfcdd6', fontWeight: 800, fontSize: 17, cursor: 'pointer' }}>✕</span>
                  </div>

                  {cfg.instructions !== undefined && (
                    <textarea value={cfg.instructions} onChange={(e) => p.api.patchConfig(si, fi, { instructions: e.target.value })} placeholder="Instructions for the client…" onClick={(e) => e.stopPropagation()}
                      style={{ width: '100%', marginTop: 12, border: '1px solid #ececf0', borderRadius: 8, padding: '10px 12px', fontFamily: 'inherit', fontSize: 14, color: '#4b4556', background: '#fafafb', outline: 'none', minHeight: 60, resize: 'vertical' }} />
                  )}

                  {needsOptions(f.type) && (
                    <OptionsEditor options={cfg.options ?? []} onChange={(options) => p.api.patchConfig(si, fi, { options })} />
                  )}
                </div>
              )
            })}

            <div style={{ display: 'flex', gap: 14, marginTop: 22 }}>
              <div onClick={(e) => { e.stopPropagation(); p.setSel({ si, fi: sec.fields.length }); p.openFieldModal() }} style={{ border: `1.5px solid ${C.navy2}`, color: C.navy2, fontWeight: 800, fontSize: 13, letterSpacing: '0.5px', padding: '12px 20px', borderRadius: 24, cursor: 'pointer' }}>ADD A FIELD</div>
              <div title="Coming soon" style={{ border: `1.5px solid ${C.cyan}`, color: C.cyan, fontWeight: 800, fontSize: 13, letterSpacing: '0.5px', padding: '12px 20px', borderRadius: 24, cursor: 'pointer', opacity: 0.6 }}>ADD FIELDS FROM AI PROMPT</div>
            </div>
          </div>
        ))}

        {!ap.navOnly && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 30 }}>
            <div onClick={p.api.addSection} style={{ border: `1.5px solid ${C.navy2}`, color: C.navy2, fontWeight: 800, fontSize: 14, letterSpacing: '0.5px', padding: '14px 26px', borderRadius: 26, cursor: 'pointer', background: '#fff' }}>ADD A SECTION ▾</div>
          </div>
        )}
      </div>

      {/* field options */}
      <div className="swnz-scroll" style={{ width: 340, flex: 'none', background: '#fff', borderLeft: `1px solid ${C.line}`, padding: '22px 24px', minHeight: 0, overflowY: 'auto' }}>
        {selField && p.sel ? (
          <FieldOptions
            field={selField}
            others={fieldRefs.filter((r) => r.key !== selField.config?.key)}
            onType={(t) => p.api.changeType(p.sel!.si, p.sel!.fi, t)}
            onConfig={(patch) => p.api.patchConfig(p.sel!.si, p.sel!.fi, patch)}
          />
        ) : (
          <div style={{ color: C.muted2, fontSize: 15 }}>
            <div style={{ fontWeight: 800, fontSize: 13, letterSpacing: '1.2px', marginBottom: 12 }}>FIELD OPTIONS</div>
            Select a field to edit its type and options.
          </div>
        )}
      </div>
    </div>
  )
}

function Tag({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'inline-block', background: '#e6f3fb', color: C.navy2, fontWeight: 600, fontSize: 13, padding: '4px 10px', borderRadius: 7 }}>{children}</div>
}

export function MiniSwitch({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <div onClick={(e) => { e.stopPropagation(); onToggle() }} style={{ width: 40, height: 22, borderRadius: 14, background: on ? C.navy2 : '#d8d6df', position: 'relative', cursor: 'pointer', flex: 'none' }}>
      <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: on ? 21 : 3, boxShadow: '0 1px 3px rgba(0,0,0,.25)', transition: 'left .12s' }} />
    </div>
  )
}

export function Switch({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <div onClick={onToggle} style={{ width: 46, height: 26, borderRadius: 16, background: on ? C.navy2 : '#d8d6df', position: 'relative', cursor: 'pointer', flex: 'none' }}>
      <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: on ? 23 : 3, boxShadow: '0 1px 3px rgba(0,0,0,.25)', transition: 'left .12s' }} />
    </div>
  )
}

function OptionsEditor({ options, onChange }: { options: string[]; onChange: (o: string[]) => void }) {
  return (
    <div style={{ marginTop: 12 }} onClick={(e) => e.stopPropagation()}>
      <div style={{ fontSize: 13, color: C.muted2, marginBottom: 6 }}>Options</div>
      {options.map((o, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ color: '#cfcdd6' }}>◦</span>
          <input value={o} onChange={(e) => onChange(options.map((x, j) => (j === i ? e.target.value : x)))} style={{ flex: 1, border: '1px solid #ececf0', borderRadius: 8, padding: '9px 12px', fontFamily: 'inherit', fontSize: 15, outline: 'none' }} />
          <span onClick={() => onChange(options.filter((_, j) => j !== i))} style={{ color: '#c9491f', cursor: 'pointer', fontWeight: 800 }}>✕</span>
        </div>
      ))}
      <div onClick={() => onChange([...options, `Option ${options.length + 1}`])} style={{ color: C.cyan, fontWeight: 700, fontSize: 14, cursor: 'pointer', marginTop: 2 }}>＋ Add option</div>
    </div>
  )
}

function FieldOptions({ field, others, onType, onConfig }: {
  field: StructureField
  others: FieldRef[]
  onType: (t: FieldType) => void
  onConfig: (patch: Partial<FieldConfig>) => void
}) {
  const cfg = field.config ?? {}
  const row = (label: string, on: boolean, toggle: () => void) => (
    <div style={{ display: 'flex', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid #f0eff3' }}>
      <span style={{ fontWeight: 600, fontSize: 16, color: C.ink, flex: 1 }}>{label}</span>
      <Switch on={on} onToggle={toggle} />
    </div>
  )
  return (
    <div>
      <div style={{ color: C.muted2, fontWeight: 800, fontSize: 13, letterSpacing: '1.2px' }}>FIELD OPTIONS</div>
      <div style={{ fontWeight: 800, fontSize: 18, color: C.inkDark, margin: '8px 0 18px', wordBreak: 'break-word' }}>{field.label || 'Untitled field'}</div>

      <div style={{ fontWeight: 700, fontSize: 14, color: '#4b4556', marginBottom: 8 }}>Field Type</div>
      <select value={field.type} onChange={(e) => onType(e.target.value as FieldType)} style={selStyle}>
        {FIELD_TYPES.map((ft) => <option key={ft.type} value={ft.type}>{ft.label}</option>)}
      </select>

      {row('Instructions', cfg.instructions !== undefined, () => onConfig({ instructions: cfg.instructions === undefined ? '' : undefined }))}
      {!isDisplayField(field.type) && row('Required', !!cfg.required, () => onConfig({ required: !cfg.required }))}
      {!isDisplayField(field.type) && row('Internal use only', !!cfg.internalOnly, () => onConfig({ internalOnly: !cfg.internalOnly }))}
      {!isDisplayField(field.type) && row('Multiple answers', !!cfg.multi, () => onConfig({ multi: !cfg.multi }))}
      {row('Custom placeholder', cfg.placeholder !== undefined, () => onConfig({ placeholder: cfg.placeholder === undefined ? '' : undefined }))}
      {row('Conditions', !!cfg.condition, () => onConfig({ condition: cfg.condition ? undefined : { whenKey: '', equals: '' } }))}

      {cfg.placeholder !== undefined && (
        <div style={{ marginTop: 14 }}>
          <div style={labelStyle}>Placeholder text</div>
          <input value={cfg.placeholder} onChange={(e) => onConfig({ placeholder: e.target.value })} style={inpStyle} />
        </div>
      )}

      {cfg.condition && (
        <div style={{ marginTop: 16, background: '#f7fafd', border: '1px solid #d7e8f4', borderRadius: 10, padding: 14 }}>
          <div style={{ ...labelStyle, marginBottom: 8 }}>Show this field only when…</div>
          <select
            value={cfg.condition.whenKey}
            onChange={(e) => onConfig({ condition: { ...cfg.condition!, whenKey: e.target.value } })}
            style={{ ...selStyle, marginBottom: 10 }}
          >
            <option value="">Select a field…</option>
            {others.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
          <div style={labelStyle}>…has the answer</div>
          <input
            value={cfg.condition.equals}
            onChange={(e) => onConfig({ condition: { ...cfg.condition!, equals: e.target.value } })}
            placeholder="e.g. Yes"
            style={inpStyle}
          />
        </div>
      )}
    </div>
  )
}

const selStyle: React.CSSProperties = { width: '100%', border: '1px solid #e1e0e7', borderRadius: 10, padding: '11px 12px', fontFamily: 'inherit', fontSize: 15, color: C.ink, outline: 'none', marginBottom: 18, background: '#fff' }
const labelStyle: React.CSSProperties = { fontWeight: 700, fontSize: 14, color: '#4b4556', marginBottom: 8 }
const inpStyle: React.CSSProperties = { width: '100%', border: '1px solid #e1e0e7', borderRadius: 10, padding: '11px 12px', fontFamily: 'inherit', fontSize: 15, outline: 'none', background: '#fff' }
