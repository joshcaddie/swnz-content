import { useState } from 'react'
import type { FieldConfig, FieldType, Json } from '../lib/database.types'
import { RichTextEditor, RichTextView } from '../components/RichText'
import { C } from '../theme'

export interface UploadedFile {
  /** Storage object path. Older answers stored it as storage_path (raw answer_files row). */
  path?: string
  storage_path?: string
  filename: string
  size?: number
  content_type?: string | null
}

/** Resolve the storage path regardless of which shape the answer stored. */
export function fileStoragePath(f: UploadedFile): string | null {
  return f.path ?? f.storage_path ?? null
}

interface Props {
  type: FieldType
  label: string
  config: FieldConfig
  value: Json
  onChange: (v: Json) => void
  readOnly?: boolean
  onUpload?: (file: File) => Promise<UploadedFile>
  /** Team-side: open/download an uploaded file (e.g. via a signed URL). */
  onOpenFile?: (file: UploadedFile) => void
  /** Portal-side: generate draft content for text fields from a client prompt. */
  onAI?: (prompt: string) => Promise<string>
}

const box: React.CSSProperties = {
  width: '100%', border: '1px solid #e3e2e8', borderRadius: 10, padding: '14px 16px',
  fontFamily: 'inherit', fontSize: 16, color: C.ink, outline: 'none', background: readOnlyBg(false),
}
function readOnlyBg(ro: boolean) {
  return ro ? '#f7f7fa' : '#fff'
}

export function FieldInput({ type, label, config, value, onChange, readOnly, onUpload, onOpenFile, onAI }: Props) {
  const ro = !!readOnly
  const style = { ...box, background: readOnlyBg(ro) }
  const options = config.options ?? []
  const ph = config.placeholder
  const ai = !ro && onAI ? <AiAssist onAI={onAI} onResult={onChange} /> : null

  switch (type) {
    case 'heading':
      return <div style={{ fontWeight: 800, fontSize: 22, color: C.inkDark }}>{label}</div>
    case 'description':
      return <div style={{ color: '#5b5667', fontSize: 16, lineHeight: 1.6 }}>{config.helpText || label}</div>
    case 'divider':
      return <hr style={{ border: 'none', borderTop: '1px solid #e4e3e9', margin: '6px 0' }} />

    case 'multiline':
      return (
        <div>
          <textarea disabled={ro} value={asString(value)} onChange={(e) => onChange(e.target.value)}
            style={{ ...style, minHeight: 120, resize: 'vertical' }} placeholder={ph ?? 'Enter text here...'} />
          {ai}
        </div>
      )

    case 'address':
      return (
        <textarea disabled={ro} value={asString(value)} onChange={(e) => onChange(e.target.value)}
          style={{ ...style, minHeight: 120, resize: 'vertical' }} placeholder={ph ?? 'Enter text here...'} />
      )

    case 'formatted':
      return ro ? (
        <RichTextView html={asString(value)} />
      ) : (
        <div>
          <RichTextEditor value={asString(value)} onChange={onChange} placeholder="Enter text here..." />
          {ai}
        </div>
      )

    case 'number':
    case 'currency':
      return (
        <input type="number" disabled={ro} value={asString(value)} onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
          style={style} placeholder={type === 'currency' ? '$0.00' : '0'} />
      )

    case 'email':
      return <input type="email" disabled={ro} value={asString(value)} onChange={(e) => onChange(e.target.value)} style={style} placeholder="name@example.com" />
    case 'url':
      return <input type="url" disabled={ro} value={asString(value)} onChange={(e) => onChange(e.target.value)} style={style} placeholder="https://" />
    case 'phone':
      return <input type="tel" disabled={ro} value={asString(value)} onChange={(e) => onChange(e.target.value)} style={style} placeholder="+64 …" />
    case 'datetime':
      return <input type="date" disabled={ro} value={asString(value)} onChange={(e) => onChange(e.target.value)} style={style} />
    case 'date_range':
      return <DateRange value={value} onChange={onChange} ro={ro} style={style} />

    case 'dropdown':
    case 'country':
      return (
        <select disabled={ro} value={asString(value)} onChange={(e) => onChange(e.target.value)} style={style}>
          <option value="">Select…</option>
          {(type === 'country' ? COUNTRIES : options).map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      )

    case 'single_choice':
    case 'image_choice':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {options.length === 0 && <Hint>No options configured.</Hint>}
          {options.map((o) => (
            <label key={o} style={choiceRow}>
              <input type="radio" disabled={ro} checked={asString(value) === o} onChange={() => onChange(o)} /> {o}
            </label>
          ))}
        </div>
      )

    case 'checkbox': {
      const arr = Array.isArray(value) ? (value as string[]) : []
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {options.length === 0 && <Hint>No options configured.</Hint>}
          {options.map((o) => (
            <label key={o} style={choiceRow}>
              <input type="checkbox" disabled={ro} checked={arr.includes(o)} onChange={(e) => onChange(e.target.checked ? [...arr, o] : arr.filter((x) => x !== o))} /> {o}
            </label>
          ))}
        </div>
      )
    }

    case 'numeric_rating':
    case 'star_rating': {
      const max = config.max ?? (type === 'star_rating' ? 5 : 10)
      const current = typeof value === 'number' ? value : 0
      return (
        <div style={{ display: 'flex', gap: 8 }}>
          {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
            <div key={n} onClick={() => !ro && onChange(n)} style={{ cursor: ro ? 'default' : 'pointer', fontSize: type === 'star_rating' ? 28 : 16, width: type === 'star_rating' ? 'auto' : 38, height: type === 'star_rating' ? 'auto' : 38, borderRadius: 8, border: type === 'star_rating' ? 'none' : '1px solid #e3e2e8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: n <= current ? '#f2c94c' : '#cfcdd6', fontWeight: 700, background: type === 'star_rating' ? 'transparent' : n <= current ? '#e9f5fc' : '#fff' }}>
              {type === 'star_rating' ? '★' : n}
            </div>
          ))}
        </div>
      )
    }

    case 'image':
    case 'file':
      return <FileField value={value} onChange={onChange} ro={ro} onUpload={onUpload} onOpenFile={onOpenFile} accept={type === 'image' ? 'image/*' : undefined} maxFiles={config.maxFiles} />

    case 'table':
    case 'signature':
    case 'task_list':
    case 'kyc_aml':
    case 'abn_acn':
      return (
        <div>
          <textarea disabled={ro} value={asString(value)} onChange={(e) => onChange(e.target.value)} style={{ ...style, minHeight: 90 }} placeholder={`${label}…`} />
          <Hint>This field type captures text for now; a richer {type.replace('_', '/')} input is planned.</Hint>
        </div>
      )

    case 'single_line':
      return (
        <div>
          <input disabled={ro} value={asString(value)} onChange={(e) => onChange(e.target.value)} style={style} placeholder={ph ?? 'Enter text here...'} />
          {ai}
        </div>
      )

    default:
      return <input disabled={ro} value={asString(value)} onChange={(e) => onChange(e.target.value)} style={style} placeholder={ph ?? 'Enter text here...'} />
  }
}

