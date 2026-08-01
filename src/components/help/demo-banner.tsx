'use client'

import { FlaskConical, X } from 'lucide-react'
import { useDemoMode } from '@/context/demo-mode-context'

/**
 * Demo mode replaces API data with samples, which is confusing without a
 * visible marker and an obvious way out — previously the only exit was
 * clearing state by reloading.
 */
export default function DemoBanner() {
  const { isDemoMode, hydrated, disableDemoMode } = useDemoMode()

  if (!hydrated || !isDemoMode) return null

  return (
    <div className="flex items-center gap-3 border-b border-signature/30 bg-signature/10 px-4 py-2">
      <FlaskConical className="h-4 w-4 shrink-0 text-signature" />
      <p className="flex-1 text-xs text-text">
        <span className="font-medium text-signature">Demo workspace</span> —
        you&apos;re looking at sample research. Nothing here is saved and your
        own data is untouched.
      </p>
      <button
        onClick={disableDemoMode}
        className="flex shrink-0 items-center gap-1.5 rounded-md border border-signature/40 px-2.5 py-1 text-xs font-medium text-signature transition hover:bg-signature/15"
      >
        <X className="h-3 w-3" />
        Exit demo
      </button>
    </div>
  )
}
