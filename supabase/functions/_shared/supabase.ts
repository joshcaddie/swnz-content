import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2'

/** Service-role client — bypasses RLS. Only ever used server-side in Edge Functions. */
export function serviceClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  )
}

/**
 * Resolve a request by its public token. Returns the request row or null.
 * This is the security boundary for the password-less client portal: every
 * client operation must go through a valid token.
 */
export async function requestByToken(db: SupabaseClient, token: string) {
  if (!token || token.length < 16) return null
  const { data } = await db.from('requests').select('*').eq('public_token', token).maybeSingle()
  return data
}

/** Load the full page→section→field tree + answers for a request, ordered. */
export async function loadStructure(db: SupabaseClient, requestId: string) {
  const [{ data: pages }, { data: sections }, { data: fields }, { data: answers }] =
    await Promise.all([
      db.from('request_pages').select('*').eq('request_id', requestId).order('position'),
      db.from('request_sections').select('*').order('position'),
      db.from('request_fields').select('*').order('position'),
      db.from('answers').select('*').eq('request_id', requestId),
    ])
  return { pages: pages ?? [], sections: sections ?? [], fields: fields ?? [], answers: answers ?? [] }
}
