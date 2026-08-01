'use client'

import Joyride, {
  ACTIONS,
  EVENTS,
  STATUS,
  type CallBackProps,
  type Styles,
} from 'react-joyride'
import { useTour } from '@/context/tour-context'

// Joyride styles are inline objects, not classes, so the design tokens from
// globals.css are repeated here as literals. Keep in sync with @theme inline.
const BG = '#171a29' // --color-surface
const BORDER = '#2a2e45' // --color-border
const TEXT = '#e8e9f3' // --color-text
const MUTED = '#8b90ab' // --color-text-muted
const ACCENT = '#8b5cf6' // --color-accent

const joyrideStyles: Partial<Styles> = {
  options: {
    zIndex: 10_000,
    arrowColor: BG,
    backgroundColor: BG,
    overlayColor: 'rgba(6, 7, 15, 0.72)',
    primaryColor: ACCENT,
    textColor: TEXT,
    width: 380,
  },
  tooltip: {
    backgroundColor: BG,
    border: `1px solid ${BORDER}`,
    borderRadius: 12,
    padding: 20,
    boxShadow: '0 20px 50px -12px rgba(0, 0, 0, 0.6)',
  },
  tooltipTitle: {
    color: TEXT,
    fontSize: 16,
    fontWeight: 600,
    margin: 0,
    textAlign: 'left',
  },
  tooltipContent: {
    color: MUTED,
    fontSize: 14,
    lineHeight: 1.6,
    padding: '10px 0 0',
    textAlign: 'left',
  },
  tooltipFooter: {
    alignItems: 'center',
    marginTop: 18,
  },
  buttonNext: {
    backgroundColor: ACCENT,
    borderRadius: 8,
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 500,
    outline: 'none',
    padding: '8px 16px',
  },
  buttonBack: {
    color: MUTED,
    fontSize: 14,
    marginRight: 8,
  },
  buttonSkip: {
    color: MUTED,
    fontSize: 13,
  },
  buttonClose: {
    color: MUTED,
    height: 12,
    width: 12,
    right: 14,
    top: 16,
  },
  spotlight: {
    borderRadius: 10,
  },
  beacon: {
    // The pulsing beacon defaults to red; recolor it via the inner elements.
    outline: 'none',
  },
  beaconInner: {
    backgroundColor: ACCENT,
  },
  beaconOuter: {
    backgroundColor: `${ACCENT}33`,
    border: `2px solid ${ACCENT}`,
  },
}

export function Tour() {
  const {
    isTourOpen,
    steps,
    stepIndex,
    setStepIndex,
    saveProgress,
    markCompleted,
    stopTour,
  } = useTour()

  // Controlled mode: Joyride reports what the user did, we own the index.
  // Without this, `stepIndex` is ignored entirely and resuming is impossible.
  const handleCallback = (data: CallBackProps) => {
    const { action, index, status, type } = data

    // Terminal states are checked BEFORE the advance logic below. Closing via
    // the X also emits STEP_AFTER, so handling that first would advance a step
    // instead of ending the tour.
    if (status === STATUS.FINISHED) {
      markCompleted()
      stopTour()
      return
    }

    if (status === STATUS.SKIPPED || action === ACTIONS.CLOSE) {
      // Skip/close deliberately does NOT mark the tour complete — this saved
      // resume point is exactly what makes "Continue tour" work.
      saveProgress(index)
      stopTour()
      return
    }

    // TARGET_NOT_FOUND is included because a target can vanish mid-tour (e.g.
    // the user collapses the sidebar); stepping past it beats stalling.
    if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      const next = index + (action === ACTIONS.PREV ? -1 : 1)

      // Ran off either end — the FINISHED branch above settles the tour.
      if (next < 0 || next >= steps.length) return

      setStepIndex(next)
      // Persist the step just left, so "Continue" resumes at `index + 1`.
      saveProgress(index)
    }
  }

  return (
    <Joyride
      steps={steps}
      run={isTourOpen}
      stepIndex={stepIndex}
      callback={handleCallback}
      continuous
      showProgress
      showSkipButton
      disableOverlayClose
      disableScrollParentFix
      scrollOffset={96}
      styles={joyrideStyles}
      locale={{
        back: 'Back',
        close: 'Close',
        last: 'Finish',
        next: 'Next',
        skip: 'Skip tour',
      }}
      floaterProps={{ disableAnimation: true }}
    />
  )
}
