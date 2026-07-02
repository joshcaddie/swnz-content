import { C } from './theme'

// The two agency brands the tool serves. Everything client-facing (clients,
// requests, templates, portal, emails) belongs to exactly one brand.

export type BrandId = 'swnz' | 'caddie'

export interface Brand {
  id: BrandId
  name: string
  short: string
  tagline: string | null
  /** Thin gradient strip at the very top. */
  bar: string
  /** Header / top-chrome background. */
  topBar: string
  accent: string
  accentBright: string
  /** Primary button gradient. */
  gradient: string
  /** Solid primary button colour (portal submit etc.). */
  buttonBg: string
  /** Board card gradient. */
  cardGradient: string
  /** Image logo (public path), or null to render the text logo. */
  logoImg: string | null
  logoText: string | null
}

export const BRANDS: Record<BrandId, Brand> = {
  swnz: {
    id: 'swnz',
    name: 'School Websites New Zealand',
    short: 'School Websites',
    tagline: null,
    bar: C.brandBar,
    topBar: C.navy,
    accent: C.cyan,
    accentBright: C.cyanBright,
    gradient: C.gradient,
    buttonBg: C.navy2,
    cardGradient: C.gradientCard,
    logoImg: '/assets/swnz-icon.png',
    logoText: null,
  },
  caddie: {
    id: 'caddie',
    name: 'Caddie Digital',
    short: 'Caddie',
    tagline: 'mastering digital together',
    bar: 'linear-gradient(90deg,#f0503c 0%,#f57a3d 100%)',
    topBar: '#26222b',
    accent: '#f0503c',
    accentBright: '#ff6a55',
    gradient: 'linear-gradient(135deg,#f0503c,#f57a3d)',
    buttonBg: '#f0503c',
    cardGradient: 'linear-gradient(150deg,#f0503c 0%,#f26a3d 55%,#f5883d 100%)',
    logoImg: null,
    logoText: 'caddie',
  },
}

export function brandOf(id: string | null | undefined): Brand {
  return BRANDS[(id as BrandId) ?? 'swnz'] ?? BRANDS.swnz
}

export function otherBrand(id: BrandId): Brand {
  return id === 'swnz' ? BRANDS.caddie : BRANDS.swnz
}
