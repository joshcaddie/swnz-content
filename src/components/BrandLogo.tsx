import type { Brand } from '../brands'

/** Brand logo: the SWNZ icon image, or Caddie's lowercase coral wordmark. */
export function BrandLogo({ brand, size = 48, light = false }: { brand: Brand; size?: number; light?: boolean }) {
  if (brand.logoImg) {
    return <img src={brand.logoImg} alt={brand.short} style={{ width: size, height: size, objectFit: 'contain', flex: 'none' }} />
  }
  return (
    <span style={{ fontWeight: 800, fontSize: size * 0.62, lineHeight: 1, color: light ? '#fff' : brand.accent, letterSpacing: '-0.02em', flex: 'none' }}>
      {brand.logoText}
      <sup style={{ fontSize: '0.45em', fontWeight: 700, marginLeft: 1 }}>©</sup>
    </span>
  )
}
