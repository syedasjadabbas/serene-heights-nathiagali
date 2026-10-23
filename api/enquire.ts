// Vercel serverless function: emails each website enquiry to the sales team through Resend.
// Environment variables (Vercel → Project → Settings → Environment Variables):
//   RESEND_API_KEY  required, from resend.com/api-keys
//   ENQUIRY_FROM    sender on a domain verified in Resend, e.g. "Serene Heights Website <website@sereneheightsnathiagali.com>"
//   ENQUIRY_TO      where enquiries go, comma separated (default info@sereneheightsnathiagali.com)

declare const process: { env: Record<string, string | undefined> }

const FIELDS = ['name', 'phone', 'email', 'city', 'interest', 'unit', 'page'] as const
type Enquiry = Record<(typeof FIELDS)[number], string>

const json = (status: number, body: object) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return json(400, { error: 'Invalid request' })
  }
  // spam trap: the hidden "company" field is only ever filled in by bots
  if (typeof body.company === 'string' && body.company.trim()) return json(200, { ok: true })

  const e = Object.fromEntries(FIELDS.map((k) => [k, String(body[k] ?? '').trim().slice(0, 200)])) as Enquiry
  if (!e.name || !e.phone) return json(400, { error: 'Name and phone are required' })
  if (!/^[+\d][\d\s()-]{6,}$/.test(e.phone)) return json(400, { error: 'Phone number looks wrong' })
  if (e.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.email)) return json(400, { error: 'Email looks wrong' })

  const key = process.env.RESEND_API_KEY
  if (!key) {
    console.error('enquire: RESEND_API_KEY is not set')
    return json(500, { error: 'Email is not configured' })
  }
  const from = process.env.ENQUIRY_FROM || 'Serene Heights Website <onboarding@resend.dev>'
  const to = (process.env.ENQUIRY_TO || 'info@sereneheightsnathiagali.com').split(',').map((s) => s.trim()).filter(Boolean)

  const rows: [string, string][] = [
    ['Name', e.name], ['Phone', e.phone], ['Email', e.email], ['City', e.city],
    ['Interested in', e.interest], ['Apartment', e.unit], ['Sent from page', e.page],
  ]
  const filled = rows.filter(([, v]) => v)
  const text = filled.map(([k, v]) => `${k}: ${v}`).join('\n')
  const html = `<h2 style="font-family:Arial,sans-serif;color:#18332a">New website enquiry</h2>
<table style="font-family:Arial,sans-serif;font-size:15px;border-collapse:collapse">${filled
    .map(([k, v]) => `<tr><td style="padding:6px 16px 6px 0;color:#5e6b66">${k}</td><td style="padding:6px 0;color:#18332a"><b>${escape(v)}</b></td></tr>`)
    .join('')}</table>`

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to,
      subject: `Website enquiry: ${e.name}${e.interest ? ` · ${e.interest}` : ''}`,
      text,
      html,
      ...(e.email ? { reply_to: e.email } : {}),
    }),
  })
  if (!res.ok) {
    console.error('enquire: Resend error', res.status, await res.text())
    return json(502, { error: 'Could not send the enquiry' })
  }
  return json(200, { ok: true })
}
