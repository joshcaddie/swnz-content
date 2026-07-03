import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import type { AnswerRow, Json, RequestFieldRow } from '../lib/database.types'
import { portalLoad, portalSaveField, portalSubmitAll, portalLoadAnswers, portalUploadFile, portalRepeatSection, portalVerifySend, portalVerifyCheck, portalAiGenerate, portalFileUrl, type PortalData } from '../api/portal'
import { FieldInput, fileStoragePath, type UploadedFile } from '../fields/FieldInput'
import { isDisplayField } from '../fields/registry'
import { brandOf } from '../brands'
import { BrandLogo } from '../components/BrandLogo'
import { C } from '../theme'

/** Loose comparison for condition triggers ("Yes" matches "yes ", option arrays, etc.). */
function condMatch(v: Json | undefined, equals: string): boolean {
  if (v == null) return false
  const want = equals.trim().toLowerCase()
  if (Array.isArray(v)) return v.some((x) => String(x).trim().toLowerCase() === want)
  return String(v).trim().toLowerCase() === want
}

export function ClientPortal() {
  const { token = '' } = useParams()
  const [data, setData] = useState<PortalData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [values, setValues] = useState<Record<string, Json>>({})
  const [verified, setVerified] = useState(false)
  const [saving, setSaving] = useState<'idle' | 'submitting'>('idle')
  const [savedNote, setSavedNote] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [activePageId, setActivePageId] = useState<string | null>(null)

  // Per-field autosave (only ever sends the field that changed, so a client's save
  // can't overwrite content someone else added), plus live merge from a poll.
  const editingRef = useRef<string | null>(null)
  const dirtyRef = useRef<Set<string>>(new Set())
  const pendingRef = useRef(new Map<string, Json>())
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>())

  useEffect(() => {
    portalLoad(token)
      .then((d) => {
        setData(d)
        setValues(Object.fromEntries(d.answers.map((a) => [a.field_id, a.value])))
        setVerified(!d.request.verify_email)
      })
      .catch((e) => setError(String(e.message ?? e)))
  }, [token])

  const mergeAnswers = (rows: AnswerRow[]) => {
    setValues((prev) => {
      const next = { ...prev }
      for (const a of rows) {
        if (dirtyRef.current.has(a.field_id) || editingRef.current === a.field_id) continue
        next[a.field_id] = a.value
      }
      return next
    })
  }

  // Live sync: poll answers every 4s once verified; merge protects local edits.
  useEffect(() => {
    if (!verified || !data) return
    let alive = true
    const iv = setInterval(async () => {
      try {
        const rows = await portalLoadAnswers(token)
        if (alive) mergeAnswers(rows)
      } catch { /* keep trying */ }
    }, 4000)
    return () => { alive = false; clearInterval(iv) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verified, !!data, token])

  const flush = async (fieldId: string) => {
    const v = pendingRef.current.get(fieldId)
    setSaveState('saving')
    try {
      await portalSaveField(token, fieldId, v as Json)
      if (pendingRef.current.get(fieldId) === v) {
        dirtyRef.current.delete(fieldId)
        pendingRef.current.delete(fieldId)
      }
      setSaveState('saved')
    } catch (e) {
      setSaveState('error')
      setSavedNote(`Could not save: ${(e as Error).message}`)
      const t = timers.current.get(fieldId)
      if (t) clearTimeout(t)
      timers.current.set(fieldId, setTimeout(() => flush(fieldId), 2500))
    }
  }

  // Conditions: a field with config.condition only shows when its trigger answer matches.
  const keyToFieldId = useMemo(() => {
    const m = new Map<string, string>()
    for (const f of data?.fields ?? []) m.set(f.config?.key ?? f.id, f.id)
    return m
  }, [data])
  const isVisible = useMemo(
    () => (f: RequestFieldRow) => {
      const c = f.config?.condition
      if (!c || !c.whenKey) return true
      const ctrlId = keyToFieldId.get(c.whenKey)
      if (!ctrlId) return true
      return condMatch(values[ctrlId], c.equals)
    },
    [keyToFieldId, values],
  )

  const inputFields = useMemo(
    () => (data ? data.fields.filter((f) => !isDisplayField(f.type) && !f.config?.internalOnly && isVisible(f)) : []),
    [data, isVisible],
  )
  const total = inputFields.length
  const answered = useMemo(
    () => inputFields.filter((f) => hasValue(values[f.id])).length,
    [inputFields, values],
  )

  if (error) return <Centered><div style={{ color: '#c9491f', fontWeight: 700 }}>This request link is invalid or has expired.</div></Centered>
  if (!data) return <Centered><div style={{ color: C.muted }}>Loading…</div></Centered>
  if (!verified) return <VerifyGate token={token} onVerified={() => setVerified(true)} />

  const submitForReview = async () => {
    const missing = inputFields.filter((f) => f.config?.required && !hasValue(values[f.id]))
    if (missing.length > 0) {
      setSavedNote(`⚠ Please complete ${missing.length} required field${missing.length > 1 ? 's' : ''} (marked *) before submitting.`)
      return
    }
    setSaving('submitting')
    setSavedNote(null)
    try {
      // Make sure any in-flight edits are saved first, then flip everything to submitted.
      for (const [fid] of pendingRef.current) await portalSaveField(token, fid, pendingRef.current.get(fid) as Json)
      pendingRef.current.clear()
      dirtyRef.current.clear()
      await portalSubmitAll(token)
      setSavedNote('Submitted for review — thank you!')
    } catch (e) {
      setSavedNote(`Could not submit: ${(e as Error).message}`)
    } finally {
      setSaving('idle')
    }
  }

  const addAnother = async (sectionId: string) => {
    try {
      await portalRepeatSection(token, sectionId)
      const d = await portalLoad(token)
      setData(d)
      // keep local unsaved edits on top of refreshed answers
      setValues((prev) => ({ ...Object.fromEntries(d.answers.map((a) => [a.field_id, a.value])), ...prev }))
    } catch (e) {
      setSavedNote(`Could not add another response: ${(e as Error).message}`)
    }
  }

  // Update + schedule a per-field autosave (500ms debounce).
  const setVal = (id: string, v: Json) => {
    setValues((prev) => ({ ...prev, [id]: v }))
    dirtyRef.current.add(id)
    pendingRef.current.set(id, v)
    setSaveState('saving')
    const prev = timers.current.get(id)
    if (prev) clearTimeout(prev)
    timers.current.set(id, setTimeout(() => flush(id), 500))
  }

  const fileUrl = async (f: UploadedFile) => {
    const path = fileStoragePath(f)
    if (!path) throw new Error('this file has no stored path')
    return portalFileUrl(token, path, f.filename)
  }

  const openFile = async (f: UploadedFile) => {
    try {
      window.open(await fileUrl(f), '_blank')
    } catch (e) {
      setSavedNote(`Could not open file: ${(e as Error).message}`)
    }
  }

  const brand = brandOf(data.request.brand)
  // Nav-only (label) pages have no sections but still appear in the nav as group
  // headers so their sub-pages aren't orphaned.
  const renderedPages = data.pages.filter((pg) => pg.nav_only || data.sections.some((s) => s.page_id === pg.id))

  // Per-page answered/total for the nav.
  const sectionPage = new Map(data.sections.map((s) => [s.id, s.page_id]))
  const pageStats = new Map<string, { answered: number; total: number }>()
  for (const f of inputFields) {
    const pid = sectionPage.get(f.section_id)
    if (!pid) continue
    const st = pageStats.get(pid) ?? { answered: 0, total: 0 }
    st.total++
    if (hasValue(values[f.id])) st.answered++
    pageStats.set(pid, st)
  }

  const jumpTo = (pageId: string) =>
    document.getElementById(`portal-page-${pageId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  const onScrollSpy = (e: React.UIEvent<HTMLDivElement>) => {
    const top = e.currentTarget.getBoundingClientRect().top
    let current: string | null = null
    for (const pg of renderedPages) {
      const el = document.getElementById(`portal-page-${pg.id}`)
      if (el && el.getBoundingClientRect().top - top <= 120) current = pg.id
    }
    setActivePageId(current ?? renderedPages[0]?.id ?? null)
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 6, background: brand.bar }} />
      <div style={{ background: brand.topBar, padding: '16px 26px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <BrandLogo brand={brand} size={42} />
        {brand.logoImg && <div style={{ color: '#fff', fontWeight: 800, fontSize: 18 }}>{brand.name}</div>}
        {!brand.logoImg && brand.tagline && <div style={{ color: '#b9b3c2', fontWeight: 600, fontSize: 13 }}>{brand.tagline}</div>}
      </div>

      <div className="swnz-scroll" style={{ flex: 1, overflowY: 'auto', padding: '32px 20px 140px' }} onScroll={onScrollSpy}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', gap: 30, alignItems: 'flex-start' }}>
          {renderedPages.length > 1 && (
            <nav className="portal-nav" style={{ width: 235, flex: 'none', position: 'sticky', top: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 12, letterSpacing: '1.2px', color: C.muted2, margin: '6px 0 10px 12px' }}>PAGES</div>
              <div style={{ background: '#fff', border: '1px solid #e9e8ee', borderRadius: 14, padding: 8, boxShadow: '0 2px 10px rgba(40,30,60,.05)', maxHeight: 'calc(100vh - 260px)', overflowY: 'auto' }} className="swnz-scroll">
                {renderedPages.map((pg) => {
                  const st = pageStats.get(pg.id)
                  const done = !!st && st.total > 0 && st.answered >= st.total
                  const active = pg.id === activePageId
                  // A top-level page with no fields of its own acts as a group header.
                  const isHeader = pg.nav_only && (!st || st.total === 0)
                  return (
                    <div
                      key={pg.id}
                      onClick={() => jumpTo(pg.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: isHeader ? '10px 12px 5px' : '9px 12px', paddingLeft: pg.indent ? 26 : 12, marginTop: isHeader ? 4 : 0, borderRadius: 9, cursor: 'pointer', background: active && !isHeader ? '#eef6fb' : 'transparent' }}
                    >
                      <span style={{ flex: 1, fontWeight: isHeader ? 800 : active ? 800 : 600, fontSize: isHeader ? 12 : 14, letterSpacing: isHeader ? '0.6px' : undefined, textTransform: isHeader ? 'uppercase' : undefined, color: isHeader ? C.muted2 : active ? brand.accent : C.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {pg.indent ? <span style={{ color: '#c3bfce', marginRight: 5 }}>↳</span> : null}
                        {pg.name}
                      </span>
                      {st && st.total > 0 && (
                        <span style={{ flex: 'none', fontSize: 11.5, fontWeight: 700, color: done ? '#1d9e6f' : C.muted2 }}>
                          {done ? '✓' : `${st.answered}/${st.total}`}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </nav>
          )}

          <div style={{ flex: 1, minWidth: 0, maxWidth: 820, margin: renderedPages.length > 1 ? undefined : '0 auto' }}>
          <div style={{ fontWeight: 800, fontSize: 30, color: C.inkDark }}>{data.request.name}</div>
          <div style={{ color: C.muted, fontSize: 16, margin: '8px 0 4px' }}>
            {data.client?.name ? `For ${data.client.name}. ` : ''}Please fill in the fields below and submit for review.
          </div>

          {data.pages.map((pg) => {
            const secs = data.sections.filter((s) => s.page_id === pg.id)
            if (secs.length === 0 && !pg.nav_only) return null
            // Nav-only pages: a heading only, so they group their sub-pages in the body too.
            if (secs.length === 0) {
              return (
                <div key={pg.id} id={`portal-page-${pg.id}`} style={{ marginTop: 34, scrollMarginTop: 12 }}>
                  <div style={{ fontWeight: 800, fontSize: 24, color: C.inkDark, borderBottom: '2px solid #e6e5ec', paddingBottom: 8 }}>{pg.name}</div>
                </div>
              )
            }
            return (
              <div key={pg.id} id={`portal-page-${pg.id}`} style={{ marginTop: 28, scrollMarginTop: 12 }}>
                <div style={{ fontWeight: 800, fontSize: 20, color: C.navy2, marginBottom: 12 }}>{pg.name}</div>
                {secs.map((sec) => {
                  const fields = data.fields.filter((f) => f.section_id === sec.id)
                  return (
                    <div key={sec.id} style={{ background: '#fff', border: '1px solid #e9e8ee', borderRadius: 16, padding: '28px 32px', marginBottom: 18, boxShadow: '0 2px 10px rgba(40,30,60,.05)' }}>
                      <div style={{ fontWeight: 800, fontSize: 19, color: C.inkDark, marginBottom: 6 }}>{sec.name}</div>
                      {sec.instructions && <div style={{ color: C.muted, fontSize: 14, marginBottom: 16 }}>{sec.instructions}</div>}
                      {fields.filter((f) => !f.config?.internalOnly && isVisible(f)).map((f) => {
                        const display = isDisplayField(f.type)
                        return (
                          <div
                            key={f.id}
                            style={{ marginTop: display ? 18 : 22 }}
                            onFocusCapture={() => { editingRef.current = f.id }}
                            onBlurCapture={() => { if (editingRef.current === f.id) editingRef.current = null }}
                          >
                            {!display && (
                              <div style={{ fontWeight: 700, fontSize: 17, color: C.ink, marginBottom: f.config?.instructions ? 4 : 10 }}>
                                {f.label}{f.config?.required && <span style={{ color: '#c9491f' }}> *</span>}
                              </div>
                            )}
                            {!display && f.config?.instructions && (
                              <div style={{ color: C.muted, fontSize: 14, marginBottom: 10 }}>{f.config.instructions}</div>
                            )}
                            <FieldInput
                              type={f.type}
                              label={f.label}
                              config={f.config}
                              value={values[f.id] ?? null}
                              onChange={(v) => setVal(f.id, v)}
                              onUpload={(file) => portalUploadFile(token, f.id, file)}
                              onOpenFile={openFile}
                              onFileUrl={fileUrl}
                              onAI={
                                f.type === 'single_line' || f.type === 'multiline' || f.type === 'formatted'
                                  ? (prompt) => portalAiGenerate(token, f.id, prompt)
                                  : undefined
                              }
                            />
                          </div>
                        )
                      })}
                      {sec.repeatable && (
                        <div
                          onClick={() => addAnother(sec.id)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 22, border: `1.5px dashed ${C.cyan}`, color: C.cyan, fontWeight: 700, fontSize: 14, padding: '11px 18px', borderRadius: 24, cursor: 'pointer' }}
                        >
                          ＋ Add another response
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
          </div>
        </div>
      </div>

      {/* sticky action bar */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '1px solid #e6e5ec', padding: '16px 26px', display: 'flex', alignItems: 'center', gap: 18, boxShadow: '0 -4px 16px rgba(16,28,52,.06)' }}>
        <div style={{ flex: 1 }}>
          <div style={{ color: C.muted, fontSize: 13, marginBottom: 6 }}>{answered} / {total} answered{savedNote ? ` · ${savedNote}` : ''}</div>
          <div style={{ width: 240, height: 8, background: '#e4e2ea', borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ width: `${total ? (answered / total) * 100 : 0}%`, height: '100%', background: brand.gradient, borderRadius: 6 }} />
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: saveState === 'error' ? '#c9491f' : saveState === 'saving' ? C.muted : '#1d9e6f' }}>
            {saveState === 'saving' ? 'Saving…' : saveState === 'error' ? '⚠ Not saved — retrying' : '✓ All changes saved'}
          </div>
          <div style={{ color: C.muted2, fontSize: 12, marginTop: 3 }}>Saves automatically — you can close this page and come back later</div>
        </div>
        <div onClick={() => saving === 'idle' && submitForReview()} style={{ background: brand.buttonBg, color: '#fff', fontWeight: 800, fontSize: 15, letterSpacing: '0.4px', padding: '15px 26px', borderRadius: 28, cursor: 'pointer', opacity: saving === 'submitting' ? 0.7 : 1 }}>{saving === 'submitting' ? 'SUBMITTING…' : 'SUBMIT FOR REVIEW'}</div>
      </div>
    </div>
  )
}

function hasValue(v: Json): boolean {
  if (v == null) return false
  if (typeof v === 'string') return v.trim().length > 0 && v !== '<p></p>'
  if (Array.isArray(v)) return v.length > 0
  if (typeof v === 'object') return Object.keys(v).length > 0
  return true
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 6, background: C.brandBar }} />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>{children}</div>
    </div>
  )
}

function VerifyGate({ token, onVerified }: { token: string; onVerified: () => void }) {
  const [stage, setStage] = useState<'start' | 'code'>('start')
  const [code, setCode] = useState('')
  const [sentTo, setSentTo] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const send = async () => {
    setBusy(true); setErr(null)
    try {
      const r = await portalVerifySend(token)
      if (r.ok) { setSentTo(r.sentTo ?? ''); setStage('code') }
      else setErr(r.error ?? 'Could not send a code.')
    } finally { setBusy(false) }
  }
  const check = async () => {
    setBusy(true); setErr(null)
    try {
      const r = await portalVerifyCheck(token, code)
      if (r.ok) onVerified()
      else setErr('That code is incorrect or expired.')
    } finally { setBusy(false) }
  }

  return (
    <Centered>
      <div style={{ width: 420, maxWidth: '100%', background: '#fff', borderRadius: 18, padding: 36, boxShadow: '0 10px 40px rgba(16,28,52,.12)', textAlign: 'center' }}>
        <div style={{ fontWeight: 800, fontSize: 22, color: C.inkDark, marginBottom: 10 }}>Verify it's you</div>
        {stage === 'start' ? (
          <>
            <div style={{ color: C.muted, fontSize: 15, marginBottom: 22 }}>We'll email a 6-digit code to the address on file for this request.</div>
            <button onClick={send} disabled={busy} style={btn}>{busy ? 'Sending…' : 'Email me a code'}</button>
          </>
        ) : (
          <>
            <div style={{ color: C.muted, fontSize: 15, marginBottom: 18 }}>Enter the code sent to {sentTo}.</div>
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" style={{ width: '100%', border: '1px solid #e1e0e7', borderRadius: 10, padding: '14px 16px', fontSize: 20, letterSpacing: 6, textAlign: 'center', outline: 'none', marginBottom: 14 }} />
            <button onClick={check} disabled={busy} style={btn}>{busy ? 'Checking…' : 'Verify'}</button>
          </>
        )}
        {err && <div style={{ color: '#c9491f', fontSize: 14, marginTop: 14 }}>{err}</div>}
      </div>
    </Centered>
  )
}

const btn: React.CSSProperties = { width: '100%', background: C.navy2, color: '#fff', fontWeight: 800, fontSize: 15, padding: '14px', borderRadius: 28, border: 'none', cursor: 'pointer' }
