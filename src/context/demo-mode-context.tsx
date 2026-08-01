'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import {
  getServerSnapshot,
  getSnapshot,
  setDemoMode,
  subscribe,
} from '@/lib/onboarding-store'

interface DemoModeContextValue {
  isDemoMode: boolean
  /**
   * False during SSR and the first paint. Pages must wait for this before
   * choosing between demo data and the API, or demo users get a flash of
   * their real dashboard.
   */
  hydrated: boolean
  enableDemoMode: () => void
  disableDemoMode: () => void
}

const DemoModeContext = createContext<DemoModeContextValue | undefined>(undefined)

export function DemoModeProvider({ children }: { children: ReactNode }) {
  // Backed by localStorage, so demo mode survives navigation and reloads —
  // it previously lived in state only and silently switched itself off.
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const enableDemoMode = useCallback(() => setDemoMode(true), [])
  const disableDemoMode = useCallback(() => setDemoMode(false), [])

  const value = useMemo<DemoModeContextValue>(
    () => ({
      isDemoMode: snapshot.demoMode,
      hydrated: snapshot.hydrated,
      enableDemoMode,
      disableDemoMode,
    }),
    [snapshot.demoMode, snapshot.hydrated, enableDemoMode, disableDemoMode],
  )

  return (
    <DemoModeContext.Provider value={value}>{children}</DemoModeContext.Provider>
  )
}

export function useDemoMode() {
  const context = useContext(DemoModeContext)
  if (!context) {
    throw new Error('useDemoMode must be used within a DemoModeProvider')
  }
  return context
}
