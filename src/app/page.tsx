import Link from 'next/link'

const LOOP_STAGES = [
  {
    label: 'Plan',
    detail: 'Breaks your question into a research plan and a first set of search queries.',
  },
  {
    label: 'Execute',
    detail: 'Runs those searches across the web and your own uploaded documents.',
  },
  {
    label: 'Critique',
    detail: 'Checks its own findings for gaps, weak sources, or unanswered parts of the question.',
  },
  {
    label: 'Synthesize',
    detail: 'Writes the report — or loops back to Plan if the critique found gaps.',
  },
]

const FEATURES = [
  {
    icon: '▤',
    title: 'Your documents, searched too',
    detail:
      'Upload PDFs and CogniGraph treats them as first-class sources alongside the web — every claim traceable back to a page number.',
  },
  {
    icon: '❝',
    title: 'Citations, done properly',
    detail:
      'Add any source to a personal library and export it in APA, MLA, or Chicago — as plain text, BibTeX, PDF, or Word.',
  },
  {
    icon: '▦',
    title: 'Data insights, on request',
    detail:
      'Ask CogniGraph to find the numbers inside its own report and turn them into charts — automatically, per session.',
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg text-text">
      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.svg" alt="" className="h-7 w-7" />
          <p className="text-lg font-semibold tracking-tight">
            Cogni<span className="text-accent">Graph</span>
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-sm text-text-muted transition hover:text-text"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-hover"
          >
            Get started
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pb-20 pt-12 sm:pt-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-signature">
            Autonomous Research Agent
          </p>
          <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            Research that critiques itself
            <br className="hidden sm:block" /> before it reaches you.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-text-muted sm:text-lg">
            CogniGraph plans its searches, digs through the web and your own
            documents, checks its own findings for gaps, and revises —
            looping until the report holds up.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link
              href="/signup"
              className="rounded-lg bg-accent px-6 py-3 text-sm font-medium text-white transition hover:bg-accent-hover"
            >
              Start researching
            </Link>
            <Link
              href="/login"
              className="rounded-lg border border-border px-6 py-3 text-sm font-medium text-text-muted transition hover:border-accent hover:text-text"
            >
              Sign in
            </Link>
          </div>
        </div>

        {/* Signature element: the actual Plan -> Execute -> Critique -> Synthesize loop */}
        <div className="relative mx-auto mt-20 max-w-4xl">
          <div
            className="pointer-events-none absolute inset-0 -z-10 opacity-30 blur-3xl"
            style={{
              background:
                'radial-gradient(ellipse at center, var(--color-accent) 0%, transparent 60%)',
            }}
          />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {LOOP_STAGES.map((stage, i) => (
              <div key={stage.label} className="relative">
                <div className="rounded-xl border border-border bg-surface p-5">
                  <p className="font-mono text-xs text-signature">
                    0{i + 1}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-text">
                    {stage.label}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-text-muted">
                    {stage.detail}
                  </p>
                </div>
                {i < LOOP_STAGES.length - 1 && (
                  <span
                    className="absolute right-[-14px] top-1/2 hidden -translate-y-1/2 text-signature sm:block"
                    aria-hidden="true"
                  >
                    →
                  </span>
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-center gap-2">
            <span className="text-signature" aria-hidden="true">
              ↺
            </span>
            <p className="text-center text-xs text-text-muted">
              Loops back to Plan when the critique finds gaps — reports
              typically go through 2–3 rounds before they're shown to you.
            </p>
          </div>
        </div>
      </section>

      {/* Headline feature: the research agent, shown as a realistic preview */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-signature">
              Core capability
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
              Give it a question. It does the work.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-text-muted sm:text-base">
              No prompt engineering required — describe what you want to
              know, and CogniGraph autonomously plans multiple searches,
              pulls from the open web and any documents you've uploaded, and
              writes a cited report. If its own critique finds the answer
              incomplete, it goes back and researches further before showing
              you anything.
            </p>
          </div>

          {/* Mock session card, styled like the real Session Detail page */}
          <div className="rounded-xl border border-border bg-surface p-5">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-border bg-bg px-3 py-1 text-xs text-text-muted">
                3 iterations
              </span>
              <span className="rounded-full border border-border bg-bg px-3 py-1 text-xs text-text-muted">
                21 web sources
              </span>
              <span className="rounded-full border border-border bg-bg px-3 py-1 text-xs text-text-muted">
                14 RAG sources
              </span>
            </div>
            <div className="mt-4 rounded-lg border border-border border-l-2 border-l-signature bg-bg p-4">
              <p className="text-xs font-medium text-text-muted">Report</p>
              <p className="mt-2 text-sm leading-relaxed text-text">
                Across the reviewed sources, three converging findings
                emerge on the proposed mechanism&hellip;
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Supporting features */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-4 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-border bg-surface p-6"
            >
              <span className="text-xl text-accent">{f.icon}</span>
              <h3 className="mt-3 text-sm font-semibold text-text">
                {f.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-text-muted">
                {f.detail}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Trust line */}
      <section className="mx-auto max-w-3xl px-6 py-16 text-center">
        <p className="text-sm leading-relaxed text-text-muted sm:text-base">
          Every report cites its sources. Every source can be added to your
          library. Every session shows its plan, its critique, and how it
          got there — nothing is hidden between your question and the
          answer.
        </p>
      </section>

      {/* Closing CTA */}
      <section className="mx-auto max-w-3xl px-6 pb-24 text-center">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Start your first session.
        </h2>
        <div className="mt-6">
          <Link
            href="/signup"
            className="inline-block rounded-lg bg-accent px-6 py-3 text-sm font-medium text-white transition hover:bg-accent-hover"
          >
            Get started — it's free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 text-xs text-text-muted">
          <div className="flex items-center gap-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-mark.svg" alt="" className="h-4 w-4" />
            <p>
              Cogni<span className="text-accent">Graph</span>
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/terms" className="transition hover:text-text">
              Terms of Service
            </Link>
            <Link href="/privacy" className="transition hover:text-text">
              Privacy Policy
            </Link>
            <p>&copy; {new Date().getFullYear()} CogniGraph</p>
          </div>
        </div>
      </footer>
    </div>
  )
}