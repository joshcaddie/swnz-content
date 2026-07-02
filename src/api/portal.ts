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
  await portalRecordUpload(token, fieldId, {
    path,
    filename: file.name,
    size: file.size,
    content_type: file.type,
  })
  // Normalized shape stored in the answer value — `path` is what the team download uses.
  return { path, filename: file.name, size: file.size, content_type: file.type }
}

/** Signed download URL for a file this request uploaded (token-validated server-side). */
export async function portalFileUrl(token: string, path: string, filename?: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('client-upload', {
    body: { token, action: 'download', path, filename },
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data.url as string
}

/** Repeatable sections: ask the server to clone the section's fields for another response. */
export async function portalRepeatSection(token: string, sectionId: string) {
  const { data, error } = await supabase.functions.invoke('client-answer', {
    body: { token, action: 'repeat_section', section_id: sectionId },
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
}

/** Ask the AI to draft content for a text field. Returns plain text (or simple HTML for formatted fields). */
export async function portalAiGenerate(token: string, fieldId: string, prompt: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('ai-generate', {
    body: { token, field_id: fieldId, prompt },
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data.text as string
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
