import { corsHeaders, json, preflight } from '../_shared/cors.ts'
import { serviceClient, requestByToken, loadStructure } from '../_shared/supabase.ts'

// GET /client-request?token=...  → request + client + structure + answers (no auth, token-scoped)
Deno.serve(async (req) => {
  const pre = preflight(req)
  if (pre) return pre
  try {
    // Accept token from POST body (functions.invoke) or ?token= query string.
    let token = new URL(req.url).searchParams.get('token') ?? ''
    if (!token && req.method === 'POST') {
      const body = await req.json().catch(() => ({}))
      token = body?.token ?? ''
    }
    const db = serviceClient()
    const request = await requestByToken(db, token)
    if (!request) return json({ error: 'not_found' }, 404)

    const { data: client } = await db
      .from('clients')
      .select('name, contact_name, contact_email')
      .eq('id', request.client_id)
      .maybeSingle()

    const { pages, sections, fields, answers } = await loadStructure(db, request.id)
    const pageIds = new Set(pages.map((p) => p.id))
    const reqSections = sections.filter((s) => pageIds.has(s.page_id))
    const sectionIds = new Set(reqSections.map((s) => s.id))
    const reqFields = fields.filter((f) => sectionIds.has(f.section_id))

    // Only expose what the client needs (hide internal flags).
    return json({
      request: {
        id: request.id,
        name: request.name,
        due_date: request.due_date,
        verify_email: request.verify_email,
      },
      client,
      pages,
      sections: reqSections,
      fields: reqFields,
      answers,
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
