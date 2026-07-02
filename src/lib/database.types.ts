// Hand-maintained to match supabase/migrations. Keep in sync with the SQL schema.
// NOTE: these are `type` aliases (not `interface`) on purpose — supabase-js requires the
// row shapes to satisfy Record<string, unknown>, which interfaces don't implicitly do.

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type AnswerStatus = 'todo' | 'submitted' | 'approved' | 'changes_requested'
export type AuthorType = 'team' | 'client'

/** Field types supported by the builder + portal (must match src/fields registry). */
export type FieldType =
  | 'single_line'
  | 'multiline'
  | 'formatted'
  | 'image'
  | 'file'
  | 'email'
  | 'address'
  | 'url'
  | 'number'
  | 'phone'
  | 'currency'
  | 'country'
  | 'datetime'
  | 'date_range'
  | 'checkbox'
  | 'single_choice'
  | 'dropdown'
  | 'image_choice'
  | 'numeric_rating'
  | 'star_rating'
  | 'table'
  | 'signature'
  | 'task_list'
  | 'kyc_aml'
  | 'abn_acn'
  | 'heading'
  | 'description'
  | 'divider'

export type FieldConfig = {
  options?: string[]
  required?: boolean
  multi?: boolean
  maxFiles?: number
  helpText?: string
  max?: number
  instructions?: string
  internalOnly?: boolean
  placeholder?: string
  conditions?: boolean
  /** Stable identity for cross-field references (conditions). Falls back to the DB row id. */
  key?: string
  /** Show this field only when the referenced field's answer equals the given value. */
  condition?: { whenKey: string; equals: string }
  /** Marks a field created by a client "add another" repeat (hidden from base clone set). */
  _rep?: number
  [key: string]: Json | undefined
}

/** A page/section/field tree stored on templates and cloned into requests. */
export type StructureField = {
  type: FieldType
  label: string
  tag?: string
  config?: FieldConfig
}
export type StructureSection = {
  name: string
  instructions?: string | null
  repeatable?: boolean
  conditions?: boolean
  fields: StructureField[]
}
export type StructurePage = {
  name: string
  /** 0 = top-level page, 1 = sub-page indented under the nearest top-level page above it. */
  indent?: number
  /** Navigation label only — no content is collected for this page. */
  navOnly?: boolean
  sections: StructureSection[]
}
export type Structure = {
  pages: StructurePage[]
}

export type ProfileRow = {
  id: string
  name: string
  email: string
  avatar_color: string
  role: string
  invite_pending?: boolean
  created_at: string
}
export type ClientRow = {
  id: string
  name: string
  contact_name: string | null
  contact_email: string | null
  brand?: string
  color: string
  created_by: string | null
  created_at: string
  updated_at: string
}
export type StageRow = {
  id: string
  name: string
  position: number
  created_at: string
}
export type TemplateRow = {
  id: string
  name: string
  description: string | null
  brand?: string
  structure: Structure
  created_by: string | null
  created_at: string
  updated_at: string
}
export type RequestRow = {
  id: string
  name: string
  client_id: string | null
  stage_id: string | null
  owner_id: string | null
  owner_name: string | null
  owner_initials: string | null
  owner_color: string | null
  due_date: string | null
  folder: string
  status_badge: string | null
  reminders_enabled: boolean
  verify_email: boolean
  public_token: string
  brand?: string
  position: number
  created_at: string
  updated_at: string
}
export type RequestPageRow = {
  id: string
  request_id: string
  name: string
  position: number
  indent?: number
  nav_only?: boolean
}
export type RequestSectionRow = {
  id: string
  page_id: string
  name: string
  instructions: string | null
  repeatable: boolean
  conditions: boolean
  position: number
}
export type RequestFieldRow = {
  id: string
  section_id: string
  type: FieldType
  label: string
  config: FieldConfig
  tag: string | null
  position: number
}
export type AnswerRow = {
  id: string
  request_id: string
  field_id: string
  value: Json
  status: AnswerStatus
  submitted_at: string | null
  approved_at: string | null
  updated_at: string
}
export type AnswerFileRow = {
  id: string
  answer_id: string
  storage_path: string
  filename: string
  size: number
  content_type: string | null
  created_at: string
}
export type CommentRow = {
  id: string
  request_id: string
  field_id: string | null
  author_type: AuthorType
  author_id: string | null
  author_name: string | null
  body: string
  created_at: string
}

type TableDef<R> = {
  Row: R
  Insert: Partial<R>
  Update: Partial<R>
  Relationships: []
}

export type Database = {
  public: {
    Tables: {
      profiles: TableDef<ProfileRow>
      clients: TableDef<ClientRow>
      stages: TableDef<StageRow>
      templates: TableDef<TemplateRow>
      requests: TableDef<RequestRow>
      request_pages: TableDef<RequestPageRow>
      request_sections: TableDef<RequestSectionRow>
      request_fields: TableDef<RequestFieldRow>
      answers: TableDef<AnswerRow>
      answer_files: TableDef<AnswerFileRow>
      comments: TableDef<CommentRow>
    }
    Views: {
      request_progress: {
        Row: {
          request_id: string
          total: number
          approved: number
          submitted: number
          changes_requested: number
          answered: number
        }
        Relationships: []
      }
    }
    Functions: {
      create_request: {
        Args: {
          p_name: string
          p_client: string | null
          p_stage: string | null
          p_due: string | null
          p_folder: string
          p_structure: Json
        }
        Returns: string
      }
      request_structure: {
        Args: { p_request: string }
        Returns: Json
      }
    }
    Enums: {
      answer_status: AnswerStatus
      author_type: AuthorType
    }
    CompositeTypes: Record<string, never>
  }
}
