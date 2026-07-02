import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { FieldConfig, FieldType, Structure, StructureField } from '../lib/database.types'
import { useTemplates } from '../api/templates'
import { useClients, useCreateClient } from '../api/clients'
import { useStages } from '../api/stages'
import { useProfiles } from '../api/profiles'
import { useCreateRequest } from '../api/requests'
import { sendInvite } from '../api/email'
import { supabase } from '../lib/supabase'
import { FieldModal } from '../components/FieldModal'
import { StructureBuilder, Switch, backfillKeys, newFieldKey, needsOptions, type BuilderApi } from '../components/StructureBuilder'
import { isDisplayField } from '../fields/registry'
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
const blankStructure = (): Structure => ({ pages: [{ name: 'Home page', sections: [{ name: 'Get started', fields: [] }] }] })

export function WizardPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { data: templates } = useTemplates()
  const { data: clients } = useClients()
  const { data: stages } = useStages()
  const { data: profiles } = useProfiles()
  const createClient = useCreateClient()
  const createRequest = useCreateRequest()

  const [step, setStep] = useState(1)
  const [structure, setStructure] = useState<Structure>(blankStructure())
  const [name, setName] = useState('SchoolName - inner pages content')
  const [clientId, setClientId] = useState<string | null>(null)
  const [ownerId, setOwnerId] = useState<string | null>(null)
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
      if (t) {
        setStructure(backfillKeys(JSON.parse(JSON.stringify(t.structure))))
        setName(t.name)
        setStep(2)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId, templates])

  const nx = NEXT[step]

  // ---- in-memory structure editing ----
  const mutate = (fn: (s: Structure) => void) =>
    setStructure((s) => {
      const copy = JSON.parse(JSON.stringify(s)) as Structure
      fn(copy)
      return copy
    })

  const api: BuilderApi = useMemo(() => ({
    addPage: () => { mutate((s) => { s.pages.push({ name: 'Untitled page', sections: [] }) }); setSel(null) },
    addPages: (pages) => {
      mutate((s) => {
        // If the wizard still only has the untouched blank page, replace it outright.
        const onlyBlank = s.pages.length === 1 && s.pages[0].sections.every((sec) => sec.fields.length === 0)
        if (onlyBlank) s.pages = pages
        else s.pages.push(...pages)
      })
      setSel(null)
      setActivePage(0)
    },
    renamePage: (pi, v) => mutate((s) => { s.pages[pi].name = v }),
    patchPage: (pi, patch) => {
      if (patch.navOnly) {
        const hasFields = structure.pages[pi].sections.some((sec) => sec.fields.length > 0)
        if (hasFields && !confirm('Make this a navigation label only? Its sections and fields will be removed.')) return
      }
      mutate((s) => {
        Object.assign(s.pages[pi], patch)
        if (patch.navOnly) s.pages[pi].sections = []
      })
      setSel(null)
    },
    deletePage: (pi) => { mutate((s) => { s.pages.splice(pi, 1) }); setActivePage(0); setSel(null) },
    addSection: () => mutate((s) => { s.pages[activePage].sections.push({ name: 'Untitled section', fields: [] }) }),
    renameSection: (si, v) => mutate((s) => { s.pages[activePage].sections[si].name = v }),
    patchSection: (si, patch) => mutate((s) => { Object.assign(s.pages[activePage].sections[si], patch) }),
    deleteSection: (si) => { mutate((s) => { s.pages[activePage].sections.splice(si, 1) }); setSel(null) },
    deleteField: (si, fi) => { mutate((s) => { s.pages[activePage].sections[si].fields.splice(fi, 1) }); setSel(null) },
    patchField: (si, fi, patch) => mutate((s) => { Object.assign(s.pages[activePage].sections[si].fields[fi], patch) }),
    patchConfig: (si, fi, patch) => mutate((s) => {
      const f = s.pages[activePage].sections[si].fields[fi]
      f.config = cleanConfig({ ...(f.config ?? {}), ...patch })
    }),
    changeType: (si, fi, type) => mutate((s) => {
      const f = s.pages[activePage].sections[si].fields[fi]
      f.type = type
      if (needsOptions(type) && !(f.config?.options?.length)) f.config = { ...(f.config ?? {}), options: ['Option 1', 'Option 2'] }
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [activePage, structure])

  const addField = (type: FieldType, label: string) => {
    mutate((s) => {
      const page = s.pages[activePage]
      if (page.sections.length === 0) page.sections.push({ name: 'Untitled section', fields: [] })
      // Target the section whose "Add a field" was clicked (tracked via sel), else the last one.
      const si = Math.min(sel?.si ?? page.sections.length - 1, page.sections.length - 1)
      const config: FieldConfig = { key: newFieldKey(), ...(needsOptions(type) ? { options: ['Option 1', 'Option 2'] } : {}) }
      page.sections[si].fields.push({ type, label, config })
      setSel({ si, fi: page.sections[si].fields.length - 1 })
    })
  }

  const finalize = async () => {
    setSending(true)
    try {
      const id = await createRequest.mutateAsync({ name, clientId, stageId: stages?.[0]?.id ?? null, dueDate: dueDate || null, folder, structure })
      // Persist the settings create_request doesn't take.
      await supabase.from('requests').update({ owner_id: ownerId, reminders_enabled: reminders, verify_email: verifyEmail }).eq('id', id)
      if (clientId) await sendInvite(id).catch(() => {})
      navigate(`/requests/${id}`)
    } finally {
      setSending(false)
    }
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
        <TemplatesStep
          templates={templates ?? []}
          onScratch={() => { setStructure(blankStructure()); setStep(2) }}
          onPick={(s, nm) => { setStructure(backfillKeys(JSON.parse(JSON.stringify(s)))); setName(nm); setStep(2) }}
        />
      )}
      {step === 2 && (
        <EssentialsStep
          name={name} setName={setName}
          clients={clients ?? []} clientId={clientId} setClientId={setClientId}
          onAddClient={async (nm) => { const c = await createClient.mutateAsync({ name: nm }); setClientId(c.id) }}
          owners={profiles ?? []} ownerId={ownerId} setOwnerId={setOwnerId}
          dueDate={dueDate} setDueDate={setDueDate} folder={folder} setFolder={setFolder}
          reminders={reminders} setReminders={setReminders} verifyEmail={verifyEmail} setVerifyEmail={setVerifyEmail}
        />
      )}
      {step === 3 && (
        <StructureBuilder
          structure={structure} name={name}
          activePage={activePage} setActivePage={(i) => { setActivePage(i); setSel(null) }}
          sel={sel} setSel={setSel}
          api={api}
          openFieldModal={() => setFieldModal(true)}
        />
      )}
      {step === 4 && <PreviewStep structure={structure} name={name} />}
      {step === 5 && <FinalizeStep onSend={finalize} sending={sending} />}

      {fieldModal && <FieldModal onClose={() => setFieldModal(false)} onPick={(t, l) => { addField(t, l); setFieldModal(false) }} />}
    </div>
  )
}

/** Drop keys explicitly set to undefined so toggles can remove settings. */
function cleanConfig(cfg: FieldConfig): FieldConfig {
  const out: FieldConfig = {}
  for (const [k, v] of Object.entries(cfg)) if (v !== undefined) out[k] = v
  return out
}

const roundBtn: React.CSSProperties = { width: 44, height: 44, borderRadius: '50%', background: '#fff', border: '1px solid #e1e0e7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6f6a7a', fontSize: 19, cursor: 'pointer', flex: 'none', boxShadow: '0 2px 5px rgba(0,0,0,.05)' }

// ---------- Step 1 ----------
function TemplatesStep({ templates, onScratch, onPick }: {
  templates: { id: string; name: string; description: string | null; structure: Structure }[]
  onScratch: () => void
  onPick: (s: Structure, name: string) => void
}) {
  const [q, setQ] = useState('')
  const shown = templates.filter((t) => !q.trim() || t.name.toLowerCase().includes(q.toLowerCase()) || (t.description ?? '').toLowerCase().includes(q.toLowerCase()))
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
        <div style={{ background: '#fff', border: '1px solid #e3e2e8', borderRadius: 14, padding: '16px 22px', display: 'flex', alignItems: 'center', gap: 12, marginTop: 26 }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search for a template..." style={{ border: 'none', outline: 'none', fontFamily: 'inherit', fontSize: 18, color: '#5b5667', flex: 1, background: 'transparent', width: '100%' }} />
          <span style={{ color: C.muted2, fontSize: 18 }}>🔍</span>
        </div>
        <div style={{ fontWeight: 800, fontSize: 27, color: C.inkDark, margin: '36px 0 18px' }}>My Templates</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 22 }}>
          {shown.map((t) => (
            <div key={t.id} onClick={() => onPick(t.structure, t.name)} style={{ background: '#fff', border: '1px solid #e9e8ee', borderRadius: 14, padding: 24, minHeight: 200, display: 'flex', flexDirection: 'column', cursor: 'pointer', boxShadow: '0 2px 8px rgba(40,30,60,.05)' }}>
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <div style={{ width: 56, height: 56, borderRadius: 12, background: '#e7f5f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flex: 'none' }}>🏠</div>
                <div style={{ fontWeight: 800, fontSize: 20, color: C.inkDark, lineHeight: 1.3 }}>{t.name}</div>
              </div>
              <div style={{ color: C.muted2, fontSize: 16, marginTop: 16, flex: 1 }}>{t.description || 'No description provided.'}</div>
            </div>
          ))}
          {shown.length === 0 && <div style={{ color: C.muted }}>No templates match.</div>}
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
  owners: { id: string; name: string }[]; ownerId: string | null; setOwnerId: (v: string | null) => void
  dueDate: string; setDueDate: (v: string) => void
  folder: string; setFolder: (v: string) => void
  reminders: boolean; setReminders: (v: boolean) => void
  verifyEmail: boolean; setVerifyEmail: (v: boolean) => void
}) {
  const label = (t: string) => <div style={{ fontWeight: 700, fontSize: 15, color: '#4b4556', marginBottom: 9 }}>{t}</div>
  const inp: React.CSSProperties = { width: '100%', border: '1px solid #e1e0e7', borderRadius: 10, padding: '14px 16px', fontFamily: 'inherit', fontSize: 17, color: C.ink, outline: 'none', background: '#fff' }
  return (
    <div className="swnz-scroll" style={{ flex: 1, overflowY: 'auto', padding: 38, display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: 760, maxWidth: '100%', background: '#fff', border: '1px solid #e9e8ee', borderRadius: 18, padding: '38px 42px', boxShadow: '0 4px 16px rgba(40,30,60,.06)', height: 'fit-content' }}>
        <div style={{ fontWeight: 800, fontSize: 28, color: C.inkDark }}>Request essentials</div>
        <div style={{ color: C.muted, fontSize: 16, margin: '6px 0 30px' }}>The basics — name it, choose the client, set a due date.</div>
        {label('Request name')}
        <input value={p.name} onChange={(e) => p.setName(e.target.value)} style={{ ...inp, marginBottom: 24 }} />
        <div style={{ display: 'flex', gap: 24, marginBottom: 24 }}>
          <div style={{ flex: 1 }}>
            {label('Client')}
            <select value={p.clientId ?? ''} onChange={(e) => {
              if (e.target.value === '__add') { const nm = prompt('New client name'); if (nm) p.onAddClient(nm) }
              else p.setClientId(e.target.value || null)
            }} style={inp}>
              <option value="">Select a client…</option>
              {p.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              <option value="__add">＋ Add a new client…</option>
            </select>
          </div>
          <div style={{ flex: 1 }}>
            {label('Owner')}
            <select value={p.ownerId ?? ''} onChange={(e) => p.setOwnerId(e.target.value || null)} style={inp}>
              <option value="">Unassigned</option>
              {p.owners.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
        </div>
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

// ---------- Step 4 ----------
function PreviewStep({ structure, name }: { structure: Structure; name: string }) {
  return (
    <div className="swnz-scroll" style={{ flex: 1, overflowY: 'auto', padding: 40, display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: 900, maxWidth: '100%' }}>
        <div style={{ fontWeight: 800, fontSize: 30, color: C.inkDark }}>{name}</div>
        <div style={{ color: C.muted, fontSize: 16, margin: '8px 0 26px' }}>This is how your client will see the request. Conditional fields show once their trigger answer matches.</div>
        {structure.pages.map((pg, pi) =>
          pg.sections.map((sec, si) => (
            <div key={`${pi}-${si}`} style={{ background: '#fff', border: '1px solid #e9e8ee', borderRadius: 16, padding: '32px 36px', marginBottom: 20, boxShadow: '0 2px 10px rgba(40,30,60,.05)' }}>
              <div style={{ fontWeight: 800, fontSize: 22, color: C.inkDark, marginBottom: sec.instructions ? 8 : 22 }}>{sec.name}</div>
              {sec.instructions && <div style={{ color: C.muted, fontSize: 14, marginBottom: 18 }}>{sec.instructions}</div>}
              {sec.fields.filter((f: StructureField) => !(f.config?.internalOnly)).map((f: StructureField, fi: number) => (
                <div key={fi} style={{ marginBottom: 24, opacity: f.config?.condition ? 0.55 : 1 }}>
                  {isDisplayField(f.type) ? (
                    <div style={{ fontWeight: f.type === 'heading' ? 800 : 400, fontSize: f.type === 'heading' ? 20 : 15, color: f.type === 'heading' ? C.inkDark : '#5b5667' }}>
                      {f.type === 'divider' ? <hr style={{ border: 'none', borderTop: '1px solid #e4e3e9' }} /> : (f.config?.instructions || f.label)}
                    </div>
                  ) : (
                    <>
                      <div style={{ fontWeight: 700, fontSize: 18, color: C.ink, marginBottom: f.config?.instructions ? 4 : 10 }}>
                        {f.label}{f.config?.required && <span style={{ color: '#c9491f' }}> *</span>}
                        {f.config?.condition && <span style={{ marginLeft: 8, fontSize: 12, color: C.cyan, fontWeight: 700 }}>conditional</span>}
                      </div>
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
