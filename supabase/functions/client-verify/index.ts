import { json, preflight } from '../_shared/cors.ts'
import { serviceClient, requestByToken } from '../_shared/supabase.ts'
import { sendEmail, emailLayout } from '../_shared/email.ts'

// POST /client-verify
//  { token, action: 'send' }            -> emails a 6-digit code to the client's contact email
//  { token, action: 'check', code }     -> { ok: true } if valid & unexpired
Deno.serve(async (req) => {
  const pre = preflight(req)
  if (pre) return pre
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)
  try {
    const { token, action, code } = await req.json()
    const db = serviceClient()
    const request = await requestByToken(db, token)
    if (!request) return json({ error: 'not_found' }, 404)

    const { data: client } = await db
      .from('clients')
      .select('contact_email')
      .eq('id', request.client_id)
      .maybeSingle()
    const email = client?.contact_email
    if (!email) return json({ error: 'no_contact_email' }, 400)

    if (action === 'send') {
      const generated = String(Math.floor(100000 + Math.random() * 900000))
      const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString()
      await db.from('client_verifications').insert({
        request_id: request.id,
        email,
        code: generated,
        expires_at: expires,
      })
      const masked = email.replace(/^(.).*(@.*)$/, '$1•••$2')
      const result = await sendEmail({
        to: email,
        subject: `Your SWNZ Content verification code: ${generated}`,
        html: emailLayout(
          'Verify your email',
          `<p>Use this code to open <strong>${request.name}</strong>:</p>
           <p style="font-size:30px;font-weight:800;letter-spacing:6px;color:#16294a;">${generated}</p>
           <p>This code expires in 15 minutes.</p>`,
        ),
      })
      return json({ ok: result.ok, sentTo: masked, error: result.error })
    }

    if (action === 'check') {
      const { data: rows } = await db
        .from('client_verifications')
        .select('*')
        .eq('request_id', request.id)
        .eq('email', email)
        .eq('consumed', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
      const row = rows?.[0]
      if (!row || row.code !== String(code)) return json({ ok: false }, 401)
      await db.from('client_verifications').update({ consumed: true }).eq('id', row.id)
      return json({ ok: true })
    }

    return json({ error: 'unknown_action' }, 400)
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
