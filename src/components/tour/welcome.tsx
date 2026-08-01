'use client'

import { useEffect } from 'react'
import { ArrowRight, FlaskConical, Sparkles } from 'lucide-react'
import { useTour } from '@/context/tour-context'
import { useDemoMode } from '@/context/demo-mode-context'

/**
 * First-run welcome card. Rendered from the app layout so it appears on
 * whichever page the user lands on, and gated on `showWelcome` from the tour
 * context (a single localStorage flag) rather than on tour completion — the
 * old gate meant skipping the tour re-showed this modal on every visit.
 */
export default function Welcome() {
  const { showWelcome, hydrated, dismissWelcome, startTour } = useTour()
  const { enableDemoMode } = useDemoMode()

  const visible = hydrated && showWelcome

  // Don't let the page behind the modal scroll under it.
  useEffect(() => {
    if (!visible) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [visible])

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-8 shadow-2xl">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.svg" alt="" className="h-8 w-8" />
          <h1 id="welcome-title" className="text-xl font-semibold text-text">
            Welcome to Cogni<span className="text-accent">Graph</span>
          </h1>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-text-muted">
          CogniGraph is a research agent, not a search box. Give it a question
          and it plans its own searches, reads the sources, critiques its
          draft, and runs another round until the answer holds up.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-text-muted">
          You get a cited report plus a reference library you can export. Pick
          where you&apos;d like to start:
        </p>

        <div className="mt-7 space-y-2">
          <button
            onClick={() => {
              dismissWelcome()
              // Deferred a frame: the modal unmounts first, so Joyride
              // measures the real sidebar instead of the overlay.
              requestAnimationFrame(() => startTour('main'))
            }}
            className="flex w-full items-center gap-3 rounded-xl bg-accent px-4 py-3 text-left text-white transition hover:bg-accent-hover"
          >
            <Sparkles className="h-5 w-5 shrink-0" />
            <span className="flex-1">
              <span className="block text-sm font-medium">Start the tour</span>
              <span className="block text-xs text-white/75">
                60 seconds, 7 stops
              </span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0" />
          </button>

          <button
            onClick={() => {
              dismissWelcome()
              enableDemoMode()
            }}
            className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface-hover px-4 py-3 text-left transition hover:border-accent"
          >
            <FlaskConical className="h-5 w-5 shrink-0 text-signature" />
            <span className="flex-1">
              <span className="block text-sm font-medium text-text">
                Try the demo workspace
              </span>
              <span className="block text-xs text-text-muted">
                Sample sessions and sources — nothing is saved
              </span>
            </span>
          </button>

          <button
            onClick={dismissWelcome}
            className="w-full rounded-xl px-4 py-2.5 text-sm text-text-muted transition hover:text-text"
          >
            Skip for now
          </button>
        </div>

        <p className="mt-5 text-center text-xs text-text-muted">
          You can reopen the tour any time from the help button, bottom-right.
        </p>
      </div>
    </div>
  )
}
