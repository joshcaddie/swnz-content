import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { FieldConfig, FieldType, Structure, StructureField, StructurePage } from '../lib/database.types'
import { useTemplates } from '../api/templates'
import { useClients, useCreateClient } from '../api/clients'
import { useStages } from '../api/stages'
import { useCreateRequest } from '../api/requests'
import { sendInvite } from '../api/email'
import { FieldModal } from '../components/FieldModal'
import { FIELD_TYPES, iconFor, isDisplayField } from '../fields/registry'
import { GALLERY_CATS } from '../data'
import { C } from '../theme'

const STEPS = ['Templates', 'Essentials', 'Builder', 'Preview', 'Finalize']
const NEXT: Record<number, { label: string; go: number; dim?: boolean }> = {
  1: { label: 'ESSENTIALS', go: 2, dim: true },
  2: { label: 'BUILDER', go: 3 },
  3: { label: 'PREVIEW', go: 4 },
  4: { label: 'FINALIZE', go: 5 },
  5: { label: 'SEND', go: 0 },
}
const CHOICE_TYPES: FieldType[] = ['checkbox', 'single_choice', 'dropdown', 'image_choice']
const needsOptions = (t: FieldType) => CHOICE_TYPES.includes(t)
const blankStructure = (): Structure => ({ pages: [{ name: 'Home page', sections: [{ name: 'Get started', fields: [] }] }] })

