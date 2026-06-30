import { supabase } from '../lib/supabase'
import type { AnswerRow, RequestFieldRow, RequestPageRow, RequestSectionRow, Json } from '../lib/database.types'

// Client portal talks to Edge Functions (no team auth). functions.invoke attaches the anon key.

export interface PortalData {
  request: { id: string; name: string; due_date: string | null; verify_email: boolean }
  client: { name: string; contact_name: string | null; contact_email: string | null } | null
  pages: RequestPageRow[]
  sections: RequestSectionRow[]
  fields: RequestFieldRow[]
  answers: AnswerRow[]
}

export async function portalLoad(token: string): Promise<PortalData> {
  const { data, error } = await supabase.functions.invoke('client-request', { body: { token } })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data as PortalData
}

export async function portalSave(
  token: string,
  answers: { field_id: string; value: Json }[],
  submit: boolean,
): Promise<void> {
  const { data, error } = await supabase.functions.invoke('client-answer', {
    body: { token, answers, submit },
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
}

export async function portalSignUpload(token: string, fieldId: string, filename: string) {
  const { data, error } = await supabase.functions.invoke('client-upload', {
    body: { token, action: 'sign', field_id: fieldId, filename },
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data as { path: string; signedUrl: string; signToken: string }
}

export async function portalRecordUpload(
  token: string,
  fieldId: string,
  meta: { path: string; filename: string; size: number; content_type: string },
) {
  const { data, error } = await supabase.functions.invoke('client-upload', {
    body: { token, action: 'record', field_id: fieldId, ...meta },
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data.file
}

/** Upload a file through a signed URL, then record it against the answer. */
export async function portalUploadFile(token: string, fieldId: string, file: File) {
  const { path, signToken } = await portalSignUpload(token, fieldId, file.name)
  const { error } = await supabase.storage.from('uploads').uploadToSignedUrl(path, signToken, file)
  if (error) throw error
  return portalRecordUpload(token, fieldId, {
    path,
    filename: file.name,
    size: file.size,
    content_type: file.type,
  })
}

export async function portalVerifySend(token: string) {
  const { data, error } = await supabase.functions.invoke('client-verify', { body: { token, action: 'send' } })
  if (error) throw error
  return data as { ok: boolean; sentTo?: string; error?: string }
}

export async function portalVerifyCheck(token: string, code: string) {
  const { data, error } = await supabase.functions.invoke('client-verify', {
    body: { token, action: 'check', code },
  })
  if (error) throw error
  return data as { ok: boolean }
}
