import { json, preflight } from '../_shared/cors.ts'
import { serviceClient, requestByToken, loadStructure } from '../_shared/supabase.ts'

// POST /ai-generate  { token, field_id, prompt }
// Generates draft content for a text field in the client portal via the Anthropic API.
// Token-scoped like every other client function; the API key never leaves the server.

const TEXT_TYPES = new Set(['single_line', 'multiline', 'formatted'])
const MAX_PROMPT_CHARS = 2000

Deno.serve(async (req) => {
  const pre = preflight(req)
  if (pre) return pre
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)
  try {
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) return json({ error: 'ai_not_configured' }, 500)

    const { token, field_id, prompt } = await req.json()
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) return json({ error: 'empty_prompt' }, 400)

    const db = serviceClient()
    const request = await requestByToken(db, token)
    if (!request) return json({ error: 'not_found' }, 404)

    // The field must belong to THIS request and be a text type.
    const { pages, sections, fields } = await loadStructure(db, request.id)
    const pageIds = new Set(pages.map((p) => p.id))
    const validSections = sections.filter((s) => pageIds.has(s.page_id))
    const field = fields.find((f) => f.id === field_id && validSections.some((s) => s.id === f.section_id))
    if (!field || !TEXT_TYPES.has(field.type)) return json({ error: 'invalid_field' }, 400)

    const section = validSections.find((s) => s.id === field.section_id)
    const page = pages.find((p) => p.id === section?.page_id)
    const { data: client } = request.client_id
      ? await db.from('clients').select('name').eq('id', request.client_id).maybeSingle()
      : { data: null }

    const formatRule =
      field.type === 'formatted'
        ? 'Return simple HTML using only <p>, <h2>, <h3>, <ul>, <ol>, <li>, <strong> and <em> tags. No <html>/<body> wrapper, no markdown, no code fences.'
        : field.type === 'single_line'
          ? 'Return a single short line of plain text (no line breaks, no markdown, no quotes).'
          : 'Return plain text. Paragraphs separated by blank lines are fine. No markdown syntax, no headings.'

    const system = [
      'You write website content for New Zealand school websites on behalf of school staff.',
      'Write in a warm, clear, professional tone suitable for parents and the school community. Use NZ English spelling.',
      `School: ${client?.name ?? 'a New Zealand school'}.`,
      `Content request: "${request.name}". Page: "${page?.name ?? ''}". Section: "${section?.name ?? ''}". Field: "${field.label}".`,
      field.config?.instructions ? `Field instructions from the agency: ${field.config.instructions}` : '',
      'Produce ONLY the content itself — no preamble, no explanation, no sign-off.',
      formatRule,
    ].filter(Boolean).join('\n')

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-8',
        max_tokens: 1024,
        system,
        messages: [{ role: 'user', content: prompt.trim().slice(0, MAX_PROMPT_CHARS) }],
      }),
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      console.error('anthropic_error', res.status, detail)
      return json({ error: 'ai_request_failed' }, 502)
    }
    const msg = await res.json()
    const text = (msg.content ?? [])
      .filter((b: { type: string }) => b.type === 'text')
      .map((b: { text: string }) => b.text)
      .join('')
      .trim()
    if (!text) return json({ error: 'ai_empty_response' }, 502)

    return json({ text })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
