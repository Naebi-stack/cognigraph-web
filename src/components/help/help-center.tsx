'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BookOpen,
  Bug,
  Check,
  HelpCircle,
  LifeBuoy,
  Mail,
  MapPin,
  PlayCircle,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react'
import { useTour } from '@/context/tour-context'
import { useDemoMode } from '@/context/demo-mode-context'
import { TOURS, tourForRoute } from '@/components/tour/tours'

interface MenuItem {
  label: string
  hint?: string
  icon: React.ComponentType<{ className?: string }>
  done?: boolean
  onSelect?: () => void
  href?: string
  /** Rendered greyed-out and inert — the route/feature doesn't exist yet. */
  disabled?: boolean
}

export default function HelpCenter() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const { startTour, continueTour, resumable, completed, hydrated } = useTour()
  const { isDemoMode, enableDemoMode, disableDemoMode } = useDemoMode()

  // Same outside-click pattern as the sidebar profile menu.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  // Close the panel whenever a tour starts, otherwise it covers the spotlight.
  const run = (fn: () => void) => () => {
    setOpen(false)
    fn()
  }

  const pageTour = tourForRoute(pathname)

  const items: MenuItem[] = [
    {
      label: resumable ? 'Continue tour' : 'Take the product tour',
      hint: resumable
        ? `Resume ${TOURS[resumable].label.toLowerCase()} where you left off`
        : 'A 60-second walk through the whole app',
      icon: resumable ? PlayCircle : Sparkles,
      done: completed.includes('main') && !resumable,
      onSelect: run(resumable ? continueTour : () => startTour('main')),
    },
  ]

  // Context-aware: only offer a page tour when its targets are on screen.
  if (pageTour) {
    items.push({
      label: pageTour.label,
      hint: `${pageTour.steps.length} steps on this page`,
      icon: MapPin,
      done: completed.includes(pageTour.key),
      onSelect: run(() => startTour(pageTour.key)),
    })
  }

  items.push({
    label: isDemoMode ? 'Exit demo workspace' : 'Try the demo workspace',
    hint: isDemoMode
      ? 'Switch back to your own research'
      : 'Explore with sample sessions — nothing is saved',
    icon: isDemoMode ? X : LifeBuoy,
    onSelect: run(isDemoMode ? disableDemoMode : enableDemoMode),
  })

  // No /guide or /changelog route exists yet — shown inert rather than as a
  // link that 404s or a button that silently does nothing.
  items.push(
    {
      label: 'User guide',
      hint: 'Coming soon',
      icon: BookOpen,
      disabled: true,
    },
    {
      label: "What's new",
      hint: 'Coming soon',
      icon: Sparkles,
      disabled: true,
    },
    {
      label: 'Contact support',
      icon: Mail,
      href: 'mailto:support@cognigraph.app',
    },
    {
      label: 'Report an issue',
      icon: Bug,
      href: 'mailto:support@cognigraph.app?subject=Issue%20report',
    },
  )

  const itemClasses =
    'flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-surface-hover'

  return (
    <div ref={panelRef} className="fixed bottom-5 right-5 z-40">
      {open && (
        <div className="mb-3 w-80 overflow-hidden rounded-xl border border-border bg-surface shadow-2xl">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-text">Help &amp; onboarding</p>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close help"
              className="rounded-md p-1 text-text-muted transition hover:bg-surface-hover hover:text-text"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-[70vh] space-y-0.5 overflow-y-auto p-2">
            {items.map((item) => {
              const Icon = item.icon
              const inner = (
                <>
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-text-muted" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="text-sm text-text">{item.label}</span>
                      {/* `hydrated` gate: completion comes from localStorage, so
                          rendering the check during SSR would mismatch. */}
                      {hydrated && item.done && (
                        <Check className="h-3.5 w-3.5 shrink-0 text-signature" />
                      )}
                    </span>
                    {item.hint && (
                      <span className="mt-0.5 block text-xs text-text-muted">
                        {item.hint}
                      </span>
                    )}
                  </span>
                </>
              )

              if (item.disabled) {
                return (
                  <div
                    key={item.label}
                    aria-disabled
                    className="flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left opacity-45"
                  >
                    {inner}
                  </div>
                )
              }

              if (item.href) {
                const external = item.href.startsWith('mailto:')
                return external ? (
                  <a
                    key={item.label}
                    href={item.href}
                    className={itemClasses}
                    onClick={() => setOpen(false)}
                  >
                    {inner}
                  </a>
                ) : (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={itemClasses}
                    onClick={() => setOpen(false)}
                  >
                    {inner}
                  </Link>
                )
              }

              return (
                <button key={item.label} onClick={item.onSelect} className={itemClasses}>
                  {inner}
                </button>
              )
            })}
          </div>

          <div className="border-t border-border px-2 py-2">
            <Link
              href="/settings#onboarding"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-xs text-text-muted transition hover:bg-surface-hover hover:text-text"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset onboarding in Settings
            </Link>
          </div>
        </div>
      )}

      <button
        id="tour-help-launcher"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={open ? 'Close help' : 'Open help'}
        aria-expanded={open}
        className="ml-auto flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface text-text-muted shadow-lg transition hover:border-accent hover:text-accent"
      >
        {open ? <X className="h-5 w-5" /> : <HelpCircle className="h-5 w-5" />}
      </button>
    </div>
  )
}
