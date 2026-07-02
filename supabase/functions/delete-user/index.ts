import { json, preflight } from '../_shared/cors.ts'
import { serviceClient } from '../_shared/supabase.ts'

// POST /delete-user  { user_id } — requires a valid team JWT (verify_jwt ON).
// Removes the auth user; the profile row cascades and their requests become unassigned.
// You cannot delete your own account.
Deno.serve(async (req) => {
  const pre = preflight(req)
  if (pre) return pre
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)
  const authz = req.headers.get('Authorization') ?? ''
  if (!authz.toLowerCase().startsWith('bearer ')) return json({ error: 'unauthorized' }, 401)

  try {
    const { user_id } = await req.json()
    if (!user_id || typeof user_id !== 'string') return json({ error: 'user_id_required' }, 400)

    const db = serviceClient()
    const { data: caller, error: callerErr } = await db.auth.getUser(authz.slice(7))
    if (callerErr || !caller?.user) return json({ error: 'unauthorized' }, 401)
    if (caller.user.id === user_id) return json({ error: 'cannot_delete_yourself' }, 400)

    const { error } = await db.auth.admin.deleteUser(user_id)
    if (error) return json({ error: error.message }, 500)
    return json({ ok: true })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
