// SMTP2GO email helper. API keys + senders live in Supabase secrets, never in the frontend.
//   SMTP2GO_SENDER         "SWNZ Content <content@websites.school.nz>"
//   SMTP2GO_SENDER_CADDIE  "Caddie Digital <content@caddiedigital.co.nz>"

interface SendArgs {
  to: string | string[]
  subject: string
  html: string
  text?: string
  /** 'swnz' (default) or 'caddie' — picks the sender address. */
  brand?: string | null
}

function senderFor(brand?: string | null): string {
  const swnz = Deno.env.get('SMTP2GO_SENDER') ?? 'SWNZ Content <noreply@example.com>'
  if (brand === 'caddie') return Deno.env.get('SMTP2GO_SENDER_CADDIE') ?? swnz
  return swnz
}

export async function sendEmail({ to, subject, html, text, brand }: SendArgs): Promise<{ ok: boolean; error?: string }> {
  const apiKey = Deno.env.get('SMTP2GO_API_KEY')
  if (!apiKey) return { ok: false, error: 'SMTP2GO_API_KEY not set' }

  const recipients = Array.isArray(to) ? to : [to]
  const res = await fetch('https://api.smtp2go.com/v3/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Smtp2go-Api-Key': apiKey },
    body: JSON.stringify({
      sender: senderFor(brand),
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

const appUrl = () => Deno.env.get('PUBLIC_APP_URL') ?? 'https://content.caddiedigital.co.nz'

const EMAIL_BRANDS: Record<string, { name: string; bar: string; heading: string; button: string; link: string }> = {
  swnz: {
    name: 'School Websites New Zealand',
    bar: 'linear-gradient(90deg,#1ed79a,#19c2c0,#1ba0e6)',
    heading: '#16294a',
    button: '#1d3a5f',
    link: '#1493d6',
  },
  caddie: {
    name: 'Caddie Digital',
    bar: 'linear-gradient(90deg,#f0503c,#f57a3d)',
    heading: '#f0503c',
    button: '#f0503c',
    link: '#f0503c',
  },
}

/** Shared wrapper for all emails, coloured per brand. */
export function emailLayout(heading: string, body: string, cta?: { label: string; url: string }, brand?: string | null): string {
  const b = EMAIL_BRANDS[brand ?? 'swnz'] ?? EMAIL_BRANDS.swnz
  const button = cta
    ? `<a href="${cta.url}" style="display:inline-block;background:${b.button};color:#fff;font-weight:700;
        text-decoration:none;padding:13px 26px;border-radius:26px;margin-top:18px;">${cta.label}</a>`
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

export const portalLink = (token: string) => `${appUrl()}/c/${token}`
