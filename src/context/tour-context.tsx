'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import type { Step } from 'react-joyride'
import { TOURS, type TourKey } from '@/components/tour/tours'
import {
  completeTour,
  getServerSnapshot,
  getSnapshot,
  resetOnboarding as resetStore,
  setLastTour,
  setTourProgress,
  setWelcomeSeen,
  subscribe,
  type TourProgress,
} from '@/lib/onboarding-store'

interface TourContextValue {
  /** Joyride's `run` flag. */
  isTourOpen: boolean
  /** Steps for the running tour, filtered to targets present in the DOM. */
  steps: Step[]
  /** Controlled step index — Joyride only advances when we say so. */
  stepIndex: number
  activeTour: TourKey | null
  /** False during SSR / first paint; gate any localStorage-derived UI on it. */
  hydrated: boolean
  completed: TourKey[]
  progress: TourProgress
  /** A tour left part-way through that can be resumed, if any. */
  resumable: TourKey | null
  /** Whether the first-run welcome modal should show. */
  showWelcome: boolean

  startTour: (key: TourKey, fromStep?: number) => void
  continueTour: () => void
  stopTour: () => void
  setStepIndex: (index: number) => void
  /** Called by <Tour /> after each step so the resume point stays fresh. */
  saveProgress: (index: number) => void
  markCompleted: () => void
  dismissWelcome: () => void
  /** Settings → "Reset onboarding progress". */
  resetOnboarding: () => void
}

const TourContext = createContext<TourContextValue | undefined>(undefined)

/**
 * Joyride aborts the whole tour when a step's target is missing, so a tour is
 * only ever started with the steps whose targets are actually in the DOM.
 * `body` targets (centered cards) always qualify.
 */
function presentSteps(steps: Step[]): Step[] {
  return steps.filter((step) => {
    const { target } = step
    if (typeof target !== 'string') return true
    if (target === 'body') return true
    try {
      return document.querySelector(target) !== null
    } catch {
      return false
    }
  })
}

export function TourProvider({ children }: { children: ReactNode }) {
  // Persisted onboarding facts (completed / progress / welcome) come from the
  // shared store; the running tour itself is ephemeral React state.
  const persisted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const [isTourOpen, setIsTourOpen] = useState(false)
  const [steps, setSteps] = useState<Step[]>([])
  const [stepIndex, setStepIndex] = useState(0)
  const [activeTour, setActiveTour] = useState<TourKey | null>(null)

  const startTour = useCallback((key: TourKey, fromStep = 0) => {
    const definition = TOURS[key]
    if (!definition) return

    const usable = presentSteps(definition.steps)
    if (usable.length === 0) {
      // Wrong route, or the page hasn't rendered its targets yet. Doing
      // nothing beats letting Joyride throw.
      return
    }

    setSteps(usable)
    setStepIndex(Math.min(Math.max(fromStep, 0), usable.length - 1))
    setActiveTour(key)
    setIsTourOpen(true)
    setLastTour(key)
  }, [])

  const stopTour = useCallback(() => {
    setIsTourOpen(false)
    setActiveTour(null)
  }, [])

  /**
   * Resumable = started, left before the final step, never completed. When
   * null the Help Center offers "Take the product tour" instead of "Continue".
   */
  const resumable = useMemo<TourKey | null>(() => {
    const candidate = persisted.lastTour
    if (!candidate || !TOURS[candidate]) return null
    if (persisted.completed.includes(candidate)) return null
    const at = persisted.progress[candidate]
    if (at === undefined) return null
    return at < TOURS[candidate].steps.length - 1 ? candidate : null
  }, [persisted.lastTour, persisted.completed, persisted.progress])

  const continueTour = useCallback(() => {
    if (resumable) {
      startTour(resumable, (persisted.progress[resumable] ?? 0) + 1)
    } else {
      startTour('main', 0)
    }
  }, [resumable, persisted.progress, startTour])

  const saveProgress = useCallback(
    (index: number) => {
      if (activeTour) setTourProgress(activeTour, index)
    },
    [activeTour],
  )

  const markCompleted = useCallback(() => {
    if (activeTour) completeTour(activeTour)
  }, [activeTour])

  const dismissWelcome = useCallback(() => setWelcomeSeen(true), [])

  const value = useMemo<TourContextValue>(
    () => ({
      isTourOpen,
      steps,
      stepIndex,
      activeTour,
      hydrated: persisted.hydrated,
      completed: persisted.completed,
      progress: persisted.progress,
      resumable,
      showWelcome: !persisted.welcomeSeen,
      startTour,
      continueTour,
      stopTour,
      setStepIndex,
      saveProgress,
      markCompleted,
      dismissWelcome,
      resetOnboarding: resetStore,
    }),
    [
      isTourOpen,
      steps,
      stepIndex,
      activeTour,
      persisted.hydrated,
      persisted.completed,
      persisted.progress,
      persisted.welcomeSeen,
      resumable,
      startTour,
      continueTour,
      stopTour,
      saveProgress,
      markCompleted,
      dismissWelcome,
    ],
  )

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>
}

export function useTour() {
  const context = useContext(TourContext)
  if (!context) {
    throw new Error('useTour must be used within a TourProvider')
  }
  return context
}
