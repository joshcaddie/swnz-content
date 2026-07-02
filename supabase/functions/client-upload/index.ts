import { json, preflight } from '../_shared/cors.ts'
import { serviceClient, requestByToken, loadStructure } from '../_shared/supabase.ts'

// POST /client-upload
//  { token, action: 'sign',     field_id, filename }            -> { path, signedUrl, signToken }
//  { token, action: 'record',   field_id, path, filename, size, content_type } -> { ok, file }
//  { token, action: 'download', path, filename? }               -> { url }
Deno.serve(async (req) => {
  const pre = preflight(req)
  if (pre) return pre
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)
  try {
    const body = await req.json()
    const { token, action, field_id } = body
    const db = serviceClient()
    const request = await requestByToken(db, token)
    if (!request) return json({ error: 'not_found' }, 404)

    // Download a file this request uploaded (upload paths are always prefixed with the request id).
    if (action === 'download') {
      const path = String(body.path ?? '')
      if (!path.startsWith(`${request.id}/`)) return json({ error: 'invalid_path' }, 400)
      const { data, error } = await db.storage
        .from('uploads')
        .createSignedUrl(path, 3600, { download: body.filename ?? true })
      if (error) return json({ error: error.message }, 500)
      return json({ url: data.signedUrl })
    }

    // Validate the field belongs to this request.
    const { pages, sections, fields } = await loadStructure(db, request.id)
    const pageIds = new Set(pages.map((p) => p.id))
    const sectionIds = new Set(sections.filter((s) => pageIds.has(s.page_id)).map((s) => s.id))
    const valid = fields.some((f) => f.id === field_id && sectionIds.has(f.section_id))
    if (!valid) return json({ error: 'invalid_field' }, 400)

    if (action === 'sign') {
      const safe = String(body.filename ?? 'file').replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80)
      const path = `${request.id}/${field_id}/${crypto.randomUUID()}-${safe}`
      const { data, error } = await db.storage.from('uploads').createSignedUploadUrl(path)
      if (error) return json({ error: error.message }, 500)
      return json({ path, signedUrl: data.signedUrl, signToken: data.token })
    }

    if (action === 'record') {
      // Ensure an answer row exists for this field, then attach the file.
      const now = new Date().toISOString()
      const { data: ans, error: aErr } = await db
        .from('answers')
        .upsert(
          { request_id: request.id, field_id, status: 'todo', updated_at: now },
          { onConflict: 'field_id', ignoreDuplicates: false },
        )
        .select('id')
        .single()
      if (aErr) return json({ error: aErr.message }, 500)

      const { data: file, error: fErr } = await db
        .from('answer_files')
        .insert({
          answer_id: ans.id,
          storage_path: body.path,
          filename: body.filename ?? 'file',
          size: body.size ?? 0,
          content_type: body.content_type ?? null,
        })
        .select('*')
        .single()
      if (fErr) return json({ error: fErr.message }, 500)
      return json({ ok: true, file })
    }

    return json({ error: 'unknown_action' }, 400)
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
