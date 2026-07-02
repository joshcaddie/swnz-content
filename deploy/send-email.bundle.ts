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

// POST /send-email — requires a valid team JWT (verify_jwt is ON for this function).
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)
  const authz = req.headers.get('Authorization') ?? ''
  if (!authz.toLowerCase().startsWith('bearer ')) return json({ error: 'unauthorized' }, 401)
  try {
    const body = await req.json()
    const db = serviceClient()

    if (body.kind === 'invite' || body.kind === 'decision') {
      const { data: request } = await db
        .from('requests')
        .select('*, clients(name, contact_email)')
        .eq('id', body.requestId)
        .maybeSingle()
      if (!request) return json({ error: 'request_not_found' }, 404)
      const to = (request as { clients?: { contact_email?: string } }).clients?.contact_email
      if (!to) return json({ error: 'client_has_no_email' }, 400)

      const brand = request.brand ?? 'swnz'
      const agency = brand === 'caddie' ? 'Caddie Digital' : 'School Websites New Zealand'

      if (body.kind === 'invite') {
        const result = await sendEmail({
          to,
          brand,
          subject: `Action needed: ${request.name}`,
          html: emailLayout(
            'We need some content from you',
            `<p>Kia ora,</p><p>${agency} has a content request ready for you:
             <strong>${request.name}</strong>${request.due_date ? ` (due ${request.due_date})` : ''}.</p>
             <p>Click below to open it — no login required.</p>`,
            { label: 'Open your request', url: portalLink(request.public_token) },
            brand,
          ),
        })
        return json(result)
      }

      const approved = !!body.approved
      const result = await sendEmail({
        to,
        brand,
        subject: approved ? `Approved: ${request.name}` : `Changes requested: ${request.name}`,
        html: emailLayout(
          approved ? 'Your submission was approved' : 'A few changes are needed',
          approved
            ? `<p>Thanks! Your answers for <strong>${request.name}</strong> have been approved.</p>`
            : `<p>Thanks for your submission to <strong>${request.name}</strong>. We've requested some changes:</p>
               <blockquote style="border-left:3px solid #1493d6;padding-left:12px;color:#4b4556;">${body.note ?? ''}</blockquote>`,
          { label: 'Open your request', url: portalLink(request.public_token) },
          brand,
        ),
      })
      return json(result)
    }

    if (body.kind === 'custom') {
      const result = await sendEmail({
        to: body.to,
        brand: body.brand,
        subject: body.subject,
        html: emailLayout(body.heading ?? body.subject, body.body ?? '', undefined, body.brand),
      })
      return json(result)
    }

    return json({ error: 'unknown_kind' }, 400)
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
