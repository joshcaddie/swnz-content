import type { RawColumn, StatusBadge } from './types'

/** Avatar background colour keyed by owner initials (ported from prototype). */
const AVATAR_BG: Record<string, string> = {
  JH: '#f2c94c', BL: '#86d29a', KG: '#9fb6e6', CK: '#5fd0c0', FY: '#5cd1b8',
  F: '#f49ac1', D: '#f2c94c', TD: '#9fb6e6', RM: '#5fd0c0', SH: '#f49ac1',
  CH: '#9fb6e6', JL: '#c9a8e9', LB: '#9fb6e6', SK: '#5fd0c0', PP: '#7fd6a0',
}
export const avatarBgFor = (initials: string): string => AVATAR_BG[initials] || '#cfd2dd'

const BADGE: Record<string, { bg: string; color: string }> = {
  PUBLISHED: { bg: '#dbe6f6', color: '#5570a0' },
  ARCHIVED: { bg: '#dbe6f6', color: '#5570a0' },
  OVERDUE: { bg: '#f7d9d0', color: '#c9491f' },
  DRAFT: { bg: '#e3e2e7', color: '#6b6675' },
}
export const badgeFor = (type?: StatusBadge) =>
  (type && BADGE[type]) || { bg: '#e3e2e7', color: '#6b6675' }

export const COLUMNS: RawColumn[] = [
  {
    name: 'Unassigned', count: 1, cards: [
      { title: 'Greytown School - inner pa…', initials: 'JH', owner: 'Jody Hart', mode: 'progress', pct: 0, status: 'PUBLISHED', due: '12/07/2026' },
    ],
  },
  {
    name: 'Home page', count: 9, cards: [
      { title: 'Oranga School - Design brief', initials: 'BL', owner: 'Bridget Lummis', featured: true, mode: 'stats', approved: 0, complete: 1, todo: 10, detail: 'oranga' },
      { title: 'Patumahoe School - Design …', initials: 'KG', owner: 'Keryn Grey', mode: 'progress', pct: 0, status: 'OVERDUE', due: '23/06/2026', overdue: true },
      { title: 'Hingaia Peninsula School - …', initials: 'CK', owner: 'Carly Kidd', featured: true, mode: 'stats', approved: 0, complete: 5, todo: 6 },
      { title: 'Hamilton West School Web…', initials: 'FY', owner: 'Frank Young', featured: true, mode: 'stats', approved: 0, complete: 5, todo: 3 },
    ],
  },
  {
    name: 'In Design', count: 5, cards: [
      { title: 'Greytown School - Design b…', initials: 'JH', owner: 'Jody Hart', mode: 'progress', pct: 100, status: 'ARCHIVED', due: '02/07/2026' },
      { title: 'TKKM o Te Wānanga Whare …', initials: 'F', owner: 'Fleur', mode: 'stats', approved: 0, complete: 11, todo: 0 },
      { title: 'Waitutu Holdings Website d…', initials: 'D', owner: 'Daniel', mode: 'progress', pct: 100, status: 'ARCHIVED', due: '11/02/2026' },
      { title: 'Pinehill School - Redesign', initials: 'TD', owner: 'Tracey Danks', mode: 'progress', pct: 100, status: 'ARCHIVED', due: '07/06/2026' },
    ],
  },
  {
    name: 'Inner page awaiting', count: 15, cards: [
      { title: 'Core Foundations - inner pa…', initials: 'RM', owner: 'Rebecca McLeod', mode: 'progress', pct: 0, status: 'PUBLISHED', due: '08/07/2026' },
      { title: 'Henderson Intermediate Sc…', initials: 'SH', owner: 'Shania Hammon', mode: 'progress', pct: 0, status: 'OVERDUE', due: '28/06/2026', overdue: true },
      { title: 'Rapaura School - inner pag…', initials: 'CH', owner: 'Carey Huria', featured: true, mode: 'stats', approved: 0, complete: 3, todo: 101 },
      { title: 'Ross School - inner pages c…', initials: 'JL', owner: 'Jodie Linklater', featured: true, mode: 'stats', approved: 0, complete: 12, todo: 36, detail: 'ross' },
    ],
  },
  {
    name: 'In development', count: 7, cards: [
      { title: 'Te Mataitihi School - inner p…', initials: 'LB', owner: 'Linda Baran', extra: '+ 2 more', featured: true, mode: 'stats', approved: 0, complete: 58, todo: 0 },
      { title: 'Te Kura Kaupapa Māori o T…', initials: 'SK', owner: 'Sophie Kamariera', mode: 'progress', pct: 100, status: 'DRAFT', due: '10/12/2025' },
      { title: "St Anthony's School - inner …", initials: 'PP', owner: 'Peta-Maree Parsonage', mode: 'progress', pct: 19, status: 'ARCHIVED', due: '11/03/2026' },
      { title: 'St Josephs Hawera - inner p…', initials: 'TD', owner: 'Tracey Drought', mode: 'progress', pct: 23, status: 'ARCHIVED', due: '18/03/2025' },
    ],
  },
]