export function WizardPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { data: templates } = useTemplates()
  const { data: clients } = useClients()
  const { data: stages } = useStages()
  const createClient = useCreateClient()
  const createRequest = useCreateRequest()

  const [step, setStep] = useState(1)
  const [structure, setStructure] = useState<Structure>(blankStructure())
  const [name, setName] = useState('SchoolName - inner pages content')
  const [clientId, setClientId] = useState<string | null>(null)
  const [dueDate, setDueDate] = useState('')
  const [folder, setFolder] = useState('Default Folder')
  const [reminders, setReminders] = useState(true)
  const [verifyEmail, setVerifyEmail] = useState(false)
  const [activePage, setActivePage] = useState(0)
  const [sel, setSel] = useState<{ si: number; fi: number } | null>(null)
  const [fieldModal, setFieldModal] = useState(false)
  const [sending, setSending] = useState(false)

  const templateId = params.get('template')
  useEffect(() => {
    if (templateId && templates) {
      const t = templates.find((x) => x.id === templateId)
      if (t) { setStructure(t.structure); setName(t.name); setStep(2) }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId, templates])

  const nx = NEXT[step]
  const ap = structure.pages[activePage] ?? structure.pages[0]

  // ---- in-memory structure editing ----
  const mutate = (fn: (s: Structure) => Structure) => setStructure((s) => fn(JSON.parse(JSON.stringify(s))))
  const addPage = () => { mutate((s) => { s.pages.push({ name: 'Untitled page', sections: [] }); return s }); setSel(null) }
  const renamePage = (pi: number, v: string) => mutate((s) => { s.pages[pi].name = v; return s })
  const deletePage = (pi: number) => { mutate((s) => { s.pages.splice(pi, 1); return s }); setActivePage(0); setSel(null) }
  const addSection = () => mutate((s) => { s.pages[activePage].sections.push({ name: 'Untitled section', fields: [] }); return s })
  const renameSection = (si: number, v: string) => mutate((s) => { s.pages[activePage].sections[si].name = v; return s })
  const deleteSection = (si: number) => { mutate((s) => { s.pages[activePage].sections.splice(si, 1); return s }); setSel(null) }
  const addField = (type: FieldType, label: string) => {
    mutate((s) => {
      const page = s.pages[activePage]
      if (page.sections.length === 0) page.sections.push({ name: 'Untitled section', fields: [] })
      const si = page.sections.length - 1
      const config: FieldConfig = needsOptions(type) ? { options: ['Option 1', 'Option 2'] } : {}
      page.sections[si].fields.push({ type, label, config })
      setSel({ si, fi: page.sections[si].fields.length - 1 })
      return s
    })
  }
  const deleteField = (si: number, fi: number) => { mutate((s) => { s.pages[activePage].sections[si].fields.splice(fi, 1); return s }); setSel(null) }
  const patchField = (si: number, fi: number, patch: Partial<StructureField>) =>
    mutate((s) => { s.pages[activePage].sections[si].fields[fi] = { ...s.pages[activePage].sections[si].fields[fi], ...patch }; return s })
  const patchConfig = (si: number, fi: number, patch: Partial<FieldConfig>) =>
    mutate((s) => {
      const f = s.pages[activePage].sections[si].fields[fi]
      f.config = { ...(f.config ?? {}), ...patch }
      return s
    })
  const changeType = (si: number, fi: number, type: FieldType) =>
    mutate((s) => {
      const f = s.pages[activePage].sections[si].fields[fi]
      f.type = type
      if (needsOptions(type) && !(f.config?.options?.length)) f.config = { ...(f.config ?? {}), options: ['Option 1', 'Option 2'] }
      return s
    })

  const finalize = async () => {
    setSending(true)
    try {
      const id = await createRequest.mutateAsync({ name, clientId, stageId: stages?.[0]?.id ?? null, dueDate: dueDate || null, folder, structure })
      if (clientId) await sendInvite(id).catch(() => {})
      navigate('/')
    } finally { setSending(false) }
  }
  const onNext = () => (nx.go === 0 ? finalize() : setStep(nx.go))
  const back = () => (step > 1 ? setStep(step - 1) : navigate('/'))

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, background: C.panel }}>
      {/* stepper */}
      <div style={{ background: '#fff', borderBottom: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', padding: '16px 26px', gap: 16, flex: 'none' }}>
        <div onClick={back} style={roundBtn}>‹</div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          {STEPS.map((label, i) => {
            const num = i + 1
            const active = step === num
            return (
              <div key={label} onClick={() => setStep(num)} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: active ? C.cyan : 'transparent', border: active ? 'none' : '2px solid #cfcdd6', color: active ? '#fff' : '#9b95a5', fontWeight: 800, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{num}</div>
                <span style={{ fontWeight: active ? 800 : 700, fontSize: 21, color: active ? C.inkDark : '#9b95a5' }}>{label}</span>
                {i < 4 && <span style={{ color: '#cfcdd6', fontSize: 22, margin: '0 8px' }}>›</span>}
              </div>
            )
          })}
        </div>
        <div onClick={onNext} style={{ background: nx.dim ? '#e3f1fb' : C.navy2, color: nx.dim ? '#9cc7e6' : '#fff', fontWeight: 800, fontSize: 14, letterSpacing: '0.6px', padding: '13px 22px', borderRadius: 26, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, flex: 'none' }}>
          {sending ? 'SENDING…' : nx.label} ›
        </div>
      </div>

      {step === 1 && (
        <TemplatesStep templates={templates ?? []} onScratch={() => { setStructure(blankStructure()); setStep(2) }} onPick={(s, nm) => { setStructure(s); setName(nm); setStep(2) }} />
      )}
      {step === 2 && (
        <EssentialsStep name={name} setName={setName} clients={clients ?? []} clientId={clientId} setClientId={setClientId}
          onAddClient={async (nm) => { const c = await createClient.mutateAsync({ name: nm }); setClientId(c.id) }}
          dueDate={dueDate} setDueDate={setDueDate} folder={folder} setFolder={setFolder}
          reminders={reminders} setReminders={setReminders} verifyEmail={verifyEmail} setVerifyEmail={setVerifyEmail} />
      )}
      {step === 3 && (
        <BuilderStep
          structure={structure} activePage={activePage} setActivePage={(i) => { setActivePage(i); setSel(null) }} ap={ap} name={name}
          sel={sel} setSel={setSel}
          addPage={addPage} renamePage={renamePage} deletePage={deletePage}
          addSection={addSection} renameSection={renameSection} deleteSection={deleteSection}
          deleteField={deleteField} patchField={patchField} patchConfig={patchConfig} changeType={changeType}
          openFieldModal={() => setFieldModal(true)}
        />
      )}
      {step === 4 && <PreviewStep structure={structure} name={name} />}
      {step === 5 && <FinalizeStep onSend={finalize} sending={sending} />}

      {fieldModal && <FieldModal onClose={() => setFieldModal(false)} onPick={(t, l) => { addField(t, l); setFieldModal(false) }} />}
    </div>
  )
}

