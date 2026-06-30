import { json, preflight } from '../_shared/cors.ts'
import { serviceClient } from '../_shared/supabase.ts'
import { sendEmail, emailLayout, portalLink } from '../_shared/email.ts'

// POST /send-reminders — invoked by pg_cron (see SETUP.md). Emails clients whose requests are
// overdue or due within 3 days and not yet fully approved. verify_jwt is OFF; protect via the
// cron secret header if desired (CRON_SECRET).
Deno.serve(async (req) => {
  const pre = preflight(req)
  if (pre) return pre
  const cronSecret = Deno.env.get('CRON_SECRET')
  if (cronSecret && req.headers.get('x-cron-secret') !== cronSecret) {
    return json({ error: 'forbidden' }, 403)
  }
  try {
    const db = serviceClient()
    const horizon = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

    const { data: requests } = await db
      .from('requests')
      .select('id, name, due_date, public_token, reminders_enabled, clients(name, contact_email)')
      .eq('reminders_enabled', true)
      .not('due_date', 'is', null)
      .lte('due_date', horizon)

    let sent = 0
    for (const r of requests ?? []) {
      const client = (r as { clients?: { contact_email?: string } }).clients
      if (!client?.contact_email) continue

      // Skip if every field is already approved.
      const { data: prog } = await db
        .from('request_progress')
        .select('total, approved')
        .eq('request_id', r.id)
        .maybeSingle()
      if (prog && prog.total > 0 && prog.approved >= prog.total) continue

      const result = await sendEmail({
        to: client.contact_email,
        subject: `Reminder: ${r.name}`,
        html: emailLayout(
          'A quick reminder',
          `<p>Kia ora,</p><p>Your content request <strong>${r.name}</strong> is due
           ${r.due_date}. When you have a moment, please open it and add what you can.</p>`,
          { label: 'Open your request', url: portalLink(r.public_token) },
        ),
      })
      if (result.ok) sent++
    }
    return json({ ok: true, sent })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
