import { supabase } from '../lib/supabase'

// Team-side email triggers (send-email function requires the caller's JWT).

export async function sendInvite(requestId: string) {
  return supabase.functions.invoke('send-email', { body: { kind: 'invite', requestId } })
}

export async function sendDecision(requestId: string, approved: boolean, note?: string) {
  return supabase.functions.invoke('send-email', {
    body: { kind: 'decision', requestId, approved, note },
  })
}