const roundBtn: React.CSSProperties = { width: 44, height: 44, borderRadius: '50%', background: '#fff', border: '1px solid #e1e0e7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6f6a7a', fontSize: 19, cursor: 'pointer', flex: 'none', boxShadow: '0 2px 5px rgba(0,0,0,.05)' }

// ---------- Step 1 ----------
function TemplatesStep({ templates, onScratch, onPick }: {
  templates: { id: string; name: string; description: string | null; structure: Structure }[]
  onScratch: () => void
  onPick: (s: Structure, name: string) => void
}) {
  return (
    <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
      <div style={{ width: 420, flex: 'none', background: '#fff', borderRight: `1px solid ${C.line}`, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ padding: '22px 26px 10px', color: C.muted2, fontWeight: 800, fontSize: 13, letterSpacing: '1.2px' }}>TEMPLATE GALLERY</div>
        <div className="swnz-scroll" style={{ flex: 1, overflowY: 'auto', padding: '6px 14px 14px' }}>
          {GALLERY_CATS.map((cat) => (
            <div key={cat.name} className="swnz-hover swnz-hover-grey" style={{ display: 'flex', alignItems: 'center', gap: 15, padding: '12px 14px', borderRadius: 10, cursor: 'pointer' }}>
              <span style={{ width: 13, height: 13, borderRadius: '50%', background: cat.dot, flex: 'none' }} />
              <span style={{ fontWeight: 700, fontSize: 19, color: C.ink }}>{cat.name}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="swnz-scroll" style={{ flex: 1, overflowY: 'auto', padding: '28px 36px 50px' }}>
        <div onClick={onScratch} style={{ display: 'inline-block', background: C.navy2, color: '#fff', fontWeight: 800, fontSize: 15, letterSpacing: '0.6px', padding: '16px 28px', borderRadius: 28, cursor: 'pointer' }}>START FROM SCRATCH</div>
        <div style={{ fontWeight: 800, fontSize: 27, color: C.inkDark, margin: '36px 0 18px' }}>My Templates</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 22 }}>
          {templates.map((t) => (
            <div key={t.id} onClick={() => onPick(t.structure, t.name)} style={{ background: '#fff', border: '1px solid #e9e8ee', borderRadius: 14, padding: 24, minHeight: 200, display: 'flex', flexDirection: 'column', cursor: 'pointer', boxShadow: '0 2px 8px rgba(40,30,60,.05)' }}>
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <div style={{ width: 56, height: 56, borderRadius: 12, background: '#e7f5f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flex: 'none' }}>🏠</div>
                <div style={{ fontWeight: 800, fontSize: 20, color: C.inkDark, lineHeight: 1.3 }}>{t.name}</div>
              </div>
              <div style={{ color: C.muted2, fontSize: 16, marginTop: 16, flex: 1 }}>{t.description || 'No description provided.'}</div>
            </div>
          ))}
          {templates.length === 0 && <div style={{ color: C.muted }}>No templates yet — start from scratch.</div>}
        </div>
      </div>
    </div>
  )
}

// ---------- Step 2 ----------
function EssentialsStep(p: {
  name: string; setName: (v: string) => void
  clients: { id: string; name: string }[]; clientId: string | null; setClientId: (v: string | null) => void
  onAddClient: (name: string) => void
  dueDate: string; setDueDate: (v: string) => void
  folder: string; setFolder: (v: string) => void
  reminders: boolean; setReminders: (v: boolean) => void
  verifyEmail: boolean; setVerifyEmail: (v: boolean) => void
}) {
  const label = (t: string) => <div style={{ fontWeight: 700, fontSize: 15, color: '#4b4556', marginBottom: 9 }}>{t}</div>
  const inp: React.CSSProperties = { width: '100%', border: '1px solid #e1e0e7', borderRadius: 10, padding: '14px 16px', fontFamily: 'inherit', fontSize: 17, color: C.ink, outline: 'none' }
  return (
    <div className="swnz-scroll" style={{ flex: 1, overflowY: 'auto', padding: 38, display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: 760, maxWidth: '100%', background: '#fff', border: '1px solid #e9e8ee', borderRadius: 18, padding: '38px 42px', boxShadow: '0 4px 16px rgba(40,30,60,.06)', height: 'fit-content' }}>
        <div style={{ fontWeight: 800, fontSize: 28, color: C.inkDark }}>Request essentials</div>
        <div style={{ color: C.muted, fontSize: 16, margin: '6px 0 30px' }}>The basics — name it, choose the client, set a due date.</div>
        {label('Request name')}
        <input value={p.name} onChange={(e) => p.setName(e.target.value)} style={{ ...inp, marginBottom: 24 }} />
        {label('Client')}
        <select value={p.clientId ?? ''} onChange={(e) => {
          if (e.target.value === '__add') { const nm = prompt('New client name'); if (nm) p.onAddClient(nm) }
          else p.setClientId(e.target.value || null)
        }} style={{ ...inp, marginBottom: 24 }}>
          <option value="">Select a client…</option>
          {p.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          <option value="__add">＋ Add a new client…</option>
        </select>
        <div style={{ display: 'flex', gap: 24 }}>
          <div style={{ flex: 1 }}>{label('Due date')}<input type="date" value={p.dueDate} onChange={(e) => p.setDueDate(e.target.value)} style={inp} /></div>
          <div style={{ flex: 1 }}>{label('Folder')}<input value={p.folder} onChange={(e) => p.setFolder(e.target.value)} style={inp} /></div>
        </div>
        <ToggleRow on={p.reminders} onToggle={() => p.setReminders(!p.reminders)} text="Send automated reminders to the client" top />
        <ToggleRow on={p.verifyEmail} onToggle={() => p.setVerifyEmail(!p.verifyEmail)} text="Require the client to verify their email with a code" />
      </div>
    </div>
  )
}

function ToggleRow({ on, onToggle, text, top }: { on: boolean; onToggle: () => void; text: string; top?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 24, paddingTop: top ? 22 : 0, borderTop: top ? '1px solid #f0eff3' : 'none' }}>
      <Switch on={on} onToggle={onToggle} />
      <span style={{ fontWeight: 600, fontSize: 17, color: C.ink }}>{text}</span>
    </div>
  )
}

function Switch({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <div onClick={onToggle} style={{ width: 46, height: 26, borderRadius: 16, background: on ? C.navy2 : '#d8d6df', position: 'relative', cursor: 'pointer', flex: 'none' }}>
      <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: on ? 23 : 3, boxShadow: '0 1px 3px rgba(0,0,0,.25)', transition: 'left .12s' }} />
    </div>
  )
}

