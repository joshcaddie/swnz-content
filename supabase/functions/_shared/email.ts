// SMTP2GO email helper. API key + sender live in Supabase secrets, never in the frontend.
// supabase secrets set SMTP2GO_API_KEY=... SMTP2GO_SENDER="SWNZ Content <noreply@yourdomain>"

interface SendArgs {
  to: string | string[]
  subject: string
  html: string
  text?: string
}

export async function sendEmail({ to, subject, html, text }: SendArgs): Promise<{ ok: boolean; error?: string }> {
  const apiKey = Deno.env.get('SMTP2GO_API_KEY')
  const sender = Deno.env.get('SMTP2GO_SENDER') ?? 'SWNZ Content <noreply@example.com>'
  if (!apiKey) return { ok: false, error: 'SMTP2GO_API_KEY not set' }

  const recipients = Array.isArray(to) ? to : [to]
  const res = await fetch('https://api.smtp2go.com/v3/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Smtp2go-Api-Key': apiKey },
    body: JSON.stringify({
      sender,
      to: recipients,
      subject,
      html_body: html,
      text_body: text ?? html.replace(/<[^>]+>/g, ' '),
    }),
  })
  if (!res.ok) {
    return { ok: false, error: `SMTP2GO ${res.status}: ${await res.text()}` }
  }
  const data = await res.json()
  const succeeded = data?.data?.succeeded ?? 0
  return succeeded > 0 ? { ok: true } : { ok: false, error: JSON.stringify(data?.data ?? data) }
}

const appUrl = () => Deno.env.get('PUBLIC_APP_URL') ?? 'https://swnz-content.onrender.com'

/** Shared brand wrapper for all emails. */
export function emailLayout(heading: string, body: string, cta?: { label: string; url: string }): string {
  const button = cta
    ? `<a href="${cta.url}" style="display:inline-block;background:#1d3a5f;color:#fff;font-weight:700;
        text-decoration:none;padding:13px 26px;border-radius:26px;margin-top:18px;">${cta.label}</a>`
    : ''
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#2b2535;">
    <div style="height:6px;background:linear-gradient(90deg,#1ed79a,#19c2c0,#1ba0e6);border-radius:6px;"></div>
    <div style="padding:28px 8px;">
      <div style="font-weight:800;font-size:20px;color:#16294a;">School Websites New Zealand</div>
      <h1 style="font-size:22px;color:#241d33;margin:18px 0 8px;">${heading}</h1>
      <div style="font-size:15px;line-height:1.6;color:#4b4556;">${body}</div>
      ${button}
    </div>
    <div style="font-size:12px;color:#9b95a5;padding:8px;border-top:1px solid #eee;">
      Sent by SWNZ Content · <a href="${appUrl()}" style="color:#1493d6;">${appUrl()}</a>
    </div>
  </div>`
}

export const portalLink = (token: string) => `${appUrl()}/c/${token}`
