import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import type { Json, RequestFieldRow } from '../lib/database.types'
import { portalLoad, portalSave, portalUploadFile, portalRepeatSection, portalVerifySend, portalVerifyCheck, type PortalData } from '../api/portal'
import { FieldInput } from '../fields/FieldInput'
import { isDisplayField } from '../fields/registry'
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
  const [saving, setSaving] = useState<'idle' | 'saving' | 'submitting'>('idle')
  const [savedNote, setSavedNote] = useState<string | null>(null)

  useEffect(() => {
    portalLoad(token)
      .then((d) => {
        setData(d)
        setValues(Object.fromEntries(d.answers.map((a) => [a.field_id, a.value])))
        setVerified(!d.request.verify_email)
      })
      .catch((e) => setError(String(e.message ?? e)))
  }, [token])

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

  const persist = async (submit: boolean) => {
    if (submit) {
      const missing = inputFields.filter((f) => f.config?.required && !hasValue(values[f.id]))
      if (missing.length > 0) {
        setSavedNote(`⚠ Please complete ${missing.length} required field${missing.length > 1 ? 's' : ''} (marked *) before submitting.`)
        return
      }
    }
    setSaving(submit ? 'submitting' : 'saving')
    setSavedNote(null)
    try {
      const payload = inputFields.map((f) => ({ field_id: f.id, value: values[f.id] ?? null }))
      await portalSave(token, payload, submit)
      setSavedNote(submit ? 'Submitted for review — thank you!' : 'Draft saved.')
    } catch (e) {
      setSavedNote(`Could not save: ${(e as Error).message}`)
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

  const setVal = (id: string, v: Json) => setValues((prev) => ({ ...prev, [id]: v }))

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 6, background: C.brandBar }} />
      <div style={{ background: C.navy, padding: '16px 26px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <img src="/assets/swnz-icon.png" alt="SWNZ" style={{ width: 42, height: 42 }} />
        <div style={{ color: '#fff', fontWeight: 800, fontSize: 18 }}>School Websites New Zealand</div>
      </div>

      <div className="swnz-scroll" style={{ flex: 1, overflowY: 'auto', padding: '32px 20px 140px' }}>
        <div style={{ maxWidth: 820, margin: '0 auto' }}>
          <div style={{ fontWeight: 800, fontSize: 30, color: C.inkDark }}>{data.request.name}</div>
          <div style={{ color: C.muted, fontSize: 16, margin: '8px 0 4px' }}>
            {data.client?.name ? `For ${data.client.name}. ` : ''}Please fill in the fields below and submit for review.
          </div>

          {data.pages.map((pg) => {
            const secs = data.sections.filter((s) => s.page_id === pg.id)
            if (secs.length === 0) return null
            return (
              <div key={pg.id} style={{ marginTop: 28 }}>
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
                          <div key={f.id} style={{ marginTop: display ? 18 : 22 }}>
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

      {/* sticky action bar */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '1px solid #e6e5ec', padding: '16px 26px', display: 'flex', alignItems: 'center', gap: 18, boxShadow: '0 -4px 16px rgba(16,28,52,.06)' }}>
        <div style={{ flex: 1 }}>
          <div style={{ color: C.muted, fontSize: 13, marginBottom: 6 }}>{answered} / {total} answered{savedNote ? ` · ${savedNote}` : ''}</div>
          <div style={{ width: 240, height: 8, background: '#e4e2ea', borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ width: `${total ? (answered / total) * 100 : 0}%`, height: '100%', background: C.gradient, borderRadius: 6 }} />
          </div>
        </div>
        <div onClick={() => persist(false)} style={{ color: C.cyan, fontWeight: 700, fontSize: 16, textDecoration: 'underline', cursor: 'pointer' }}>{saving === 'saving' ? 'Saving…' : 'Save draft'}</div>
        <div onClick={() => persist(true)} style={{ background: C.navy2, color: '#fff', fontWeight: 800, fontSize: 15, letterSpacing: '0.4px', padding: '15px 26px', borderRadius: 28, cursor: 'pointer' }}>{saving === 'submitting' ? 'SUBMITTING…' : 'SUBMIT FOR REVIEW'}</div>
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