export interface GalleryCat { name: string; dot: string }
export const GALLERY_CATS: GalleryCat[] = [
  { name: 'My Templates', dot: '#5fd0c0' }, { name: 'Accounting', dot: '#f4a261' },
  { name: 'Bookkeeping', dot: '#9bc6e8' }, { name: 'Coaching/Consulting', dot: '#f2c94c' },
  { name: 'Design', dot: '#5cc8e8' }, { name: 'Education', dot: '#1d2b46' },
  { name: 'Events', dot: '#c9a8e9' }, { name: 'Financial Planning', dot: '#3a2a52' },
  { name: 'General', dot: '#7b3fb5' }, { name: 'Human Resources', dot: '#1a1330' },
  { name: 'Insurance', dot: '#9bc6e8' }, { name: 'Legal', dot: '#e3d4cb' },
  { name: 'Marketing', dot: '#d6e84a' }, { name: 'Mortgage & Financing', dot: '#e07a3a' },
  { name: 'Real Estate', dot: '#e34f3a' },
]

export interface MyTemplate { title: string; desc: string; date: string }
export const MY_TEMPLATES: MyTemplate[] = [
  { title: 'School-Name - Design brief', desc: 'No description provided.', date: '03/12/2024' },
  { title: 'SchoolName - inner pages content', desc: 'No description provided.', date: '18/08/2021' },
  { title: 'redesign', desc: 'No description provided.', date: '04/12/2023' },
]

export interface AcctTemplate { title: string; icon: string; iconBg: string; desc: string }
export const ACCT_TEMPLATES: AcctTemplate[] = [
  { title: 'AML/CTF - Accounting Client Onboarding (Individual)', icon: '💳', iconBg: '#fdebd8', desc: 'Update for Tranche 2 AML and geared towards Australian accountants, this form will help facilitate an easy onboarding process for your individual…' },
  { title: 'AML/CTF - Accounting Client Onboarding - Business (AUS)', icon: '✒️', iconBg: '#fde0db', desc: 'Updated for Tranche 2 AML and geared towards Australian accountants, this form will help facilitate an easy onboarding process for your business…' },
  { title: 'ATO Client-agent Linking', icon: '🏠', iconBg: '#fde0db', desc: 'This template walks clients through the steps to link you as their authorised agent using myID, the Relationship Authorisation Manager (RAM) and Online services for business.' },
]

export interface FieldType { type: string; icon: string }
export interface FieldGroup { group: string; items: FieldType[] }
export const FIELD_GROUPS: FieldGroup[] = [
  { group: 'COMMON FIELDS', items: [
    { type: 'Single Line Text', icon: 'Aa' }, { type: 'Multiline Text', icon: '≣' },
    { type: 'Formatted Text', icon: '✎' }, { type: 'Image(s) Upload', icon: '🖼' }, { type: 'File(s) Upload', icon: '🗎' },
  ] },
  { group: 'VALIDATION FIELDS', items: [
    { type: 'Email', icon: '✉' }, { type: 'Address', icon: '📍' }, { type: 'URL', icon: '🔗' },
    { type: 'Number', icon: '#' }, { type: 'Phone', icon: '☎' }, { type: 'Currency', icon: '$' },
    { type: 'Country', icon: '🌐' }, { type: 'Date/Time', icon: '📅' }, { type: 'Date Range', icon: '📆' },
  ] },
  { group: 'SELECTION FIELDS', items: [
    { type: 'Checkbox', icon: '☑' }, { type: 'Single Choice', icon: '◉' }, { type: 'Dropdown', icon: '▾' },
    { type: 'Image Choice', icon: '🖼' }, { type: 'Numeric Rating', icon: '5' }, { type: 'Star Rating', icon: '★' },
  ] },
  { group: 'SPECIAL FIELDS', items: [
    { type: 'Table', icon: '▦' }, { type: 'Signature', icon: '✍' }, { type: 'Task List', icon: '☑' },
    { type: 'KYC / AML', icon: '🪪' }, { type: 'Australian ABN/ACN', icon: '💼' },
  ] },
  { group: 'UI FIELDS', items: [
    { type: 'Heading', icon: 'H' }, { type: 'Description', icon: '¶' }, { type: 'Divider', icon: '―' },
  ] },
]

export const WIZARD_STEPS = ['Templates', 'Essentials', 'Builder', 'Preview', 'Finalize']
export const BUILDER_TITLE = 'SchoolName - inner pages content'
