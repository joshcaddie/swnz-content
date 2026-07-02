import { json, preflight } from '../_shared/cors.ts'
import { serviceClient } from '../_shared/supabase.ts'
import { sendEmail, emailLayout, portalLink } from '../_shared/email.ts'

// POST /send-email — requires a valid team JWT (verify_jwt is ON for this function).
// Body is one of the known templates so the frontend can't send arbitrary spam content.
//  { kind: 'invite',  requestId }                  -> emails the client their portal link
//  { kind: 'decision', requestId, approved, note } -> notifies client of approval / changes
//  { kind: 'custom',  to, subject, heading, body } -> generic team-composed message
Deno.serve(async (req) => {
  const pre = preflight(req)
  if (pre) return pre
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  // Require an authenticated caller (team). The platform enforces JWT; double-check presence.
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
