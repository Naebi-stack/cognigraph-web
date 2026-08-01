import type { Step } from 'react-joyride'

/**
 * Single source of truth for every tour in the app.
 *
 * Two rules keep tours from silently breaking, both learned the hard way:
 *
 * 1. A tour may only target elements that exist on the routes listed in
 *    `routes`. Joyride hard-stops on a missing target, so a "global" tour
 *    that points at a dashboard-only card dies the moment it's launched
 *    from Library. Global steps therefore only target the sidebar (always
 *    mounted via the app layout) or `body` for centered cards.
 *
 * 2. Target ids are prefixed `tour-` and are *only* ever added for tours.
 *    Don't reuse a styling id — renaming it later breaks the tour with no
 *    type error to catch it.
 */

export type TourKey = 'main' | 'dashboard' | 'library'

export interface TourDefinition {
  key: TourKey
  /** Shown in the Help Center menu. */
  label: string
  /** Route prefixes where every target in `steps` is guaranteed to exist. */
  routes: string[]
  steps: Step[]
}

/** Centered card with no spotlight — used for intro/outro steps. */
const centered = (title: string, body: string): Step => ({
  target: 'body',
  placement: 'center',
  disableBeacon: true,
  title,
  content: body,
})

const mainSteps: Step[] = [
  centered(
    'The 60-second tour',
    "CogniGraph runs multi-step research for you: it plans, searches, critiques its own findings, then writes a cited report. Here's where everything lives.",
  ),
  {
    target: '#tour-new-research',
    title: 'Start here',
    content:
      'Ask a research question and the agent plans its own searches, reads the sources, and drafts a report with citations. This button works from any page.',
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '#tour-nav-research',
    title: 'Research',
    content:
      'Watch a session run live — the plan, each search round, and the critique that decides whether another round is needed.',
    placement: 'right',
  },
  {
    target: '#tour-nav-history',
    title: 'History',
    content:
      'Every finished session is saved here with its full report. Your most recent ones also appear directly under this link.',
    placement: 'right',
  },
  {
    target: '#tour-nav-library',
    title: 'Reference Library',
    content:
      'Sources you save from a session collect here, formatted in APA, MLA, or Chicago and exportable to BibTeX or RIS.',
    placement: 'right',
  },
  {
    target: '#tour-nav-dashboard',
    title: 'Dashboard',
    content:
      'Analytics across all your sessions — how many rounds the agent typically needs, and where its sources come from.',
    placement: 'right',
  },
  {
    target: '#tour-help-launcher',
    title: 'Help lives here',
    content:
      'Reopen this tour, jump into the demo workspace, or get page-specific tours from this button. Nothing here is one-time-only.',
    placement: 'left',
  },
]

const dashboardSteps: Step[] = [
  {
    target: '#tour-dashboard-stats',
    title: 'Your research at a glance',
    content:
      'Session count, how many plan → search → critique rounds the agent averages, and typical run time.',
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '#tour-dashboard-sources',
    title: 'Where answers come from',
    content:
      'The split between live web sources and your own uploaded documents. A RAG-heavy split means the agent is leaning on your library.',
    placement: 'top',
  },
]

const librarySteps: Step[] = [
  {
    target: '#tour-library-header',
    title: 'Your Reference Library',
    content:
      'Every source you save from a research session lands here, deduplicated and ready to cite.',
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '#tour-library-search',
    title: 'Find a source fast',
    content: 'Filter by title or by any tag you have attached to a citation.',
    placement: 'bottom',
  },
  {
    target: '#tour-library-export',
    title: 'Export to your writing tool',
    content:
      'Send the whole library to BibTeX or RIS so it drops straight into Zotero, Mendeley, or LaTeX.',
    placement: 'bottom',
  },
  {
    target: '#tour-citation-style',
    title: 'Switch citation style',
    content:
      'APA, MLA, and Chicago. This re-renders every citation instantly and is remembered for exports.',
    placement: 'right',
  },
]

export const TOURS: Record<TourKey, TourDefinition> = {
  main: {
    key: 'main',
    label: 'Product tour',
    // Sidebar-only targets, so this is safe to launch from anywhere.
    routes: ['/'],
    steps: mainSteps,
  },
  dashboard: {
    key: 'dashboard',
    label: 'Tour the Dashboard',
    routes: ['/dashboard'],
    steps: dashboardSteps,
  },
  library: {
    key: 'library',
    label: 'Tour the Library',
    routes: ['/library'],
    steps: librarySteps,
  },
}

/** The page-specific tour for a pathname, if one exists. */
export function tourForRoute(pathname: string): TourDefinition | null {
  const match = Object.values(TOURS).find(
    (tour) => tour.key !== 'main' && tour.routes.some((r) => pathname.startsWith(r)),
  )
  return match ?? null
}
