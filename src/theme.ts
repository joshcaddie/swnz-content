// SWNZ brand tokens — single source of truth for the look.
export const C = {
  navy: '#16294a',
  navy2: '#1d3a5f',
  cyan: '#1493d6',
  cyanBright: '#2fb3e8',
  bg: '#eef0f3',
  panel: '#f3f3f6',
  ink: '#2b2535',
  inkDark: '#241d33',
  muted: '#8b8595',
  muted2: '#9b95a5',
  line: '#e6e5ec',
  gradient: 'linear-gradient(135deg,#1ed79a,#1ba0e6)',
  gradientCard: 'linear-gradient(150deg,#1ec98f 0%,#17a7c4 50%,#1b8fe0 100%)',
  brandBar: 'linear-gradient(90deg,#1ed79a 0%,#19c2c0 45%,#1ba0e6 100%)',
  green: '#28b463',
}

export const badgeStyles: Record<string, { bg: string; color: string }> = {
  PUBLISHED: { bg: '#dbe6f6', color: '#5570a0' },
  ARCHIVED: { bg: '#dbe6f6', color: '#5570a0' },
  OVERDUE: { bg: '#f7d9d0', color: '#c9491f' },
  DRAFT: { bg: '#e3e2e7', color: '#6b6675' },
  ACTIVE: { bg: '#dbe6f6', color: '#5570a0' },
}

/** DD/MM/YYYY from an ISO date (or '' if null). */
export function formatDate(iso: string | null): string {
  if (!iso) return ''
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}
