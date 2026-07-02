import { json, preflight } from '../_shared/cors.ts'
import { serviceClient, requestByToken, loadStructure } from '../_shared/supabase.ts'
import { sendEmail, emailLayout, portalLink } from '../_shared/email.ts'

// POST /client-answer  { token, answers: [{field_id, value}], submit?: bool }
// Saves drafts; if submit=true marks them 'submitted' and notifies the team.
Deno.serve(async (req) => {
  const pre = preflight(req)
  if (pre) return pre
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)
  try {
    const body = await req.json()
    const { token, answers, submit } = body
    const db = serviceClient()
    const request = await requestByToken(db, token)
    if (!request) return json({ error: 'not_found' }, 404)

    // Only allow writing to fields that belong to THIS request.
    const { pages, sections, fields } = await loadStructure(db, request.id)
    const pageIds = new Set(pages.map((p) => p.id))
    const sectionIds = new Set(sections.filter((s) => pageIds.has(s.page_id)).map((s) => s.id))
    const validFieldIds = new Set(fields.filter((f) => sectionIds.has(f.section_id)).map((f) => f.id))

    // "Add another response" for repeatable sections: clone the section's base fields.
    if (body.action === 'repeat_section') {
      const section = sections.find((s) => s.id === body.section_id && pageIds.has(s.page_id))
      if (!section || !section.repeatable) return json({ error: 'not_repeatable' }, 400)
      const secFields = fields.filter((f) => f.section_id === section.id)
      const base = secFields.filter((f) => !f.config?._rep)
      if (base.length === 0) return json({ error: 'empty_section' }, 400)
      const repNum = Math.max(1, ...secFields.map((f) => Number(f.config?._rep) || 1)) + 1
      let pos = Math.max(...secFields.map((f) => f.position)) + 1
      const clones = base.map((f) => ({
        section_id: section.id,
        type: f.type,
        label: `${f.label} (${repNum})`,
        tag: f.tag,
        config: { ...f.config, _rep: repNum, key: crypto.randomUUID().slice(0, 8) },
        position: pos++,
      }))
      const { error } = await db.from('request_fields').insert(clones)
      if (error) return json({ error: error.message }, 500)
      return json({ ok: true, added: clones.length })
    }

    const incoming = (Array.isArray(answers) ? answers : []).filter((a) => validFieldIds.has(a.field_id))
    if (incoming.length === 0) return json({ error: 'no_valid_answers' }, 400)

    const now = new Date().toISOString()
    const rows = incoming.map((a) => ({
      request_id: request.id,
      field_id: a.field_id,
      value: a.value ?? null,
      status: submit ? 'submitted' : 'todo',
      submitted_at: submit ? now : null,
      updated_at: now,
    }))
    const { error } = await db.from('answers').upsert(rows, { onConflict: 'field_id' })
    if (error) return json({ error: error.message }, 500)

    if (submit) {
      const notify = Deno.env.get('NOTIFY_EMAIL') ?? Deno.env.get('SMTP2GO_SENDER')
      if (notify) {
        await sendEmail({
          to: notify,
          brand: request.brand,
          subject: `New submission: ${request.name}`,
          html: emailLayout(
            'A client submitted answers',
            `<p><strong>${request.name}</strong> has ${incoming.length} newly submitted answer(s) ready for review.</p>`,
            { label: 'Open request', url: portalLink(request.public_token) },
            request.brand,
          ),
        }).catch(() => {})
      }
    }
    return json({ ok: true, saved: rows.length, submitted: !!submit })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
