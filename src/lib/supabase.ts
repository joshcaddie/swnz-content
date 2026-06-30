import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  // Surface misconfiguration early rather than failing on the first query.
  console.error(
    'Missing Supabase env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY ' +
      '(.env.local for dev, Render env vars for prod).',
  )
}

export const supabase = createClient<Database>(url ?? '', anonKey ?? '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

/** Base URL for invoking Edge Functions (client portal API, email). */
export const functionsUrl = `${url ?? ''}/functions/v1`
