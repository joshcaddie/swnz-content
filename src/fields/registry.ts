import type { FieldType } from '../lib/database.types'

export interface FieldTypeMeta {
  type: FieldType
  label: string
  icon: string
  group: 'COMMON FIELDS' | 'VALIDATION FIELDS' | 'SELECTION FIELDS' | 'SPECIAL FIELDS' | 'UI FIELDS'
  /** UI-only fields (heading/description/divider) collect no answer. */
  display?: boolean
  /** Fields backed by file uploads. */
  upload?: boolean
}

export const FIELD_TYPES: FieldTypeMeta[] = [
  { type: 'single_line', label: 'Single Line Text', icon: 'Aa', group: 'COMMON FIELDS' },
  { type: 'multiline', label: 'Multiline Text', icon: '≣', group: 'COMMON FIELDS' },
  { type: 'formatted', label: 'Formatted Text', icon: '✎', group: 'COMMON FIELDS' },
  { type: 'image', label: 'Image(s) Upload', icon: '🖼', group: 'COMMON FIELDS', upload: true },
  { type: 'file', label: 'File(s) Upload', icon: '🗎', group: 'COMMON FIELDS', upload: true },

  { type: 'email', label: 'Email', icon: '✉', group: 'VALIDATION FIELDS' },
  { type: 'address', label: 'Address', icon: '📍', group: 'VALIDATION FIELDS' },
  { type: 'url', label: 'URL', icon: '🔗', group: 'VALIDATION FIELDS' },
  { type: 'number', label: 'Number', icon: '#', group: 'VALIDATION FIELDS' },
  { type: 'phone', label: 'Phone', icon: '☎', group: 'VALIDATION FIELDS' },
  { type: 'currency', label: 'Currency', icon: '$', group: 'VALIDATION FIELDS' },
  { type: 'country', label: 'Country', icon: '🌐', group: 'VALIDATION FIELDS' },
  { type: 'datetime', label: 'Date/Time', icon: '📅', group: 'VALIDATION FIELDS' },
  { type: 'date_range', label: 'Date Range', icon: '📆', group: 'VALIDATION FIELDS' },

  { type: 'checkbox', label: 'Checkbox', icon: '☑', group: 'SELECTION FIELDS' },
  { type: 'single_choice', label: 'Single Choice', icon: '◉', group: 'SELECTION FIELDS' },
  { type: 'dropdown', label: 'Dropdown', icon: '▾', group: 'SELECTION FIELDS' },
  { type: 'image_choice', label: 'Image Choice', icon: '🖼', group: 'SELECTION FIELDS' },
  { type: 'numeric_rating', label: 'Numeric Rating', icon: '5', group: 'SELECTION FIELDS' },
  { type: 'star_rating', label: 'Star Rating', icon: '★', group: 'SELECTION FIELDS' },

  { type: 'table', label: 'Table', icon: '▦', group: 'SPECIAL FIELDS' },
  { type: 'signature', label: 'Signature', icon: '✍', group: 'SPECIAL FIELDS' },
  { type: 'task_list', label: 'Task List', icon: '☑', group: 'SPECIAL FIELDS' },
  { type: 'kyc_aml', label: 'KYC / AML', icon: '🪪', group: 'SPECIAL FIELDS' },
  { type: 'abn_acn', label: 'Australian ABN/ACN', icon: '💼', group: 'SPECIAL FIELDS' },

  { type: 'heading', label: 'Heading', icon: 'H', group: 'UI FIELDS', display: true },
  { type: 'description', label: 'Description', icon: '¶', group: 'UI FIELDS', display: true },
  { type: 'divider', label: 'Divider', icon: '―', group: 'UI FIELDS', display: true },
]

export const FIELD_META: Record<string, FieldTypeMeta> = Object.fromEntries(
  FIELD_TYPES.map((f) => [f.type, f]),
)

export const FIELD_GROUPS = ['COMMON FIELDS', 'VALIDATION FIELDS', 'SELECTION FIELDS', 'SPECIAL FIELDS', 'UI FIELDS'] as const

export function iconFor(type: FieldType): string {
  return FIELD_META[type]?.icon ?? '▭'
}
export function isDisplayField(type: FieldType): boolean {
  return !!FIELD_META[type]?.display
}
