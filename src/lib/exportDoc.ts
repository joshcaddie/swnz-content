import { Document, Packer, Paragraph, TextRun, HeadingLevel, ImageRun, PageBreak } from 'docx'
import JSZip from 'jszip'
import type { RequestDetail } from '../api/requests'
import type { UploadedFile } from '../fields/FieldInput'
import { fileStoragePath } from '../fields/FieldInput'
import { isDisplayField } from '../fields/registry'
import type { Json } from './database.types'

const MAX_IMG_W = 460 // px in the doc

type ImgType = 'jpg' | 'png' | 'gif' | 'bmp'
function imgType(name: string, contentType?: string | null): ImgType | null {
  const s = `${contentType ?? ''} ${name}`.toLowerCase()
  if (s.includes('png')) return 'png'
  if (s.includes('gif')) return 'gif'
  if (s.includes('bmp')) return 'bmp'
  if (s.includes('jpg') || s.includes('jpeg')) return 'jpg'
  return null
}

/** Natural dimensions of an image blob (for keeping aspect ratio in the doc). */
function imgDims(blob: Blob): Promise<{ w: number; h: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob)
    const im = new Image()
    im.onload = () => { resolve({ w: im.naturalWidth, h: im.naturalHeight }); URL.revokeObjectURL(url) }
    im.onerror = () => { resolve(null); URL.revokeObjectURL(url) }
    im.src = url
  })
}

/** Turn simple HTML (from the rich-text fields) into plain text lines. */
function htmlToLines(html: string): string[] {
  const withBreaks = html
    .replace(/<\/(p|div|h[1-6]|li)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '')
  const txt = withBreaks
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"')
  return txt.split('\n').map((l) => l.trim()).filter(Boolean)
}

function asPlain(v: Json): string[] {
  if (v == null) return []
  if (typeof v === 'string') return v.trim() ? [v.trim()] : []
  if (typeof v === 'number' || typeof v === 'boolean') return [String(v)]
  if (Array.isArray(v)) return v.map((x) => String(x))
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>
    if ('from' in o || 'to' in o) return [`${o.from ?? ''} – ${o.to ?? ''}`.trim()]
    return [JSON.stringify(v)]
  }
  return []
}

function sanitize(name: string): string {
  return (name.replace(/[^a-zA-Z0-9 ._-]/g, '').trim() || 'file')
}

/**
 * Build a .docx (opens natively in Google Docs / Word) with a page per sitemap
 * page, all answers, images embedded inline, and files referenced — then zip it
 * together with the original image/file downloads and trigger a download.
 */
export async function downloadRequestContent(
  data: RequestDetail,
  fileUrl: (f: UploadedFile) => Promise<string>,
  onProgress?: (msg: string) => void,
): Promise<void> {
  const zip = new JSZip()
  const answers = new Map(data.answers.map((a) => [a.field_id, a.value]))
  const children: Paragraph[] = []
  const usedNames = new Set<string>()
  const uniqueZipName = (folder: string, filename: string) => {
    let name = `${folder}/${sanitize(filename)}`
    for (let n = 2; usedNames.has(name); n++) name = `${folder}/${n}-${sanitize(filename)}`
    usedNames.add(name)
    return name
  }

  children.push(new Paragraph({ text: data.request.name, heading: HeadingLevel.TITLE }))
  if (data.request.clients?.name) children.push(new Paragraph({ children: [new TextRun({ text: `For ${data.request.clients.name}`, italics: true, color: '777777' })] }))

  let firstPage = true
  for (const pg of data.pages) {
    const secs = data.sections.filter((s) => s.page_id === pg.id)
    onProgress?.(`Adding page: ${pg.name}`)
    children.push(new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [...(firstPage ? [] : [new PageBreak()]), new TextRun({ text: pg.name, bold: true })],
    }))
    firstPage = false

    if (pg.nav_only || secs.length === 0) {
      children.push(new Paragraph({ children: [new TextRun({ text: 'Navigation label — no content collected.', italics: true, color: '999999' })] }))
      continue
    }

    for (const sec of secs) {
      const fields = data.fields.filter((f) => f.section_id === sec.id && !isDisplayField(f.type))
      if (fields.length === 0) continue
      if (sec.name && sec.name !== 'Page content') children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, text: sec.name }))

      for (const f of fields) {
        children.push(new Paragraph({ spacing: { before: 160 }, children: [new TextRun({ text: f.label, bold: true, size: 24 })] }))
        const v = answers.get(f.id)

        if (f.type === 'image' || f.type === 'file') {
          const files = (Array.isArray(v) ? v : []) as unknown as UploadedFile[]
          if (files.length === 0) { children.push(new Paragraph({ children: [new TextRun({ text: '(none provided)', italics: true, color: '999999' })] })); continue }
          for (const file of files) {
            const path = fileStoragePath(file)
            if (!path) continue
            try {
              const url = await fileUrl(file)
              const blob = await fetch(url).then((r) => r.blob())
              const folder = `files/${sanitize(pg.name)}`
              const zipName = uniqueZipName(folder, file.filename)
              zip.file(zipName, blob)
              const t = imgType(file.filename, file.content_type)
              if (f.type === 'image' && t) {
                const dims = await imgDims(blob)
                const w = dims ? Math.min(MAX_IMG_W, dims.w) : MAX_IMG_W
                const h = dims ? Math.round((dims.h * w) / dims.w) : Math.round(w * 0.66)
                const buf = await blob.arrayBuffer()
                children.push(new Paragraph({ children: [new ImageRun({ data: buf, transformation: { width: w, height: h } })] }))
              }
              children.push(new Paragraph({ children: [new TextRun({ text: `📎 ${file.filename} — see ${zipName}`, italics: true, color: '1155cc', size: 18 })] }))
            } catch {
              children.push(new Paragraph({ children: [new TextRun({ text: `⚠ Could not include ${file.filename}`, italics: true, color: 'c9491f' })] }))
            }
          }
          continue
        }

        const lines = f.type === 'formatted' && typeof v === 'string' ? htmlToLines(v) : asPlain(v ?? null)
        if (lines.length === 0) { children.push(new Paragraph({ children: [new TextRun({ text: '(blank)', italics: true, color: '999999' })] })); continue }
        for (const line of lines) children.push(new Paragraph({ children: [new TextRun({ text: line })] }))
      }
    }
  }

  onProgress?.('Building document…')
  const doc = new Document({
    styles: { default: { document: { run: { font: 'Arial', size: 22 } } } },
    sections: [{ children }],
  })
  const docBlob = await Packer.toBlob(doc)
  zip.file(`${sanitize(data.request.name)}.docx`, docBlob)

  // A short read-me so it's obvious the .docx opens in Google Docs.
  zip.file('README.txt', `${data.request.name}\n\nOpen "${sanitize(data.request.name)}.docx" in Google Docs (File → Open → Upload) or Microsoft Word.\nOriginal images and files are in the "files" folder, referenced from the document.\n`)

  onProgress?.('Zipping…')
  const out = await zip.generateAsync({ type: 'blob' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(out)
  a.download = `${sanitize(data.request.name)} — content.zip`
  a.click()
  URL.revokeObjectURL(a.href)
}
