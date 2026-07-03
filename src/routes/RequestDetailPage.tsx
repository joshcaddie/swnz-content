import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useRequest, useUpdateRequest } from '../api/requests'
import { useReview } from '../api/answers'
import { useComments, useAddComment } from '../api/comments'
import { useClients } from '../api/clients'
import { useStages } from '../api/stages'
import { useProfiles } from '../api/profiles'
import { sendDecision } from '../api/email'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { portalUploadFile } from '../api/portal'
import { downloadRequestContent } from '../lib/exportDoc'
import { FieldInput, fileStoragePath, type UploadedFile } from '../fields/FieldInput'
import { isDisplayField } from '../fields/registry'
import { Modal } from './ClientsPage'
import type { AnswerRow, AnswerStatus, Json } from '../lib/database.types'
import { C, badgeStyles, formatDate } from '../theme'
import { FullScreenMessage } from '../App'

// Fills the viewport below the top chrome (which sits inside the layout's zoom:0.8),
// so the nav and content columns scroll independently instead of the whole page.
const PAGE_HEIGHT = 'calc(100vh / 0.8 - 80px)'

const statusTick = (status: AnswerStatus | undefined) => {
  if (status === 'approved') return { bg: C.green, border: C.green, mark: '✓', color: '#fff' }
  if (status === 'submitted') return { bg: C.cyan, border: C.cyan, mark: '•', color: '#fff' }
  if (status === 'changes_requested') return { bg: '#f7d9d0', border: '#e0a08e', mark: '!', color: '#c9491f' }
  return { bg: 'transparent', border: '#cfcdd6', mark: '', color: 'transparent' }
}

