import { createContext, useContext } from 'react'
import { useBrandProfile } from './hooks'

const BrandContext = createContext({
  brand: null,
  loading: true,
  refetch: () => {},
})

export function BrandProvider({ children }) {
  const { data, loading, refetch } = useBrandProfile()
  const brand = data?.value ?? null

  return (
    <BrandContext.Provider value={{ brand, loading, refetch }}>
      {children}
    </BrandContext.Provider>
  )
}

export function useBrand() {
  return useContext(BrandContext)
}

// Convenience accessors
export function useBrandSignature() {
  const { brand } = useBrand()
  return brand?.signature ?? {}
}

export function useBrandGuidelines() {
  const { brand } = useBrand()
  return brand?.guidelines ?? {}
}

export function useBrandAssets() {
  const { brand } = useBrand()
  return brand?.assets ?? {}
}

export function useSocialChannels() {
  const { brand } = useBrand()
  return brand?.social_channels ?? {}
}
