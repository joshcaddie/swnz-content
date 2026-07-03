import { useMemo, useState } from 'react'
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
import { FieldInput, fileStoragePath, type UploadedFile } from '../fields/FieldInput'
import { isDisplayField } from '../fields/registry'
import { Modal } from './ClientsPage'
import type { AnswerRow, AnswerStatus } from '../lib/database.types'
import { C, badgeStyles, formatDate } from '../theme'
import { FullScreenMessage } from '../App'

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
  const [editOpen, setEditOpen] = useState(false)
  const [edit, setEdit] = useState<{ name: string; client_id: string | null; owner_id: string | null; due_date: string | null; status_badge: string | null; stage_id: string | null } | null>(null)
  const comments = useComments(id, selected)
  const addComment = useAddComment(id)

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

  const inputFields = useMemo(() => (data ? data.fields.filter((f) => !isDisplayField(f.type)) : []), [data])
  const total = inputFields.length
  const approved = inputFields.filter((f) => answersByField.get(f.id)?.status === 'approved').length
  const submitted = inputFields.filter((f) => answersByField.get(f.id)?.status === 'submitted').length

  // default selection = first input field
  const activeFieldId = selected ?? inputFields[0]?.id ?? null
  const activeField = data?.fields.find((f) => f.id === activeFieldId) ?? null
  const activeAnswer = activeFieldId ? answersByField.get(activeFieldId) : undefined

  if (isLoading || !data) return <FullScreenMessage text="Loading request…" />

  const badge = data.request.status_badge
  const b = badge ? badgeStyles[badge] : null

  const doApprove = async () => {
    if (!activeAnswer) return
    await review.approve(activeAnswer.id)
    sendDecision(id, true).catch(() => {})
  }
  const doRequestChanges = async () => {
    if (!activeAnswer) return
    await review.requestChanges(activeAnswer.id)
    if (commentText.trim()) {
      await addComment.mutateAsync({ fieldId: activeFieldId, body: commentText, authorName: profile?.name ?? 'Team' })
      setCommentText('')
    }
    sendDecision(id, false, commentText).catch(() => {})
  }
  const approveAll = async () => {
    await review.approveAllSubmitted()
    sendDecision(id, true).catch(() => {})
  }

  return (
    <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
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
            const pageDone = pageFields.filter((f) => answersByField.get(f.id)?.status === 'approved').length
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
                          const st = answersByField.get(f.id)?.status
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
          <div onClick={approveAll} style={{ background: C.navy2, color: '#fff', fontWeight: 800, fontSize: 13, letterSpacing: '0.5px', padding: '13px 22px', borderRadius: 26, cursor: 'pointer' }}>APPROVE ALL SUBMITTED</div>
        </div>

        <div className="swnz-scroll" style={{ flex: 1, overflowY: 'auto', padding: '0 40px 40px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}>
            <div style={{ border: '1.5px solid #bcd4f0', color: '#3f6cab', background: '#eaf2fc', fontWeight: 700, fontSize: 16, padding: '9px 22px', borderRadius: 24 }}>
              Approved {approved} / {total} · {submitted} awaiting review
            </div>
          </div>

          {activeField ? (
            <div style={{ background: '#fff', border: '1.5px solid #bfe0f2', borderRadius: 20, padding: '34px 40px', maxWidth: 1100, margin: '0 auto', boxShadow: '0 6px 22px rgba(60,40,90,.08)' }}>
              {activeAnswer?.status === 'approved' && (
                <Banner color="#1f8a4c" bg="#e7f7ec" icon="✓">The answer is saved and approved.</Banner>
              )}
              {activeAnswer?.status === 'submitted' && (
                <Banner color={C.navy2} bg="#e9f5fc" icon="•">Submitted — awaiting your review.</Banner>
              )}
              {activeAnswer?.status === 'changes_requested' && (
                <Banner color="#c9491f" bg="#fdeee9" icon="!">Changes requested from the client.</Banner>
              )}

              <div style={{ fontWeight: 800, fontSize: 24, lineHeight: 1.4, color: C.inkDark, margin: '20px 0 18px' }}>{activeField.label}</div>
              <FieldInput type={activeField.type} label={activeField.label} config={activeField.config} value={activeAnswer?.value ?? null} onChange={() => {}} readOnly onOpenFile={openFile} onFileUrl={fileUrl} />

              <div style={{ display: 'flex', alignItems: 'center', marginTop: 30, gap: 16 }}>
                <button onClick={doApprove} disabled={!activeAnswer || activeAnswer.status === 'approved'} style={{ background: activeAnswer && activeAnswer.status !== 'approved' ? C.green : '#cfe8d6', color: '#fff', fontWeight: 800, fontSize: 14, letterSpacing: '0.4px', padding: '14px 24px', borderRadius: 28, border: 'none', cursor: activeAnswer && activeAnswer.status !== 'approved' ? 'pointer' : 'default' }}>APPROVE</button>
                <button onClick={doRequestChanges} disabled={!activeAnswer} style={{ background: '#fff', color: C.navy2, fontWeight: 800, fontSize: 13, letterSpacing: '0.4px', padding: '13px 22px', borderRadius: 24, border: `1.5px solid ${C.navy2}`, cursor: activeAnswer ? 'pointer' : 'default' }}>REQUEST CHANGES</button>
                <div style={{ flex: 1 }} />
              </div>

              {/* comments */}
              <div style={{ marginTop: 28, borderTop: '1px solid #f0eff3', paddingTop: 20 }}>
                <div style={{ fontWeight: 800, fontSize: 16, color: C.inkDark, marginBottom: 12 }}>Comments</div>
                {(comments.data ?? []).map((c) => (
                  <div key={c.id} style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: c.author_type === 'team' ? C.cyan : '#86d29a', color: '#fff', fontWeight: 800, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>{(c.author_name ?? '?').slice(0, 1).toUpperCase()}</div>
                    <div>
                      <div style={{ fontSize: 13, color: C.muted }}>{c.author_name ?? (c.author_type === 'team' ? 'Team' : 'Client')}</div>
                      <div style={{ fontSize: 15, color: C.ink }}>{c.body}</div>
                    </div>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                  <input value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Add a comment…" style={{ flex: 1, border: '1px solid #e1e0e7', borderRadius: 10, padding: '12px 14px', fontFamily: 'inherit', fontSize: 15, outline: 'none' }} />
                  <button onClick={async () => { if (commentText.trim()) { await addComment.mutateAsync({ fieldId: activeFieldId, body: commentText, authorName: profile?.name ?? 'Team' }); setCommentText('') } }} style={{ background: C.navy2, color: '#fff', fontWeight: 700, fontSize: 14, padding: '0 20px', borderRadius: 10, border: 'none', cursor: 'pointer' }}>Post</button>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: C.muted, marginTop: 40 }}>This request has no fields yet.</div>
          )}

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 30 }}>
            <div style={{ width: 240, height: 8, background: '#e4e2ea', borderRadius: 6, overflow: 'hidden' }}>
              <div style={{ width: `${total ? (approved / total) * 100 : 0}%`, height: '100%', background: C.gradient, borderRadius: 6 }} />
            </div>
          </div>
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

function Banner({ color, bg, icon, children }: { color: string; bg: string; icon: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: bg, borderRadius: 12, padding: '14px 18px' }}>
      <span style={{ width: 28, height: 28, borderRadius: '50%', background: color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, flex: 'none' }}>{icon}</span>
      <span style={{ color, fontWeight: 700, fontSize: 16 }}>{children}</span>
    </div>
  )
}