export function RequestDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { data, isLoading } = useRequest(id)
  const review = useReview(id)
  const update = useUpdateRequest()
  const { data: clients } = useClients()
  const { data: stages } = useStages()
  const { data: profiles } = useProfiles()
  const [selected, setSelected] = useState<string | null>(null)
  const [commentText, setCommentText] = useState('')
  const [copied, setCopied] = useState(false)
  const [exporting, setExporting] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [edit, setEdit] = useState<{ name: string; client_id: string | null; owner_id: string | null; due_date: string | null; status_badge: string | null; stage_id: string | null } | null>(null)
  const comments = useComments(id, selected)
  const addComment = useAddComment(id)

  // Editable answer values with per-field instant autosave (team can add content too).
  const [values, setValues] = useState<Record<string, Json>>({})
  const [answersLive, setAnswersLive] = useState<Record<string, AnswerRow>>({})
  const [saveState, setSaveState] = useState<Record<string, 'saving' | 'saved' | 'error'>>({})
  const [saveErr, setSaveErr] = useState<Record<string, string>>({})
  const [lastSync, setLastSync] = useState<string | null>(null)
  const editingRef = useRef<string | null>(null)
  const dirtyRef = useRef<Set<string>>(new Set())   // fields with an unsaved / in-flight local edit
  const pendingRef = useRef(new Map<string, Json>()) // latest value scheduled per field
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>())

  // Merge server answer rows into local state WITHOUT ever clobbering a field this
  // user is editing or has an unsaved edit in. This is the only path that writes
  // other people's changes into the view, so a save on one machine can never wipe
  // an in-progress edit on another.
  const mergeAnswers = (rows: AnswerRow[]) => {
    setValues((prev) => {
      const next = { ...prev }
      for (const a of rows) {
        if (dirtyRef.current.has(a.field_id)) continue
        if (editingRef.current === a.field_id) continue
        next[a.field_id] = a.value
      }
      return next
    })
    setAnswersLive((prev) => {
      const next = { ...prev }
      for (const a of rows) next[a.field_id] = a
      return next
    })
  }

  // Seed from the loaded request, and re-merge on any refetch (dirty fields preserved).
  useEffect(() => {
    if (data) mergeAnswers(data.answers)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  // Reliable live sync: poll the answers table every 3s and merge. Works even
  // where Realtime isn't delivering; merge() protects local edits.
  useEffect(() => {
    let alive = true
    const tick = async () => {
      const { data: rows, error } = await supabase.from('answers').select('*').eq('request_id', id)
      if (!alive) return
      if (rows) mergeAnswers(rows as AnswerRow[])
      setLastSync(error ? `sync error: ${error.message}` : new Date().toLocaleTimeString())
    }
    tick()
    const iv = setInterval(tick, 3000)
    // Plus Realtime for instant updates when it is available.
    const ch = supabase
      .channel(`answers-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'answers', filter: `request_id=eq.${id}` }, (payload) => {
        const row = payload.new as AnswerRow | null
        if (row?.field_id) mergeAnswers([row])
      })
      .subscribe()
    return () => { alive = false; clearInterval(iv); supabase.removeChannel(ch) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // Clicking a field in the nav scrolls the middle to it (across page switches).
  useEffect(() => {
    if (!selected) return
    const t = setTimeout(() => document.getElementById(`rev-field-${selected}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30)
    return () => clearTimeout(t)
  }, [selected])

  const flush = async (fieldId: string) => {
    const v = pendingRef.current.get(fieldId)
    setSaveState((s) => ({ ...s, [fieldId]: 'saving' }))
    try {
      await review.saveValue(fieldId, v as Json)
      // Success: clear dirty only if nothing newer was typed while saving.
      if (pendingRef.current.get(fieldId) === v) {
        dirtyRef.current.delete(fieldId)
        pendingRef.current.delete(fieldId)
      }
      setSaveState((s) => ({ ...s, [fieldId]: 'saved' }))
      setSaveErr((e) => { const n = { ...e }; delete n[fieldId]; return n })
    } catch (err) {
      // Keep it dirty (so the poll can't wipe it) and retry shortly.
      setSaveState((s) => ({ ...s, [fieldId]: 'error' }))
      setSaveErr((e) => ({ ...e, [fieldId]: (err as Error).message || 'save failed' }))
      const t = timers.current.get(fieldId)
      if (t) clearTimeout(t)
      timers.current.set(fieldId, setTimeout(() => flush(fieldId), 2500))
    }
  }

  const scheduleSave = (fieldId: string, value: Json) => {
    dirtyRef.current.add(fieldId)
    pendingRef.current.set(fieldId, value)
    setValues((v) => ({ ...v, [fieldId]: value }))
    setSaveState((s) => ({ ...s, [fieldId]: 'saving' }))
    const prev = timers.current.get(fieldId)
    if (prev) clearTimeout(prev)
    timers.current.set(fieldId, setTimeout(() => flush(fieldId), 500))
  }

  const copyLink = async () => {
    const url = `${window.location.origin}/c/${data?.request.public_token}`
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      prompt('Copy the client link:', url)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const openEdit = () => {
    if (!data) return
    setEdit({
      name: data.request.name,
      client_id: data.request.client_id,
      owner_id: data.request.owner_id,
      due_date: data.request.due_date,
      status_badge: data.request.status_badge,
      stage_id: data.request.stage_id,
    })
    setEditOpen(true)
  }
  const saveEdit = async () => {
    if (!edit) return
    await update.mutateAsync({ id, ...edit })
    setEditOpen(false)
  }

  const fileUrl = async (f: UploadedFile) => {
    const path = fileStoragePath(f)
    if (!path) throw new Error('this file has no stored path — ask the client to re-upload it')
    const { data: signed, error } = await supabase.storage.from('uploads').createSignedUrl(path, 3600, { download: f.filename })
    if (!signed?.signedUrl) throw new Error(error?.message ?? 'could not sign the file URL')
    return signed.signedUrl
  }

  const openFile = async (f: UploadedFile) => {
    try {
      window.open(await fileUrl(f), '_blank')
    } catch (e) {
      alert(`Could not open the file: ${(e as Error).message}`)
    }
  }

  const answersByField = useMemo(() => {
    const m = new Map<string, AnswerRow>()
    for (const a of data?.answers ?? []) m.set(a.field_id, a)
    return m
  }, [data])
  // Prefer the live-merged answer (value + status kept current by poll/realtime).
  const answerFor = (fid: string): AnswerRow | undefined => answersLive[fid] ?? answersByField.get(fid)

  const inputFields = useMemo(() => (data ? data.fields.filter((f) => !isDisplayField(f.type)) : []), [data])
  const total = inputFields.length
  const approved = inputFields.filter((f) => answerFor(f.id)?.status === 'approved').length
  const submitted = inputFields.filter((f) => answerFor(f.id)?.status === 'submitted').length

  // default selection = first input field
  const activeFieldId = selected ?? inputFields[0]?.id ?? null

  if (isLoading || !data) return <FullScreenMessage text="Loading request…" />

  const badge = data.request.status_badge
  const b = badge ? badgeStyles[badge] : null

  // Which page to show in the middle — the selected field's page, else the first with fields.
  const secToPage = new Map(data.sections.map((s) => [s.id, s.page_id]))
  const pageOfField = (fid: string | null) => (fid ? secToPage.get(data.fields.find((f) => f.id === fid)?.section_id ?? '') ?? null : null)
  const firstPageWithFields = data.pages.find((pg) => data.sections.some((s) => s.page_id === pg.id && data.fields.some((f) => f.section_id === s.id && !isDisplayField(f.type))))
  const activePageId = pageOfField(activeFieldId) ?? firstPageWithFields?.id ?? null
  const activePage = data.pages.find((pg) => pg.id === activePageId) ?? null

  const approveField = async (a: AnswerRow | undefined) => {
    if (!a) return
    await review.approve(a.id)
    sendDecision(id, true).catch(() => {})
  }
  const requestChangesField = async (a: AnswerRow | undefined, fieldId: string) => {
    if (!a) return
    await review.requestChanges(a.id)
    if (selected === fieldId && commentText.trim()) {
      await addComment.mutateAsync({ fieldId, body: commentText, authorName: profile?.name ?? 'Team' })
      setCommentText('')
    }
    sendDecision(id, false, selected === fieldId ? commentText : '').catch(() => {})
  }
  const approveAll = async () => {
    await review.approveAllSubmitted()
    sendDecision(id, true).catch(() => {})
  }
  const teamUpload = (fieldId: string) => (file: File) => portalUploadFile(data.request.public_token, fieldId, file)

  const downloadAll = async () => {
    if (exporting) return
    setExporting('Preparing…')
    try {
      await downloadRequestContent(data, fileUrl, (msg) => setExporting(msg))
    } catch (e) {
      alert(`Could not build the download: ${(e as Error).message}`)
    } finally {
      setExporting(null)
    }
  }

  return (
    <div style={{ flex: 1, display: 'flex', height: PAGE_HEIGHT, minHeight: 0, overflow: 'hidden' }}>
      {/* sidebar checklist */}
      <div style={{ width: 625, flex: 'none', background: '#fff', borderRight: `1px solid ${C.line}`, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ padding: '26px 28px 18px', borderBottom: '1px solid #eeedf1' }}>
          <div style={{ fontWeight: 800, fontSize: 28, lineHeight: 1.2, color: C.inkDark }}>{data.request.name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14 }}>
            {data.request.due_date && <span style={{ color: C.muted, fontWeight: 600, fontSize: 15 }}>Due: {formatDate(data.request.due_date)}</span>}
            {b && <span style={{ background: b.bg, color: b.color, fontWeight: 800, fontSize: 12, letterSpacing: '0.6px', padding: '5px 11px', borderRadius: 7 }}>{badge}</span>}
          </div>
          {data.request.clients && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginTop: 18 }}>
              <div style={{ width: 46, height: 46, borderRadius: '50%', background: '#86d29a', color: '#1f3a28', fontWeight: 800, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                {(data.request.clients.contact_name || data.request.clients.name).slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 17, color: C.ink }}>{data.request.clients.contact_name ?? data.request.clients.name} &nbsp;-&nbsp; {data.request.clients.name}</div>
                {data.request.clients.contact_email && <div style={{ color: '#7b7686', fontSize: 14, marginTop: 3 }}>✉ {data.request.clients.contact_email}</div>}
              </div>
            </div>
          )}
        </div>

        <div className="swnz-scroll" style={{ flex: 1, overflowY: 'auto', padding: 18 }}>
          {data.pages.map((pg, pi) => {
            const secs = data.sections.filter((s) => s.page_id === pg.id)
            const pageFields = data.fields.filter((f) => secs.some((s) => s.id === f.section_id) && !isDisplayField(f.type))
            const pageDone = pageFields.filter((f) => answerFor(f.id)?.status === "approved").length
            return (
              <div key={pg.id}>
                <div style={{ background: pi === 0 ? C.navy2 : 'transparent', borderRadius: 30, display: 'flex', alignItems: 'center', padding: '13px 20px', color: pi === 0 ? '#fff' : C.ink, gap: 12, marginTop: pi === 0 ? 0 : 8, borderTop: pi === 0 ? 'none' : '1px solid #f0eff3' }}>
                  <span style={{ fontWeight: 800, fontSize: 17, flex: 1 }}>{pi + 1}. {pg.name}</span>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{pageDone}/{pageFields.length}</span>
                </div>
                {secs.map((sec, si) => {
                  const fields = data.fields.filter((f) => f.section_id === sec.id)
                  return (
                    <div key={sec.id}>
                      <div style={{ display: 'flex', alignItems: 'center', padding: '14px 20px 8px' }}>
                        <span style={{ fontWeight: 800, fontSize: 16, color: C.ink, flex: 1 }}>{pi + 1}.{si + 1}. {sec.name}</span>
                      </div>
                      <div style={{ paddingLeft: 14 }}>
                        {fields.map((f) => {
                          if (isDisplayField(f.type)) return null
                          const st = answerFor(f.id)?.status
                          const t = statusTick(st)
                          const active = f.id === activeFieldId
                          return (
                            <div key={f.id} onClick={() => setSelected(f.id)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '11px 14px', borderLeft: active ? `2px solid ${C.navy2}` : '2px solid #e4e2ea', background: active ? '#e9f5fc' : 'transparent', borderRadius: active ? '0 8px 8px 0' : 0, cursor: 'pointer' }}>
                              <span style={{ fontSize: 16, color: active ? C.navy2 : '#3b3548', fontWeight: active ? 600 : 400, flex: 1 }}>{f.label}</span>
                              <span style={{ width: 22, height: 22, borderRadius: '50%', background: t.bg, border: `2px solid ${t.border}`, color: t.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800 }}>{t.mark}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {/* review pane */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, background: C.panel }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '22px 30px', gap: 12, flexWrap: 'wrap' }}>
          <div onClick={() => navigate('/')} style={{ width: 48, height: 48, borderRadius: '50%', background: '#fff', border: '1px solid #e1e0e7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6f6a7a', fontSize: 20, cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,.05)' }}>‹</div>
          <div style={{ flex: 1 }} />
          <div onClick={copyLink} style={{ border: `1.5px solid ${C.cyan}`, color: copied ? '#1f8a4c' : C.cyan, fontWeight: 800, fontSize: 13, letterSpacing: '0.5px', padding: '11px 18px', borderRadius: 22, cursor: 'pointer', background: '#fff' }}>{copied ? '✓ COPIED' : '🔗 CLIENT LINK'}</div>
          <div onClick={openEdit} style={{ border: `1.5px solid ${C.navy2}`, color: C.navy2, fontWeight: 800, fontSize: 13, letterSpacing: '0.5px', padding: '11px 18px', borderRadius: 22, cursor: 'pointer', background: '#fff' }}>✎ EDIT</div>
          <div onClick={() => navigate(`/requests/${id}/edit`)} style={{ border: `1.5px solid ${C.navy2}`, color: C.navy2, fontWeight: 800, fontSize: 13, letterSpacing: '0.5px', padding: '11px 18px', borderRadius: 22, cursor: 'pointer', background: '#fff' }}>⚙ STRUCTURE</div>
          <div onClick={() => navigate('/activity')} style={{ border: `1.5px solid ${C.cyan}`, color: C.cyan, fontWeight: 800, fontSize: 13, letterSpacing: '0.5px', padding: '11px 18px', borderRadius: 22, cursor: 'pointer', background: '#fff' }}>⚡ ACTIVITY</div>
          <div onClick={downloadAll} title="Download all content as a Google Doc + files (.zip)" style={{ border: `1.5px solid ${C.navy2}`, color: C.navy2, fontWeight: 800, fontSize: 13, letterSpacing: '0.5px', padding: '11px 18px', borderRadius: 22, cursor: exporting ? 'default' : 'pointer', background: '#fff', opacity: exporting ? 0.7 : 1 }}>{exporting ? `⬇ ${exporting}` : '⬇ DOWNLOAD ALL'}</div>
          <div onClick={approveAll} style={{ background: C.navy2, color: '#fff', fontWeight: 800, fontSize: 13, letterSpacing: '0.5px', padding: '13px 22px', borderRadius: 26, cursor: 'pointer' }}>APPROVE ALL SUBMITTED</div>
        </div>

        <div className="swnz-scroll" style={{ flex: 1, overflowY: 'auto', padding: '0 40px 60px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginBottom: 22 }}>
            <div style={{ border: '1.5px solid #bcd4f0', color: '#3f6cab', background: '#eaf2fc', fontWeight: 700, fontSize: 16, padding: '9px 22px', borderRadius: 24 }}>
              Approved {approved} / {total} · {submitted} awaiting review
            </div>
            <div style={{ fontSize: 12.5, color: lastSync?.startsWith('sync error') ? '#c9491f' : C.muted2, fontWeight: 600 }}>
              ⟳ Auto-saving · edits sync live {lastSync ? (lastSync.startsWith('sync error') ? `· ${lastSync}` : `· last synced ${lastSync}`) : ''}
            </div>
          </div>

          {activePage ? (
            <div style={{ maxWidth: 1100, margin: '0 auto' }}>
              <div style={{ fontWeight: 800, fontSize: 30, color: C.inkDark, marginBottom: 4 }}>{activePage.name}</div>
              <div style={{ color: C.muted, fontSize: 15, marginBottom: 20 }}>Edit any field below — changes save automatically and sync live with your teammates.</div>

              {data.sections.filter((s) => s.page_id === activePage.id).map((sec) => {
                const secFields = data.fields.filter((f) => f.section_id === sec.id && !isDisplayField(f.type))
                if (secFields.length === 0) return null
                return (
                  <div key={sec.id} style={{ marginBottom: 8 }}>
                    <div style={{ fontWeight: 800, fontSize: 17, color: C.navy2, margin: '18px 0 10px' }}>{sec.name}</div>
                    {secFields.map((f) => {
                      const ans = answerFor(f.id)
                      const t = statusTick(ans?.status)
                      const sel = selected === f.id
                      const ss = saveState[f.id]
                      return (
                        <div
                          key={f.id}
                          id={`rev-field-${f.id}`}
                          onFocusCapture={() => { editingRef.current = f.id; setSelected(f.id) }}
                          onBlurCapture={() => { if (editingRef.current === f.id) editingRef.current = null }}
                          style={{ background: '#fff', border: sel ? `1.5px solid ${C.cyan}` : '1px solid #e9e8ee', borderRadius: 16, padding: '22px 26px', marginBottom: 14, boxShadow: '0 2px 10px rgba(40,30,60,.05)', scrollMarginTop: 12 }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                            <div style={{ fontWeight: 800, fontSize: 18, color: C.inkDark, flex: 1 }}>{f.label}{f.config?.required && <span style={{ color: '#c9491f' }}> *</span>}</div>
                            {ss && (
                              <span title={saveErr[f.id]} style={{ fontSize: 12.5, fontWeight: 600, color: ss === 'saving' ? C.muted2 : ss === 'error' ? '#c9491f' : '#1d9e6f' }}>
                                {ss === 'saving' ? 'Saving…' : ss === 'error' ? `⚠ Couldn't save${saveErr[f.id] ? ` — ${saveErr[f.id]}` : ''}` : '✓ Saved'}
                              </span>
                            )}
                            <span style={{ width: 22, height: 22, borderRadius: '50%', background: t.bg, border: `2px solid ${t.border}`, color: t.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, flex: 'none' }}>{t.mark}</span>
                          </div>
                          {f.config?.instructions && <div style={{ color: C.muted, fontSize: 14, marginBottom: 10 }}>{f.config.instructions}</div>}
                          <FieldInput
                            type={f.type}
                            label={f.label}
                            config={f.config}
                            value={values[f.id] ?? null}
                            onChange={(v) => scheduleSave(f.id, v)}
                            onUpload={teamUpload(f.id)}
                            onOpenFile={openFile}
                            onFileUrl={fileUrl}
                          />
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
                            <button onClick={() => approveField(ans)} disabled={!ans || ans.status === 'approved'} style={{ background: ans && ans.status !== 'approved' ? C.green : '#cfe8d6', color: '#fff', fontWeight: 800, fontSize: 13, letterSpacing: '0.4px', padding: '11px 20px', borderRadius: 24, border: 'none', cursor: ans && ans.status !== 'approved' ? 'pointer' : 'default' }}>{ans?.status === 'approved' ? 'APPROVED' : 'APPROVE'}</button>
                            <button onClick={() => requestChangesField(ans, f.id)} disabled={!ans} style={{ background: '#fff', color: C.navy2, fontWeight: 800, fontSize: 12.5, letterSpacing: '0.4px', padding: '10px 18px', borderRadius: 22, border: `1.5px solid ${C.navy2}`, cursor: ans ? 'pointer' : 'default', opacity: ans ? 1 : 0.5 }}>REQUEST CHANGES</button>
                            <div style={{ flex: 1 }} />
                            <div onClick={() => setSelected(sel ? null : f.id)} style={{ color: C.cyan, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>💬 Comments{sel && comments.data ? ` (${comments.data.length})` : ''}</div>
                          </div>

                          {sel && (
                            <div style={{ marginTop: 16, borderTop: '1px solid #f0eff3', paddingTop: 16 }}>
                              {(comments.data ?? []).map((c) => (
                                <div key={c.id} style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: c.author_type === 'team' ? C.cyan : '#86d29a', color: '#fff', fontWeight: 800, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>{(c.author_name ?? '?').slice(0, 1).toUpperCase()}</div>
                                  <div>
                                    <div style={{ fontSize: 12.5, color: C.muted }}>{c.author_name ?? (c.author_type === 'team' ? 'Team' : 'Client')}</div>
                                    <div style={{ fontSize: 15, color: C.ink }}>{c.body}</div>
                                  </div>
                                </div>
                              ))}
                              <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                                <input value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Add a comment…" style={{ flex: 1, border: '1px solid #e1e0e7', borderRadius: 10, padding: '11px 13px', fontFamily: 'inherit', fontSize: 15, outline: 'none' }} />
                                <button onClick={async () => { if (commentText.trim()) { await addComment.mutateAsync({ fieldId: f.id, body: commentText, authorName: profile?.name ?? 'Team' }); setCommentText('') } }} style={{ background: C.navy2, color: '#fff', fontWeight: 700, fontSize: 14, padding: '0 18px', borderRadius: 10, border: 'none', cursor: 'pointer' }}>Post</button>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: C.muted, marginTop: 40 }}>This request has no fields yet.</div>
          )}
        </div>
      </div>

      {editOpen && edit && (
        <Modal title="Edit request" onClose={() => setEditOpen(false)} onSave={saveEdit}>
          <EditField label="Request name">
            <input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} style={editInput} />
          </EditField>
          <div style={{ display: 'flex', gap: 16 }}>
            <EditField label="Client" grow>
              <select value={edit.client_id ?? ''} onChange={(e) => setEdit({ ...edit, client_id: e.target.value || null })} style={editInput}>
                <option value="">No client</option>
                {(clients ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </EditField>
            <EditField label="Owner" grow>
              <select value={edit.owner_id ?? ''} onChange={(e) => setEdit({ ...edit, owner_id: e.target.value || null })} style={editInput}>
                <option value="">Unassigned</option>
                {(profiles ?? []).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </EditField>
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <EditField label="Due date" grow>
              <input type="date" value={edit.due_date ?? ''} onChange={(e) => setEdit({ ...edit, due_date: e.target.value || null })} style={editInput} />
            </EditField>
            <EditField label="Status badge" grow>
              <select value={edit.status_badge ?? ''} onChange={(e) => setEdit({ ...edit, status_badge: e.target.value || null })} style={editInput}>
                <option value="">None (featured card)</option>
                {['PUBLISHED', 'OVERDUE', 'ARCHIVED', 'DRAFT'].map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </EditField>
          </div>
          <EditField label="Board column">
            <select value={edit.stage_id ?? ''} onChange={(e) => setEdit({ ...edit, stage_id: e.target.value || null })} style={editInput}>
              {(stages ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </EditField>

          <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid #ececf0' }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: '#4b4556', marginBottom: 6 }}>Pages &amp; fields</div>
            <div style={{ color: C.muted2, fontSize: 13, lineHeight: 1.5, marginBottom: 12 }}>
              Change the pages, sections and fields — add fields, rename, reorder, bulk-add, and more.
              Any content the client has already added is kept; only fields you delete lose their answer.
            </div>
            <div
              onClick={() => navigate(`/requests/${id}/edit`)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: `1.5px solid ${C.navy2}`, color: C.navy2, fontWeight: 800, fontSize: 13, letterSpacing: '0.5px', padding: '12px 20px', borderRadius: 24, cursor: 'pointer' }}
            >
              ⚙ EDIT PAGES, SECTIONS &amp; FIELDS →
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

const editInput: React.CSSProperties = {
  width: '100%', border: '1px solid #e1e0e7', borderRadius: 10, padding: '13px 15px', fontFamily: 'inherit', fontSize: 16, color: C.ink, outline: 'none', background: '#fff',
}

function EditField({ label, children, grow }: { label: string; children: React.ReactNode; grow?: boolean }) {
  return (
    <div style={{ marginBottom: 16, flex: grow ? 1 : undefined }}>
      <div style={{ fontWeight: 700, fontSize: 14, color: '#4b4556', marginBottom: 8 }}>{label}</div>
      {children}
    </div>
  )
}

