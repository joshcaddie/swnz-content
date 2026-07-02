import { json, preflight } from '../_shared/cors.ts'
import { serviceClient } from '../_shared/supabase.ts'
import { sendEmail, emailLayout } from '../_shared/email.ts'

// POST /invite-user  { name, email } — requires a valid team JWT (verify_jwt ON).
// Creates the user via the admin invite API (works with public sign-ups disabled)
// and emails them a set-up-your-account link. Re-inviting an existing user sends
// a fresh link via a recovery-type token.
Deno.serve(async (req) => {
  const pre = preflight(req)
  if (pre) return pre
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)
  const authz = req.headers.get('Authorization') ?? ''
  if (!authz.toLowerCase().startsWith('bearer ')) return json({ error: 'unauthorized' }, 401)

  try {
    const { name, email } = await req.json()
    if (!email || typeof email !== 'string') return json({ error: 'email_required' }, 400)
    const db = serviceClient()
    const redirectTo = `${Deno.env.get('PUBLIC_APP_URL') ?? 'https://swnz-content.onrender.com'}/welcome`

    let link: string | null = null
    const { data, error } = await db.auth.admin.generateLink({
      type: 'invite',
      email,
      options: { data: { name: name ?? '' }, redirectTo },
    })
    if (!error && data?.properties?.action_link) {
      link = data.properties.action_link
    } else if (error && /already|exists|registered/i.test(error.message)) {
      // Already invited/registered — issue a fresh set-password link instead.
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