// ---------- Step 3: Builder ----------
interface BuilderProps {
  structure: Structure; activePage: number; setActivePage: (i: number) => void; ap: StructurePage; name: string
  sel: { si: number; fi: number } | null; setSel: (s: { si: number; fi: number } | null) => void
  addPage: () => void; renamePage: (pi: number, v: string) => void; deletePage: (pi: number) => void
  addSection: () => void; renameSection: (si: number, v: string) => void; deleteSection: (si: number) => void
  deleteField: (si: number, fi: number) => void
  patchField: (si: number, fi: number, patch: Partial<StructureField>) => void
  patchConfig: (si: number, fi: number, patch: Partial<FieldConfig>) => void
  changeType: (si: number, fi: number, type: FieldType) => void
  openFieldModal: () => void
}

function BuilderStep(p: BuilderProps) {
  const selField = p.sel ? p.ap.sections[p.sel.si]?.fields[p.sel.fi] : null

  return (
    <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
      {/* pages */}
      <div style={{ width: 300, flex: 'none', background: '#fff', borderRight: `1px solid ${C.line}`, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '22px 22px 14px' }}>
          <span style={{ fontWeight: 800, fontSize: 14, letterSpacing: '1.2px', color: '#6f6a7a', flex: 1 }}>PAGES</span>
        </div>
        <div className="swnz-scroll" style={{ flex: 1, overflowY: 'auto', padding: '0 14px' }}>
          {p.structure.pages.map((pg, pi) => (
            <div key={pi}>
              <div onClick={() => p.setActivePage(pi)} className="swnz-hover swnz-hover-grey" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 12px', borderRadius: 8, cursor: 'pointer' }}>
                <span style={{ fontWeight: 800, fontSize: 17, flex: 1, color: pi === p.activePage ? C.cyan : C.ink }}>{pi + 1}. {pg.name}</span>
                {p.structure.pages.length > 1 && <span onClick={(e) => { e.stopPropagation(); p.deletePage(pi) }} style={{ color: '#c9491f', fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>✕</span>}
              </div>
              {pi === p.activePage && pg.sections.map((sec, si) => (
                <div key={si}>
                  <div style={{ padding: '8px 12px 6px 24px', fontWeight: 700, fontSize: 15, color: '#3b3548' }}>{pi + 1}.{si + 1} {sec.name}</div>
                  {sec.fields.map((f, fi) => (
                    <div key={fi} onClick={() => p.setSel({ si, fi })} style={{ padding: '6px 12px 6px 36px', color: p.sel?.si === si && p.sel?.fi === fi ? C.cyan : '#7b7686', fontSize: 14, cursor: 'pointer', fontWeight: p.sel?.si === si && p.sel?.fi === fi ? 700 : 400 }}>{f.label || 'Untitled field'}</div>
                  ))}
                </div>
              ))}
            </div>
          ))}
          <div onClick={p.addPage} style={{ display: 'inline-flex', alignItems: 'center', gap: 10, border: `1.5px solid ${C.navy2}`, color: C.navy2, fontWeight: 800, fontSize: 14, letterSpacing: '0.5px', padding: '11px 18px', borderRadius: 24, margin: '16px 4px', cursor: 'pointer' }}>ADD A PAGE ▾</div>
        </div>
      </div>

      {/* canvas */}
      <div className="swnz-scroll" style={{ flex: 1, overflowY: 'auto', padding: '28px 36px 60px' }}>
        <div style={{ fontWeight: 800, fontSize: 30, color: C.inkDark }}>{p.name}</div>
        <input value={p.ap.name} onChange={(e) => p.renamePage(p.activePage, e.target.value)} style={{ fontWeight: 800, fontSize: 24, color: C.inkDark, border: 'none', outline: 'none', background: 'transparent', marginTop: 24, width: '100%' }} />

        {p.ap.sections.map((sec, si) => (
          <div key={si} style={{ background: '#fff', border: '1.5px solid #bfe0f2', borderRadius: 16, padding: 24, marginTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input value={sec.name} onChange={(e) => p.renameSection(si, e.target.value)} style={{ fontWeight: 800, fontSize: 20, color: C.inkDark, border: 'none', outline: 'none', background: 'transparent', flex: 1 }} />
              <span onClick={() => p.deleteSection(si)} style={{ color: '#c9491f', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>Delete section</span>
            </div>

            {sec.fields.map((f, fi) => {
              const selected = p.sel?.si === si && p.sel?.fi === fi
              const cfg = f.config ?? {}
              return (
                <div key={fi} onClick={() => p.setSel({ si, fi })} style={{ marginTop: 14, border: selected ? `2px solid ${C.cyan}` : '1px solid #ededf1', borderRadius: 10, padding: 16, cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,.04)', background: '#fff' }}>
                  {cfg.multi && <div style={{ display: 'inline-block', background: '#e6f3fb', color: C.navy2, fontWeight: 600, fontSize: 13, padding: '4px 10px', borderRadius: 7, marginBottom: 10 }}>Multi Answer</div>}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ color: C.navy2, fontSize: 18, width: 22, textAlign: 'center' }}>{iconFor(f.type)}</span>
                    <input value={f.label} onChange={(e) => p.patchField(si, fi, { label: e.target.value })} placeholder="Question / field label" style={{ fontWeight: 600, fontSize: 17, color: C.ink, flex: 1, border: 'none', outline: 'none', background: 'transparent' }} />
                    {cfg.required && <span style={{ color: '#c9491f', fontWeight: 800 }}>*</span>}
                    {cfg.internalOnly && <span style={{ fontSize: 12, color: C.muted2, background: '#f0eff3', padding: '3px 8px', borderRadius: 6 }}>internal</span>}
                    <span onClick={(e) => { e.stopPropagation(); p.deleteField(si, fi) }} style={{ color: '#cfcdd6', fontWeight: 800, fontSize: 17, cursor: 'pointer' }}>✕</span>
                  </div>

                  {cfg.instructions !== undefined && (
                    <textarea value={cfg.instructions} onChange={(e) => p.patchConfig(si, fi, { instructions: e.target.value })} placeholder="Instructions for the client…" onClick={(e) => e.stopPropagation()}
                      style={{ width: '100%', marginTop: 12, border: '1px solid #ececf0', borderRadius: 8, padding: '10px 12px', fontFamily: 'inherit', fontSize: 14, color: '#4b4556', background: '#fafafb', outline: 'none', minHeight: 60, resize: 'vertical' }} />
                  )}

                  {needsOptions(f.type) && (
                    <OptionsEditor options={cfg.options ?? []} onChange={(options) => p.patchConfig(si, fi, { options })} />
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

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 30 }}>
          <div onClick={p.addSection} style={{ border: `1.5px solid ${C.navy2}`, color: C.navy2, fontWeight: 800, fontSize: 14, letterSpacing: '0.5px', padding: '14px 26px', borderRadius: 26, cursor: 'pointer', background: '#fff' }}>ADD A SECTION ▾</div>
        </div>
      </div>

      {/* field options panel */}
      <div style={{ width: 340, flex: 'none', background: '#fff', borderLeft: `1px solid ${C.line}`, padding: '22px 24px', minHeight: 0, overflowY: 'auto' }} className="swnz-scroll">
        {selField && p.sel ? (
          <FieldOptions
            field={selField}
            onType={(t) => p.changeType(p.sel!.si, p.sel!.fi, t)}
            onConfig={(patch) => p.patchConfig(p.sel!.si, p.sel!.fi, patch)}
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

function FieldOptions({ field, onType, onConfig }: {
  field: StructureField
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
      <select value={field.type} onChange={(e) => onType(e.target.value as FieldType)} style={{ width: '100%', border: '1px solid #e1e0e7', borderRadius: 10, padding: '11px 12px', fontFamily: 'inherit', fontSize: 15, color: C.ink, outline: 'none', marginBottom: 18 }}>
        {FIELD_TYPES.map((ft) => <option key={ft.type} value={ft.type}>{ft.label}</option>)}
      </select>

      {row('Instructions', cfg.instructions !== undefined, () => onConfig({ instructions: cfg.instructions === undefined ? '' : undefined }))}
      {!isDisplayField(field.type) && row('Required', !!cfg.required, () => onConfig({ required: !cfg.required }))}
      {!isDisplayField(field.type) && row('Internal use only', !!cfg.internalOnly, () => onConfig({ internalOnly: !cfg.internalOnly }))}
      {!isDisplayField(field.type) && row('Multiple answers', !!cfg.multi, () => onConfig({ multi: !cfg.multi }))}
      {row('Custom placeholder', cfg.placeholder !== undefined, () => onConfig({ placeholder: cfg.placeholder === undefined ? '' : undefined }))}
      {row('Conditions', !!cfg.conditions, () => onConfig({ conditions: !cfg.conditions }))}

      {cfg.placeholder !== undefined && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#4b4556', marginBottom: 8 }}>Placeholder text</div>
          <input value={cfg.placeholder} onChange={(e) => onConfig({ placeholder: e.target.value })} style={{ width: '100%', border: '1px solid #e1e0e7', borderRadius: 10, padding: '11px 12px', fontFamily: 'inherit', fontSize: 15, outline: 'none' }} />
        </div>
      )}
    </div>
  )
}

// ---------- Step 4 ----------
function PreviewStep({ structure, name }: { structure: Structure; name: string }) {
  return (
    <div className="swnz-scroll" style={{ flex: 1, overflowY: 'auto', padding: 40, display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: 900, maxWidth: '100%' }}>
        <div style={{ fontWeight: 800, fontSize: 30, color: C.inkDark }}>{name}</div>
        <div style={{ color: C.muted, fontSize: 16, margin: '8px 0 26px' }}>This is how your client will see the request.</div>
        {structure.pages.map((pg, pi) =>
          pg.sections.map((sec, si) => (
            <div key={`${pi}-${si}`} style={{ background: '#fff', border: '1px solid #e9e8ee', borderRadius: 16, padding: '32px 36px', marginBottom: 20, boxShadow: '0 2px 10px rgba(40,30,60,.05)' }}>
              <div style={{ fontWeight: 800, fontSize: 22, color: C.inkDark, marginBottom: 22 }}>{sec.name}</div>
              {sec.fields.filter((f) => !(f.config?.internalOnly)).map((f, fi) => (
                <div key={fi} style={{ marginBottom: 24 }}>
                  {isDisplayField(f.type) ? (
                    <div style={{ fontWeight: f.type === 'heading' ? 800 : 400, fontSize: f.type === 'heading' ? 20 : 15, color: f.type === 'heading' ? C.inkDark : '#5b5667' }}>{f.type === 'divider' ? <hr style={{ border: 'none', borderTop: '1px solid #e4e3e9' }} /> : (f.config?.instructions || f.label)}</div>
                  ) : (
                    <>
                      <div style={{ fontWeight: 700, fontSize: 18, color: C.ink, marginBottom: f.config?.instructions ? 4 : 10 }}>{f.label}{f.config?.required && <span style={{ color: '#c9491f' }}> *</span>}</div>
                      {f.config?.instructions && <div style={{ color: C.muted, fontSize: 14, marginBottom: 10 }}>{f.config.instructions}</div>}
                      <div style={{ minHeight: 80, background: C.panel, border: '1px solid #e3e2e8', borderRadius: 10, padding: '14px 16px', color: '#a8a4b0', fontSize: 16 }}>{f.config?.placeholder || 'Client response…'}</div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )),
        )}
      </div>
    </div>
  )
}

// ---------- Step 5 ----------
function FinalizeStep({ onSend, sending }: { onSend: () => void; sending: boolean }) {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
      <div style={{ width: 620, maxWidth: '100%', background: '#fff', border: '1px solid #e9e8ee', borderRadius: 18, padding: 44, textAlign: 'center', boxShadow: '0 4px 16px rgba(40,30,60,.06)' }}>
        <div style={{ width: 74, height: 74, borderRadius: '50%', background: '#e7f5f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, margin: '0 auto 22px' }}>📨</div>
        <div style={{ fontWeight: 800, fontSize: 28, color: C.inkDark, marginBottom: 12 }}>Ready to send</div>
        <div style={{ color: C.muted, fontSize: 17, lineHeight: 1.6, marginBottom: 30 }}>Your request is ready. Send it to your client and we'll notify them by email, then keep you posted as they fill it in.</div>
        <div onClick={onSend} style={{ display: 'inline-block', background: C.gradient, color: '#fff', fontWeight: 800, fontSize: 15, letterSpacing: '0.6px', padding: '16px 34px', borderRadius: 28, cursor: 'pointer', boxShadow: '0 4px 14px rgba(27,160,230,.32)' }}>{sending ? 'SENDING…' : 'SEND REQUEST'}</div>
      </div>
    </div>
  )
}
