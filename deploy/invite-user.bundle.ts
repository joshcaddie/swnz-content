import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-portal-token',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

const serviceClient = () =>
  createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })

async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }): Promise<{ ok: boolean; error?: string }> {
  const apiKey = Deno.env.get('SMTP2GO_API_KEY')
  const sender = Deno.env.get('SMTP2GO_SENDER') ?? 'Get Content <noreply@example.com>'
  if (!apiKey) return { ok: false, error: 'SMTP2GO_API_KEY not set' }
  const res = await fetch('https://api.smtp2go.com/v3/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Smtp2go-Api-Key': apiKey },
    body: JSON.stringify({ sender, to: [to], subject, html_body: html, text_body: html.replace(/<[^>]+>/g, ' ') }),
  })
  if (!res.ok) return { ok: false, error: `SMTP2GO ${res.status}: ${await res.text()}` }
  const data = await res.json()
  return (data?.data?.succeeded ?? 0) > 0 ? { ok: true } : { ok: false, error: JSON.stringify(data?.data ?? data) }
}

const appUrl = () => Deno.env.get('PUBLIC_APP_URL') ?? 'https://swnz-content.onrender.com'

function emailLayout(heading: string, body: string, cta?: { label: string; url: string }): string {
  const button = cta
    ? `<a href="${cta.url}" style="display:inline-block;background:#1d3a5f;color:#fff;font-weight:700;text-decoration:none;padding:13px 26px;border-radius:26px;margin-top:18px;">${cta.label}</a>`
    : ''
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#2b2535;">
    <div style="height:6px;background:linear-gradient(90deg,#1ed79a,#19c2c0,#1ba0e6);border-radius:6px;"></div>
    <div style="padding:28px 8px;">
      <div style="font-weight:800;font-size:20px;color:#16294a;">Get Content</div>
      <h1 style="font-size:22px;color:#241d33;margin:18px 0 8px;">${heading}</h1>
      <div style="font-size:15px;line-height:1.6;color:#4b4556;">${body}</div>
      ${button}
    </div>
    <div style="font-size:12px;color:#9b95a5;padding:8px;border-top:1px solid #eee;">
      Sent by Get Content · <a href="${appUrl()}" style="color:#1493d6;">${appUrl()}</a>
    </div>
  </div>`
}

// POST /invite-user  { name, email } — requires a valid team JWT (verify_jwt ON).
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)
  const authz = req.headers.get('Authorization') ?? ''
  if (!authz.toLowerCase().startsWith('bearer ')) return json({ error: 'unauthorized' }, 401)

  try {
    const { name, email } = await req.json()
    if (!email || typeof email !== 'string') return json({ error: 'email_required' }, 400)
    const db = serviceClient()
    const redirectTo = `${appUrl()}/welcome`

    let link: string | null = null
    const { data, error } = await db.auth.admin.generateLink({
      type: 'invite',
      email,
      options: { data: { name: name ?? '' }, redirectTo },
    })
    if (!error && data?.properties?.action_link) {
      link = data.properties.action_link
      // New account: mark the auto-created profile as pending until they finish setup.
      if (data.user?.id) {
        await db.from('profiles').update({ invite_pending: true }).eq('id', data.user.id)
      }
    } else if (error && /already|exists|registered/i.test(error.message)) {
      const { data: rec, error: recErr } = await db.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: { redirectTo },
      })
      if (recErr || !rec?.properties?.action_link) return json({ error: recErr?.message ?? 'could_not_reinvite' }, 500)
      link = rec.properties.action_link
    } else {
      return json({ error: error?.message ?? 'could_not_invite' }, 500)
    }

    const result = await sendEmail({
      to: email,
      subject: "You're invited to Get Content",
      html: emailLayout(
        'Join the Get Content team',
        `<p>Kia ora${name ? ` ${name}` : ''},</p>
         <p>You've been invited to Get Content — where we build and review website
         content requests for our clients.</p>
         <p>Click below to set up your account. This link is personal to you and expires after 24 hours.</p>`,
        { label: 'Set up your account', url: link },
      ),
    })
    if (!result.ok) return json({ error: `invite created but email failed: ${result.error}` }, 500)
    return json({ ok: true })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
