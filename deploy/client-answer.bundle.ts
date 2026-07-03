import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-portal-token',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
const preflight = (req: Request) => (req.method === 'OPTIONS' ? new Response('ok', { headers: corsHeaders }) : null)

const serviceClient = () =>
  createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })

async function requestByToken(db: any, token: string) {
  if (!token || token.length < 16) return null
  const { data } = await db.from('requests').select('*').eq('public_token', token).maybeSingle()
  return data
}

async function loadStructure(db: any, requestId: string) {
  const [{ data: pages }, { data: sections }, { data: fields }, { data: answers }] = await Promise.all([
    db.from('request_pages').select('*').eq('request_id', requestId).order('position'),
    db.from('request_sections').select('*').order('position'),
    db.from('request_fields').select('*').order('position'),
    db.from('answers').select('*').eq('request_id', requestId),
  ])
  return { pages: pages ?? [], sections: sections ?? [], fields: fields ?? [], answers: answers ?? [] }
}

function senderFor(brand?: string | null): string {
  const swnz = Deno.env.get('SMTP2GO_SENDER') ?? 'SWNZ Content <noreply@example.com>'
  if (brand === 'caddie') return Deno.env.get('SMTP2GO_SENDER_CADDIE') ?? swnz
  return swnz
}
async function sendEmail({ to, subject, html, brand }: { to: string | string[]; subject: string; html: string; brand?: string | null }): Promise<{ ok: boolean; error?: string }> {
  const apiKey = Deno.env.get('SMTP2GO_API_KEY')
  if (!apiKey) return { ok: false, error: 'SMTP2GO_API_KEY not set' }
  const recipients = Array.isArray(to) ? to : [to]
  const res = await fetch('https://api.smtp2go.com/v3/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Smtp2go-Api-Key': apiKey },
    body: JSON.stringify({ sender: senderFor(brand), to: recipients, subject, html_body: html, text_body: html.replace(/<[^>]+>/g, ' ') }),
  })
  if (!res.ok) return { ok: false, error: `SMTP2GO ${res.status}: ${await res.text()}` }
  const data = await res.json()
  return (data?.data?.succeeded ?? 0) > 0 ? { ok: true } : { ok: false, error: JSON.stringify(data?.data ?? data) }
}
const appUrl = () => Deno.env.get('PUBLIC_APP_URL') ?? 'https://content.caddiedigital.co.nz'
const EMAIL_BRANDS: Record<string, { name: string; bar: string; heading: string; button: string; link: string }> = {
  swnz: { name: 'School Websites New Zealand', bar: 'linear-gradient(90deg,#1ed79a,#19c2c0,#1ba0e6)', heading: '#16294a', button: '#1d3a5f', link: '#1493d6' },
  caddie: { name: 'Caddie Digital', bar: 'linear-gradient(90deg,#f0503c,#f57a3d)', heading: '#f0503c', button: '#f0503c', link: '#f0503c' },
}
function emailLayout(heading: string, body: string, cta?: { label: string; url: string }, brand?: string | null): string {
  const b = EMAIL_BRANDS[brand ?? 'swnz'] ?? EMAIL_BRANDS.swnz
  const button = cta ? `<a href="${cta.url}" style="display:inline-block;background:${b.button};color:#fff;font-weight:700;text-decoration:none;padding:13px 26px;border-radius:26px;margin-top:18px;">${cta.label}</a>` : ''
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#2b2535;">
    <div style="height:6px;background:${b.bar};border-radius:6px;"></div>
    <div style="padding:28px 8px;">
      <div style="font-weight:800;font-size:20px;color:${b.heading};">${b.name}</div>
      <h1 style="font-size:22px;color:#241d33;margin:18px 0 8px;">${heading}</h1>
      <div style="font-size:15px;line-height:1.6;color:#4b4556;">${body}</div>
      ${button}
    </div>
    <div style="font-size:12px;color:#9b95a5;padding:8px;border-top:1px solid #eee;">Sent by ${b.name} · <a href="${appUrl()}" style="color:${b.link};">${appUrl()}</a></div>
  </div>`
}
const portalLink = (token: string) => `${appUrl()}/c/${token}`

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

    // Lightweight poll: return just this request's answers (for live sync in the portal).
    if (body.action === 'load_answers') {
      const { data: rows } = await db.from('answers').select('*').eq('request_id', request.id)
      return json({ answers: rows ?? [] })
    }

    // Only allow writing to fields that belong to THIS request.
    const { pages, sections, fields } = await loadStructure(db, request.id)
    const pageIds = new Set(pages.map((p) => p.id))
    const sectionIds = new Set(sections.filter((s) => pageIds.has(s.page_id)).map((s) => s.id))
    const validFieldIds = new Set(fields.filter((f) => sectionIds.has(f.section_id)).map((f) => f.id))

    // Submit for review: flip existing answered fields to 'submitted' WITHOUT rewriting any
    // values, so it can never overwrite content someone else added. Values are already saved
    // by the portal's per-field autosave.
    if (body.action === 'submit_all') {
      const now = new Date().toISOString()
      const { error, count } = await db
        .from('answers')
        .update({ status: 'submitted', submitted_at: now }, { count: 'exact' })
        .eq('request_id', request.id)
        .not('value', 'is', null)
        .in('status', ['todo', 'changes_requested'])
      if (error) return json({ error: error.message }, 500)
      const notify = Deno.env.get('NOTIFY_EMAIL') ?? Deno.env.get('SMTP2GO_SENDER')
      if (notify) {
        await sendEmail({
          to: notify,
          brand: request.brand,
          subject: `New submission: ${request.name}`,
          html: emailLayout(
            'A client submitted answers',
            `<p><strong>${request.name}</strong> has ${count ?? 0} answer(s) ready for review.</p>`,
            { label: 'Open request', url: portalLink(request.public_token) },
            request.brand,
          ),
        }).catch(() => {})
      }
      return json({ ok: true, submitted: count ?? 0 })
    }

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
