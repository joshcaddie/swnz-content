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

// POST /send-reminders — invoked by pg_cron; protected by the x-cron-secret header.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const cronSecret = Deno.env.get('CRON_SECRET')
  if (cronSecret && req.headers.get('x-cron-secret') !== cronSecret) {
    return json({ error: 'forbidden' }, 403)
  }
  try {
    const db = serviceClient()
    const horizon = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

    const { data: requests } = await db
      .from('requests')
      .select('id, name, due_date, public_token, brand, reminders_enabled, clients(name, contact_email)')
      .eq('reminders_enabled', true)
      .not('due_date', 'is', null)
      .lte('due_date', horizon)

    let sent = 0
    for (const r of requests ?? []) {
      const client = (r as { clients?: { contact_email?: string } }).clients
      if (!client?.contact_email) continue

      const { data: prog } = await db
        .from('request_progress')
        .select('total, approved')
        .eq('request_id', r.id)
        .maybeSingle()
      if (prog && prog.total > 0 && prog.approved >= prog.total) continue

      const result = await sendEmail({
        to: client.contact_email,
        brand: r.brand,
        subject: `Reminder: ${r.name}`,
        html: emailLayout(
          'A quick reminder',
          `<p>Kia ora,</p><p>Your content request <strong>${r.name}</strong> is due
           ${r.due_date}. When you have a moment, please open it and add what you can.</p>`,
          { label: 'Open your request', url: portalLink(r.public_token) },
          r.brand,
        ),
      })
      if (result.ok) sent++
    }
    return json({ ok: true, sent })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
