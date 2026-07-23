'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

export type CitationStyle = 'apa' | 'mla' | 'chicago'

interface LibraryStyleContextValue {
  style: CitationStyle
  setStyle: (s: CitationStyle) => void
}

const LibraryStyleContext = createContext<LibraryStyleContextValue | undefined>(
  undefined
)

export function LibraryStyleProvider({ children }: { children: ReactNode }) {
  const [style, setStyle] = useState<CitationStyle>('apa')
  return (
    <LibraryStyleContext.Provider value={{ style, setStyle }}>
      {children}
    </LibraryStyleContext.Provider>
  )
}

export function useLibraryStyle() {
  const ctx = useContext(LibraryStyleContext)
  if (!ctx) {
    throw new Error('useLibraryStyle must be used within LibraryStyleProvider')
  }
  return ctx
}