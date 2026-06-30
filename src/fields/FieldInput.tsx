import { useState } from 'react'
import type { FieldConfig, FieldType, Json } from '../lib/database.types'
import { RichTextEditor, RichTextView } from '../components/RichText'
import { C } from '../theme'

export interface UploadedFile {
  path: string
  filename: string
  size: number
  content_type: string
}

interface Props {
  type: FieldType
  label: string
  config: FieldConfig
  value: Json
  onChange: (v: Json) => void
  readOnly?: boolean
  onUpload?: (file: File) => Promise<UploadedFile>
}

const box: React.CSSProperties = {
  width: '100%', border: '1px solid #e3e2e8', borderRadius: 10, padding: '14px 16px',
  fontFamily: 'inherit', fontSize: 16, color: C.ink, outline: 'none', background: readOnlyBg(false),
}
function readOnlyBg(ro: boolean) {
  return ro ? '#f7f7fa' : '#fff'
}

export function FieldInput({ type, label, config, value, onChange, readOnly, onUpload }: Props) {
  const ro = !!readOnly
  const style = { ...box, background: readOnlyBg(ro) }
  const options = config.options ?? []

  switch (type) {
    case 'heading':
      return <div style={{ fontWeight: 800, fontSize: 22, color: C.inkDark }}>{label}</div>
    case 'description':
      return <div style={{ color: '#5b5667', fontSize: 16, lineHeight: 1.6 }}>{config.helpText || label}</div>
    case 'divider':
      return <hr style={{ border: 'none', borderTop: '1px solid #e4e3e9', margin: '6px 0' }} />

    case 'multiline':
    case 'address':
      return (
        <textarea disabled={ro} value={asString(value)} onChange={(e) => onChange(e.target.value)}
          style={{ ...style, minHeight: 120, resize: 'vertical' }} placeholder="Enter text here..." />
      )

    case 'formatted':
      return ro ? <RichTextView html={asString(value)} /> : <RichTextEditor value={asString(value)} onChange={onChange} placeholder="Enter text here..." />

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
      return <FileField value={value} onChange={onChange} ro={ro} onUpload={onUpload} accept={type === 'image' ? 'image/*' : undefined} maxFiles={config.maxFiles} />

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
    default:
      return <input disabled={ro} value={asString(value)} onChange={(e) => onChange(e.target.value)} style={style} placeholder="Enter text here..." />
  }
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

function FileField({ value, onChange, ro, onUpload, accept, maxFiles }: {
  value: Json
  onChange: (v: Json) => void
  ro: boolean
  onUpload?: (file: File) => Promise<UploadedFile>
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
            <span>{f.filename}</span>
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
