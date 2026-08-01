/**
 * A tiny external store over localStorage for onboarding state.
 *
 * Why not plain useState + useEffect: onboarding state is read by several
 * components at once (welcome modal, help center, settings) and written from
 * all of them. Mirroring localStorage into React state meant two sources of
 * truth that drifted — and reading it in an effect trips
 * `react-hooks/set-state-in-effect` under the React Compiler.
 *
 * `useSyncExternalStore` is built for exactly this: `getServerSnapshot`
 * returns the pre-hydration default so SSR and the client's first paint
 * agree, then React re-reads the real value after hydration.
 *
 * Snapshots are cached because useSyncExternalStore compares them by
 * reference — returning a fresh object each call would loop forever.
 */

import type { TourKey } from '@/components/tour/tours'

const KEY_SEEN = 'cognigraph:onboarding-seen'
const KEY_PROGRESS = 'cognigraph:tour-progress'
const KEY_COMPLETED = 'cognigraph:tour-completed'
const KEY_LAST = 'cognigraph:tour-last'
const KEY_DEMO = 'cognigraph:demo-mode'

const OWNED_KEYS = [KEY_SEEN, KEY_PROGRESS, KEY_COMPLETED, KEY_LAST, KEY_DEMO]

export type TourProgress = Partial<Record<TourKey, number>>

export interface OnboardingSnapshot {
  /** False until the first client read — guards SSR/hydration mismatch. */
  hydrated: boolean
  welcomeSeen: boolean
  demoMode: boolean
  lastTour: TourKey | null
  completed: TourKey[]
  progress: TourProgress
}

const SERVER_SNAPSHOT: OnboardingSnapshot = {
  hydrated: false,
  welcomeSeen: false,
  demoMode: false,
  lastTour: null,
  completed: [],
  progress: {},
}

let cache: OnboardingSnapshot = SERVER_SNAPSHOT
let cacheValid = false
const listeners = new Set<() => void>()

function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    // Corrupt JSON or blocked storage behaves like a fresh browser rather
    // than taking the app down.
    return fallback
  }
}

function write(key: string, value: unknown | null) {
  try {
    if (value === null) window.localStorage.removeItem(key)
    else window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* private mode / quota — non-fatal, state just won't persist */
  }
  invalidate()
}

function invalidate() {
  cacheValid = false
  for (const listener of listeners) listener()
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  // Keep multiple tabs in sync — `storage` fires in *other* tabs only.
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || OWNED_KEYS.includes(e.key)) invalidate()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

export function getSnapshot(): OnboardingSnapshot {
  if (cacheValid) return cache
  cache = {
    hydrated: true,
    welcomeSeen: read<boolean>(KEY_SEEN, false) === true,
    demoMode: read<boolean>(KEY_DEMO, false) === true,
    lastTour: read<TourKey | null>(KEY_LAST, null),
    completed: read<TourKey[]>(KEY_COMPLETED, []),
    progress: read<TourProgress>(KEY_PROGRESS, {}),
  }
  cacheValid = true
  return cache
}

export function getServerSnapshot(): OnboardingSnapshot {
  return SERVER_SNAPSHOT
}

// --- mutations -------------------------------------------------------------

export function setWelcomeSeen(seen: boolean) {
  write(KEY_SEEN, seen ? true : null)
}

export function setDemoMode(on: boolean) {
  write(KEY_DEMO, on ? true : null)
}

export function setLastTour(key: TourKey) {
  write(KEY_LAST, key)
}

export function setTourProgress(key: TourKey, index: number) {
  const next = { ...getSnapshot().progress, [key]: index }
  write(KEY_PROGRESS, next)
}

export function completeTour(key: TourKey) {
  const snapshot = getSnapshot()

  if (!snapshot.completed.includes(key)) {
    write(KEY_COMPLETED, [...snapshot.completed, key])
  }

  // Clear the resume point — a completed tour restarts from the beginning.
  const progress = { ...snapshot.progress }
  delete progress[key]
  write(KEY_PROGRESS, progress)
}

export function resetOnboarding() {
  for (const key of OWNED_KEYS) {
    // Demo mode is a separate concern from onboarding progress and is left
    // alone here; the Settings toggle and banner own it.
    if (key === KEY_DEMO) continue
    try {
      window.localStorage.removeItem(key)
    } catch {
      /* non-fatal */
    }
  }
  invalidate()
}
