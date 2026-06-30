export type Screen = 'board' | 'detail' | 'wizard'
export type Detail = 'oranga' | 'ross'

export type CardMode = 'stats' | 'progress'
export type StatusBadge = 'PUBLISHED' | 'ARCHIVED' | 'OVERDUE' | 'DRAFT'

/** A request card as authored in the static board data. */
export interface RawCard {
  title: string
  initials: string
  owner: string
  mode: CardMode
  extra?: string
  featured?: boolean
  detail?: Detail
  // stats mode
  approved?: number
  complete?: number
  todo?: number
  // progress mode
  pct?: number
  status?: StatusBadge
  due?: string
  overdue?: boolean
}

export interface RawColumn {
  name: string
  count: number
  cards: RawCard[]
}

/** Builder model — pages → sections → fields. */
export interface BuilderField {
  label: string
  icon: string
  tag?: string
}
export interface BuilderSection {
  name: string
  fields: BuilderField[]
}
export interface BuilderPage {
  name: string
  sections: BuilderSection[]
}

export type OptKey = 'instructions' | 'repeatable' | 'conditions'

export interface AppState {
  screen: Screen
  detail: Detail
  qaOpen: boolean
  step: number
  activePage: number
  activeSection: number
  fieldModal: boolean
  opts: Record<OptKey, boolean>
  pages: BuilderPage[]
}
