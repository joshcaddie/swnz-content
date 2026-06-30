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
    const { token, answers, submit } = await req.json()
    const db = serviceClient()
    const request = await requestByToken(db, token)
    if (!request) return json({ error: 'not_found' }, 404)

    // Only allow writing to fields that belong to THIS request.
    const { pages, sections, fields } = await loadStructure(db, request.id)
    const pageIds = new Set(pages.map((p) => p.id))
    const sectionIds = new Set(sections.filter((s) => pageIds.has(s.page_id)).map((s) => s.id))
    const validFieldIds = new Set(fields.filter((f) => sectionIds.has(f.section_id)).map((f) => f.id))

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
          subject: `New submission: ${request.name}`,
          html: emailLayout(
            'A client submitted answers',
            `<p><strong>${request.name}</strong> has ${incoming.length} newly submitted answer(s) ready for review.</p>`,
            { label: 'Open request', url: portalLink(request.public_token) },
          ),
        }).catch(() => {})
      }
    }
    return json({ ok: true, saved: rows.length, submitted: !!submit })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