/** "Generate content with AI" affordance under portal text fields. */
function AiAssist({ onAI, onResult }: { onAI: (prompt: string) => Promise<string>; onResult: (text: string) => void }) {
  const [open, setOpen] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const generate = async () => {
    if (!prompt.trim() || busy) return
    setBusy(true); setErr(null)
    try {
      const text = await onAI(prompt)
      onResult(text)
      setOpen(false)
    } catch (e) {
      setErr(`Could not generate content: ${(e as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <div
        onClick={() => setOpen(true)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 7, marginTop: 10, color: '#7a5cd0', fontWeight: 700, fontSize: 13.5, cursor: 'pointer' }}
      >
        ✦ Generate content with AI
      </div>
    )
  }

  return (
    <div style={{ marginTop: 10, border: '1px solid #ddd3f3', background: '#faf8ff', borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontWeight: 800, fontSize: 13.5, color: '#7a5cd0' }}>✦ Generate content with AI</div>
        <div style={{ flex: 1 }} />
        <div onClick={() => { if (!busy) { setOpen(false); setErr(null) } }} style={{ color: '#a49bbd', fontWeight: 800, cursor: 'pointer', fontSize: 15, lineHeight: 1 }}>✕</div>
      </div>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        disabled={busy}
        placeholder="Describe what to write — e.g. “A welcoming intro about our school's values and rural community” — or paste rough notes to polish."
        style={{ width: '100%', border: '1px solid #e0d9f0', borderRadius: 10, padding: '11px 13px', fontFamily: 'inherit', fontSize: 14.5, color: C.ink, outline: 'none', background: '#fff', minHeight: 74, resize: 'vertical' }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10 }}>
        <div
          onClick={generate}
          style={{ background: busy || !prompt.trim() ? '#b9a9e6' : '#7a5cd0', color: '#fff', fontWeight: 800, fontSize: 12.5, letterSpacing: '0.4px', padding: '10px 18px', borderRadius: 20, cursor: busy || !prompt.trim() ? 'default' : 'pointer' }}
        >
          {busy ? 'GENERATING…' : 'GENERATE'}
        </div>
        {busy && <div style={{ color: '#8b82a3', fontSize: 13 }}>Writing your content — this takes a few seconds…</div>}
        {err && <div style={{ color: '#c9491f', fontSize: 13 }}>{err}</div>}
      </div>
      <div style={{ color: '#a49bbd', fontSize: 12, marginTop: 8 }}>The result fills the field above — you can edit it before saving.</div>
    </div>
  )
}

const choiceRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, fontSize: 16, color: C.ink }

function Hint({ children }: { children: React.ReactNode }) {
  return <div style={{ color: C.muted2, fontSize: 13, marginTop: 6 }}>{children}</div>
}

function asString(v: Json): string {
  if (v == null) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  return ''
}

function DateRange({ value, onChange, ro, style }: { value: Json; onChange: (v: Json) => void; ro: boolean; style: React.CSSProperties }) {
  const v = (value && typeof value === 'object' && !Array.isArray(value) ? value : {}) as { from?: string; to?: string }
  return (
    <div style={{ display: 'flex', gap: 12 }}>
      <input type="date" disabled={ro} value={v.from ?? ''} onChange={(e) => onChange({ ...v, from: e.target.value })} style={style} />
      <input type="date" disabled={ro} value={v.to ?? ''} onChange={(e) => onChange({ ...v, to: e.target.value })} style={style} />
    </div>
  )
}

function FileField({ value, onChange, ro, onUpload, onOpenFile, accept, maxFiles }: {
  value: Json
  onChange: (v: Json) => void
  ro: boolean
  onUpload?: (file: File) => Promise<UploadedFile>
  onOpenFile?: (file: UploadedFile) => void
  accept?: string
  maxFiles?: number
}) {
  const files = Array.isArray(value) ? (value as unknown as UploadedFile[]) : []
  const [busy, setBusy] = useState(false)

  const handle = async (list: FileList | null) => {
    if (!list || !onUpload) return
    setBusy(true)
    try {
      const added: UploadedFile[] = []
      for (const f of Array.from(list)) {
        if (maxFiles && files.length + added.length >= maxFiles) break
        added.push(await onUpload(f))
      }
      onChange([...files, ...added] as unknown as Json)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: files.length ? 12 : 0 }}>
        {files.map((f, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#eef6fb', border: '1px solid #d7e8f4', borderRadius: 8, padding: '8px 12px', fontSize: 14, color: C.navy2 }}>
            <span>{accept?.startsWith('image') ? '🖼' : '🗎'}</span>
            <span
              onClick={() => onOpenFile?.(f)}
              style={onOpenFile ? { cursor: 'pointer', textDecoration: 'underline' } : undefined}
              title={onOpenFile ? 'Open file' : undefined}
            >
              {f.filename}
            </span>
            {!ro && <span onClick={() => onChange(files.filter((_, j) => j !== i) as unknown as Json)} style={{ cursor: 'pointer', color: '#c9491f', fontWeight: 800 }}>✕</span>}
          </div>
        ))}
      </div>
      {!ro && onUpload && (
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: `1.5px dashed ${C.cyan}`, color: C.cyan, fontWeight: 700, fontSize: 14, padding: '12px 18px', borderRadius: 12, cursor: 'pointer' }}>
          {busy ? 'Uploading…' : accept?.startsWith('image') ? '＋ Add image(s)' : '＋ Add file(s)'}
          <input type="file" accept={accept} multiple hidden onChange={(e) => handle(e.target.files)} />
        </label>
      )}
      {ro && files.length === 0 && <Hint>No files uploaded.</Hint>}
    </div>
  )
}

const COUNTRIES = ['New Zealand', 'Australia', 'United Kingdom', 'United States', 'Canada', 'Other']
