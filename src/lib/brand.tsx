import { createContext, useContext, useState, type ReactNode } from 'react'
import { BRANDS, brandOf, type Brand, type BrandId } from '../brands'

const KEY = 'swnz-active-brand'

interface BrandState {
  /** null until the user has picked a dashboard. */
  brandId: BrandId | null
  /** Resolved brand (defaults to swnz while unset so components can render safely). */
  brand: Brand
  setBrandId: (id: BrandId) => void
  /** Back to the chooser screen. */
  clearBrand: () => void
}

const BrandContext = createContext<BrandState | undefined>(undefined)

function stored(): BrandId | null {
  const v = localStorage.getItem(KEY)
  return v === 'swnz' || v === 'caddie' ? v : null
}

export function BrandProvider({ children }: { children: ReactNode }) {
  const [brandId, setId] = useState<BrandId | null>(stored)
  const setBrandId = (id: BrandId) => {
    localStorage.setItem(KEY, id)
    setId(id)
  }
  const clearBrand = () => {
    localStorage.removeItem(KEY)
    setId(null)
  }
  return (
    <BrandContext.Provider value={{ brandId, brand: brandOf(brandId), setBrandId, clearBrand }}>
      {children}
    </BrandContext.Provider>
  )
}

export function useBrand(): BrandState {
  const ctx = useContext(BrandContext)
  if (!ctx) throw new Error('useBrand outside BrandProvider')
  return ctx
}

export { BRANDS }
