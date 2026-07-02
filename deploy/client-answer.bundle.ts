import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-portal-token, x-cron-secret',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

const serviceClient = () =>
  createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })

function senderFor(brand?: string | null): string {
  const swnz = Deno.env.get('SMTP2GO_SENDER') ?? 'SWNZ Content <noreply@example.com>'
  if (brand === 'caddie') return Deno.env.get('SMTP2GO_SENDER_CADDIE') ?? swnz
  return swnz
}

async function sendEmail({ to, subject, html, text, brand }: { to: string | string[]; subject: string; html: string; text?: string; brand?: string | null }): Promise<{ ok: boolean; error?: string }> {
  const apiKey = Deno.env.get('SMTP2GO_API_KEY')
  if (!apiKey) return { ok: false, error: 'SMTP2GO_API_KEY not set' }
  const recipients = Array.isArray(to) ? to : [to]
  const res = await fetch('https://api.smtp2go.com/v3/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Smtp2go-Api-Key': apiKey },
    body: JSON.stringify({ sender: senderFor(brand), to: recipients, subject, html_body: html, text_body: text ?? html.replace(/<[^>]+>/g, ' ') }),
  })
  if (!res.ok) return { ok: false, error: `SMTP2GO ${res.status}: ${await res.text()}` }
  const data = await res.json()
  const succeeded = data?.data?.succeeded ?? 0
  return succeeded > 0 ? { ok: true } : { ok: false, error: JSON.stringify(data?.data ?? data) }
}

const appUrl = () => Deno.env.get('PUBLIC_APP_URL') ?? 'https://swnz-content.onrender.com'

const EMAIL_BRANDS: Record<string, { name: string; bar: string; heading: string; button: string; link: string }> = {
  swnz: { name: 'School Websites New Zealand', bar: 'linear-gradient(90deg,#1ed79a,#19c2c0,#1ba0e6)', heading: '#16294a', button: '#1d3a5f', link: '#1493d6' },
  caddie: { name: 'Caddie Digital', bar: 'linear-gradient(90deg,#f0503c,#f57a3d)', heading: '#f0503c', button: '#f0503c', link: '#f0503c' },
}

function emailLayout(heading: string, body: string, cta?: { label: string; url: string }, brand?: string | null): string {
  const b = EMAIL_BRANDS[brand ?? 'swnz'] ?? EMAIL_BRANDS.swnz
  const button = cta
    ? `<a href="${cta.url}" style="display:inline-block;background:${b.button};color:#fff;font-weight:700;text-decoration:none;padding:13px 26px;border-radius:26px;margin-top:18px;">${cta.label}</a>`
    : ''
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#2b2535;">
    <div style="height:6px;background:${b.bar};border-radius:6px;"></div>
    <div style="padding:28px 8px;">
      <div style="font-weight:800;font-size:20px;color:${b.heading};">${b.name}</div>
      <h1 style="font-size:22px;color:#241d33;margin:18px 0 8px;">${heading}</h1>
      <div style="font-size:15px;line-height:1.6;color:#4b4556;">${body}</div>
      ${button}
    </div>
    <div style="font-size:12px;color:#9b95a5;padding:8px;border-top:1px solid #eee;">
      Sent by ${b.name} · <a href="${appUrl()}" style="color:${b.link};">${appUrl()}</a>
    </div>
  </div>`
}

const portalLink = (token: string) => `${appUrl()}/c/${token}`

// POST /client-answer  { token, answers: [{field_id, value}], submit?: bool } | { token, action: 'repeat_section', section_id }
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)
  try {
    const body = await req.json()
    const { token, answers, submit } = body
    const db = serviceClient()
    if (!token || String(token).length < 16) return json({ error: 'not_found' }, 404)
    const { data: request } = await db.from('requests').select('*').eq('public_token', token).maybeSingle()
    if (!request) return json({ error: 'not_found' }, 404)

    const [{ data: pages }, { data: sections }, { data: fields }] = await Promise.all([
      db.from('request_pages').select('*').eq('request_id', request.id),
      db.from('request_sections').select('*').order('position'),
      db.from('request_fields').select('*').order('position'),
    ])
    const pageIds = new Set((pages ?? []).map((p) => p.id))
    const validSections = (sections ?? []).filter((s) => pageIds.has(s.page_id))
    const sectionIds = new Set(validSections.map((s) => s.id))
    const reqFields = (fields ?? []).filter((f) => sectionIds.has(f.section_id))
    const validFieldIds = new Set(reqFields.map((f) => f.id))

    if (body.action === 'repeat_section') {
      const section = validSections.find((s) => s.id === body.section_id)
      if (!section || !section.repeatable) return json({ error: 'not_repeatable' }, 400)
      const secFields = reqFields.filter((f) => f.section_id === section.id)
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
