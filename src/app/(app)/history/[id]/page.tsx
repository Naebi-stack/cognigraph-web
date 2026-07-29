'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { MoreVertical, Trash2, Download } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { createClient } from '@/lib/supabase/client'

interface SessionDetail {
  id: string
  query: string
  final_report: string
  iterations: number
  total_queries_executed: number
  web_sources_count: number
  rag_sources_count: number
  research_plan: string
  final_critique: string
  duration_seconds: number
  created_at: string
}

interface Source {
  id: string
  session_id: string
  source_type: 'web' | 'rag'
  title: string
  url: string | null
  content_preview: string
  page_number: number | null
}

interface SessionDetailResponse {
  session: SessionDetail
  sources: Source[]
}

interface ChartDataPoint {
  name: string
  value: number
}

interface ChartInsight {
  label: string
  chart_type: 'bar' | 'line' | 'stat'
  data: ChartDataPoint[]
  unit?: string
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`
  const mins = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  return `${mins}m ${secs}s`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Shared styling for rendered report/plan/critique content — keeps
// Markdown output (now that the Synthesizer writes structured reports)
// consistent with the rest of the design system instead of relying on a
// typography plugin that may not be installed.
const markdownComponents = {
  h1: (props: React.ComponentPropsWithoutRef<'h1'>) => (
    <h1 className="mb-3 text-xl font-semibold text-[var(--color-text)]" {...props} />
  ),
  h2: (props: React.ComponentPropsWithoutRef<'h2'>) => (
    <h2
      className="mb-2 mt-6 border-b border-[var(--color-border)] pb-1 text-base font-semibold text-[var(--color-text)] first:mt-0"
      {...props}
    />
  ),
  h3: (props: React.ComponentPropsWithoutRef<'h3'>) => (
    <h3
      className="mb-1 mt-4 text-sm font-semibold uppercase tracking-wide text-[var(--color-signature)]"
      {...props}
    />
  ),
  p: (props: React.ComponentPropsWithoutRef<'p'>) => (
    <p className="mb-3 leading-relaxed text-[var(--color-text)] last:mb-0" {...props} />
  ),
  ul: (props: React.ComponentPropsWithoutRef<'ul'>) => (
    <ul className="mb-3 list-disc space-y-1 pl-5 text-[var(--color-text)]" {...props} />
  ),
  ol: (props: React.ComponentPropsWithoutRef<'ol'>) => (
    <ol className="mb-3 list-decimal space-y-1 pl-5 text-[var(--color-text)]" {...props} />
  ),
  li: (props: React.ComponentPropsWithoutRef<'li'>) => (
    <li className="leading-relaxed" {...props} />
  ),
  strong: (props: React.ComponentPropsWithoutRef<'strong'>) => (
    <strong className="font-semibold text-[var(--color-text)]" {...props} />
  ),
  table: (props: React.ComponentPropsWithoutRef<'table'>) => (
    <div className="mb-3 overflow-x-auto">
      <table className="w-full border-collapse text-sm" {...props} />
    </div>
  ),
  th: (props: React.ComponentPropsWithoutRef<'th'>) => (
    <th
      className="border border-[var(--color-border)] bg-[var(--color-surface-hover)] px-2 py-1 text-left text-[var(--color-text)]"
      {...props}
    />
  ),
  td: (props: React.ComponentPropsWithoutRef<'td'>) => (
    <td className="border border-[var(--color-border)] px-2 py-1 text-[var(--color-text-muted)]" {...props} />
  ),
}

// Small pill for the stat row under the query title
function StatPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 text-xs text-[var(--color-text-muted)]">
      {children}
    </span>
  )
}

export default function SessionDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const supabase = createClient()

  const [data, setData] = useState<SessionDetailResponse | null>(null)
  const [activeTab, setActiveTab] = useState<'web' | 'rag'>('web')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Tracks per-source "add to library" state so each button behaves
  // independently (one source succeeding/failing doesn't affect others)
  const [addedSourceIds, setAddedSourceIds] = useState<Set<string>>(new Set())
  const [addingSourceId, setAddingSourceId] = useState<string | null>(null)
  const [addError, setAddError] = useState<string | null>(null)

  // Data insights: null = not yet checked/generated, [] = generated but
  // nothing chartable found, populated array = real chart data
  const [chartData, setChartData] = useState<ChartInsight[] | null>(null)
  const [generatingInsights, setGeneratingInsights] = useState(false)
  const [insightsError, setInsightsError] = useState<string | null>(null)

  // Session actions: kebab menu + custom delete confirmation (not the
  // browser's native confirm()) — deliberately placed up here near the
  // date, not buried in a hover-only control, so it can't be triggered
  // by an accidental hover/click.
  const [menuOpen, setMenuOpen] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const load = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.push('/login')
        return
      }

      try {
        const res = await fetch(`${API_URL}/sessions/${params.id}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })

        if (res.status === 404) throw new Error('Session not found.')
        if (!res.ok) throw new Error('Failed to load session detail.')

        const body: SessionDetailResponse = await res.json()
        setData(body)

        // Default to whichever tab actually has sources
        const hasWeb = body.sources.some((s) => s.source_type === 'web')
        const hasRag = body.sources.some((s) => s.source_type === 'rag')
        if (!hasWeb && hasRag) setActiveTab('rag')

        // Check which sources are already in the library so "Add to library"
        // buttons correctly show "Added ✓" after a refresh, not just within
        // this page visit. Best-effort: if this fails, buttons just show as
        // not-added, which is safe since the backend also prevents duplicates.
        try {
          const citationsRes = await fetch(`${API_URL}/citations`, {
            headers: { Authorization: `Bearer ${session.access_token}` },
          })
          if (citationsRes.ok) {
            const citationsBody: { citations: { source_id: string | null }[] } =
              await citationsRes.json()
            const existingSourceIds = new Set(
              citationsBody.citations
                .map((c) => c.source_id)
                .filter((id): id is string => id !== null)
            )
            setAddedSourceIds(existingSourceIds)
          }
        } catch {
          // Non-fatal — leave addedSourceIds empty, buttons show as not-added
        }

        // Check for already-cached chart insights so the page shows charts
        // immediately on load if extraction has run before — no need to
        // click "Visualize" again on every visit. Best-effort: a failure
        // here just leaves the "Visualize this report" button available.
        try {
          const insightsRes = await fetch(
            `${API_URL}/sessions/${params.id}/insights`,
            { headers: { Authorization: `Bearer ${session.access_token}` } }
          )
          if (insightsRes.ok) {
            const insightsBody: { chart_data: ChartInsight[] | null } =
              await insightsRes.json()
            setChartData(insightsBody.chart_data)
          }
        } catch {
          // Non-fatal — chartData stays null, "Visualize" button shows
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [params.id])

  const handleAddToLibrary = async (source: Source) => {
    setAddError(null)
    setAddingSourceId(source.id)

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      router.push('/login')
      return
    }

    try {
      const res = await fetch(`${API_URL}/citations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          source_id: source.id,
          title: source.title,
          url: source.url || null,
          author: null,
          publish_date: null,
          source_type: source.source_type,
          tags: [],
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.detail || body?.error || 'Failed to add citation.')
      }

      setAddedSourceIds((prev) => new Set(prev).add(source.id))
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setAddingSourceId(null)
    }
  }

  const handleDownload = async (format: 'pdf' | 'docx') => {
    setMenuOpen(false)

    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) return

    try {
      const res = await fetch(
        `${API_URL}/sessions/${params.id}/export?format=${format}`,
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      )
      if (!res.ok) return

      // Prefer the filename the backend generated from the query, falling
      // back to a generic name if the header is missing for any reason.
      const disposition = res.headers.get('Content-Disposition')
      const match = disposition?.match(/filename="(.+)"/)
      const filename = match?.[1] || `report.${format}`

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      // Non-fatal — user can just retry from the menu
    }
  }

  const handleDeleteSession = async () => {
    setDeleteError(null)
    setDeleting(true)

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      router.push('/login')
      return
    }

    try {
      const res = await fetch(`${API_URL}/sessions/${params.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.detail || 'Failed to delete session.')
      }

      router.push('/history')
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Something went wrong.')
      setDeleting(false)
    }
  }

  const handleGenerateInsights = async () => {
    setInsightsError(null)
    setGeneratingInsights(true)

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      router.push('/login')
      return
    }

    try {
      const res = await fetch(`${API_URL}/sessions/${params.id}/insights`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.detail || 'Failed to analyze report.')
      }

      const body: { chart_data: ChartInsight[] } = await res.json()
      setChartData(body.chart_data)
    } catch (err) {
      setInsightsError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setGeneratingInsights(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-sm text-[var(--color-text-muted)]">Loading session...</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 space-y-4">
        <p className="text-sm text-[var(--color-error)]">{error || 'Something went wrong.'}</p>
        <Link href="/history" className="text-sm text-[var(--color-accent)] underline">
          Back to history
        </Link>
      </div>
    )
  }

  const { session, sources } = data
  const webSources = sources.filter((s) => s.source_type === 'web')
  const ragSources = sources.filter((s) => s.source_type === 'rag')
  const activeSources = activeTab === 'web' ? webSources : ragSources

  const tooltipStyle = {
    backgroundColor: 'var(--color-surface-hover)',
    border: '1px solid var(--color-border)',
    borderRadius: 8,
    color: 'var(--color-text)',
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 space-y-8">
      <div className="flex items-center justify-between">
        <Link href="/history" className="text-sm text-[var(--color-accent)] underline">
          ← Back to history
        </Link>

        <div className="flex items-center gap-3">
          <span className="text-xs text-[var(--color-text-muted)]">
            {formatDate(session.created_at)}
          </span>

          <div ref={menuRef} className="relative">
            <button
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-label="Session actions"
              className="rounded-md p-1 text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
            >
              <MoreVertical className="h-4 w-4" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full z-10 mt-1 w-44 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-1 shadow-lg">
                <button
                  onClick={() => handleDownload('pdf')}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
                >
                  <Download className="h-4 w-4" />
                  Download PDF
                </button>
                <button
                  onClick={() => handleDownload('docx')}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
                >
                  <Download className="h-4 w-4" />
                  Download DOCX
                </button>
                <div className="my-1 border-t border-[var(--color-border)]" />
                <button
                  onClick={() => {
                    setMenuOpen(false)
                    setShowDeleteConfirm(true)
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-[var(--color-error)] transition hover:bg-[var(--color-surface-hover)]"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete session
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Custom delete-confirmation modal — deliberately not the browser's
          native confirm(), so it matches the app's design and can't be
          dismissed/confused with a generic browser dialog. */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <h2 className="text-base font-semibold text-[var(--color-text)]">
              Delete this session?
            </h2>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">
              This permanently deletes the report, sources, and any chart
              insights for this session. Citations you&apos;ve already saved
              to your library are not affected. This can&apos;t be undone.
            </p>

            {deleteError && (
              <p className="mt-3 text-sm text-[var(--color-error)]" role="alert">
                {deleteError}
              </p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text-muted)] transition hover:text-[var(--color-text)] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSession}
                disabled={deleting}
                className="rounded-lg bg-[var(--color-error)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete session'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div>
        <h1 className="text-xl font-semibold text-[var(--color-text)]">{session.query}</h1>
        <div className="mt-3 flex flex-wrap gap-2">
          <StatPill>{session.iterations} iterations</StatPill>
          <StatPill>{session.total_queries_executed} queries executed</StatPill>
          <StatPill>{session.web_sources_count} web sources</StatPill>
          <StatPill>{session.rag_sources_count} RAG sources</StatPill>
          <StatPill>{formatDuration(session.duration_seconds)}</StatPill>
        </div>

        {/* Quick-access Data Insights card — same trigger/state as the full
            section further down, so users don't have to scroll to find it
            right after reading their report. */}
        <div className="mt-4 rounded-lg border border-[var(--color-border)] border-l-2 border-l-[var(--color-signature)] bg-[var(--color-surface)] p-3">
          {chartData === null && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-[var(--color-text-muted)]">
                Chart the numeric findings in this report.
              </p>
              <button
                onClick={handleGenerateInsights}
                disabled={generatingInsights}
                className="shrink-0 rounded-md bg-[var(--color-accent)] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
              >
                {generatingInsights ? 'Analyzing report...' : 'Visualize this report'}
              </button>
            </div>
          )}

          {chartData !== null && chartData.length === 0 && (
            <p className="text-xs text-[var(--color-text-muted)]">
              No chartable data found in this report.
            </p>
          )}

          {chartData !== null && chartData.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-[var(--color-text-muted)]">
                {chartData.length} data insight{chartData.length > 1 ? 's' : ''} extracted from this report.
              </p>
              <a
                href="#data-insights"
                className="shrink-0 text-xs font-medium text-[var(--color-signature)] underline"
              >
                Jump to charts ↓
              </a>
            </div>
          )}
        </div>
      </div>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-[var(--color-text)]">Report</h2>
        <div className="rounded-lg border border-[var(--color-border)] border-l-2 border-l-[var(--color-signature)] bg-[var(--color-surface)] p-4 text-sm">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {session.final_report}
          </ReactMarkdown>
        </div>
      </section>

      {session.research_plan && (
        <section>
          <h2 className="mb-2 text-lg font-semibold text-[var(--color-text)]">Research Plan</h2>
          <div className="rounded-lg border border-[var(--color-border)] border-l-2 border-l-[var(--color-signature)] bg-[var(--color-surface)] p-4 text-sm text-[var(--color-text-muted)]">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {session.research_plan}
            </ReactMarkdown>
          </div>
        </section>
      )}

      {session.final_critique && (
        <section>
          <h2 className="mb-2 text-lg font-semibold text-[var(--color-text)]">Final Critique</h2>
          <div className="rounded-lg border border-[var(--color-border)] border-l-2 border-l-[var(--color-signature)] bg-[var(--color-surface)] p-4 text-sm text-[var(--color-text-muted)]">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {session.final_critique}
            </ReactMarkdown>
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-lg font-semibold text-[var(--color-text)]">
          Sources ({sources.length})
        </h2>

        <div className="mb-4 flex gap-2 border-b border-[var(--color-border)]">
          <button
            onClick={() => setActiveTab('web')}
            className={`px-3 py-2 text-sm transition-colors ${
              activeTab === 'web'
                ? 'border-b-2 border-[var(--color-accent)] font-medium text-[var(--color-text)]'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            Web ({webSources.length})
          </button>
          <button
            onClick={() => setActiveTab('rag')}
            className={`px-3 py-2 text-sm transition-colors ${
              activeTab === 'rag'
                ? 'border-b-2 border-[var(--color-accent)] font-medium text-[var(--color-text)]'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            Documents ({ragSources.length})
          </button>
        </div>

        {addError && (
          <p className="mb-2 text-sm text-[var(--color-error)]" role="alert">
            {addError}
          </p>
        )}

        {activeSources.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">
            No {activeTab === 'web' ? 'web' : 'document'} sources for this
            session.
          </p>
        ) : (
          <ul className="space-y-3">
            {activeSources.map((s) => {
              const isAdded = addedSourceIds.has(s.id)
              const isAdding = addingSourceId === s.id

              return (
                <li
                  key={s.id}
                  className="rounded-lg border border-[var(--color-border)] border-l-2 border-l-[var(--color-signature)] bg-[var(--color-surface)] p-3 text-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="font-medium text-[var(--color-text)]">{s.title}</div>
                      {s.url && (
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-[var(--color-signature)] underline"
                        >
                          {s.url}
                        </a>
                      )}
                      {s.page_number != null && (
                        <span className="ml-2 text-xs text-[var(--color-text-muted)]">
                          page {s.page_number}
                        </span>
                      )}
                      <p className="mt-1 text-[var(--color-text-muted)]">
                        {s.content_preview}
                      </p>
                    </div>

                    <button
                      onClick={() => handleAddToLibrary(s)}
                      disabled={isAdded || isAdding}
                      className={`shrink-0 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-default ${
                        isAdded
                          ? 'border-[var(--color-border)] bg-[var(--color-surface-hover)] text-[var(--color-text-muted)]'
                          : 'border-[var(--color-accent)] bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-60'
                      }`}
                    >
                      {isAdded ? 'Added ✓' : isAdding ? 'Adding...' : 'Add to library'}
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section id="data-insights" className="scroll-mt-6">
        <h2 className="mb-2 text-lg font-semibold text-[var(--color-text)]">Data Insights</h2>

        {insightsError && (
          <p className="mb-2 text-sm text-[var(--color-error)]" role="alert">
            {insightsError}
          </p>
        )}

        {chartData === null && (
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <p className="mb-3 text-sm text-[var(--color-text-muted)]">
              Automatically find and chart any numeric findings in this
              report.
            </p>
            <button
              onClick={handleGenerateInsights}
              disabled={generatingInsights}
              className="rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
            >
              {generatingInsights ? 'Analyzing report...' : 'Visualize this report'}
            </button>
          </div>
        )}

        {chartData !== null && chartData.length === 0 && (
          <p className="text-sm text-[var(--color-text-muted)]">
            No chartable data found in this report.
          </p>
        )}

        {chartData !== null && chartData.length > 0 && (
          <div className="space-y-6">
            <p className="text-xs text-[var(--color-text-muted)]">
              Auto-extracted from the report — verify against the original
              sources before relying on exact figures.
            </p>
            {chartData.map((insight, i) => (
              <div
                key={i}
                className="rounded-lg border border-[var(--color-border)] border-l-2 border-l-[var(--color-signature)] bg-[var(--color-surface)] p-4"
              >
                <h3 className="mb-3 text-sm font-medium text-[var(--color-text)]">
                  {insight.label}
                  {insight.unit ? ` (${insight.unit})` : ''}
                </h3>

                {insight.chart_type === 'stat' && (
                  <p className="text-3xl font-semibold text-[var(--color-signature)]">
                    {insight.data[0]?.value}
                    <span className="ml-1 text-base font-normal text-[var(--color-text-muted)]">
                      {insight.unit}
                    </span>
                  </p>
                )}

                {insight.chart_type === 'bar' && (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={insight.data}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                      <XAxis dataKey="name" fontSize={12} stroke="var(--color-text-muted)" />
                      <YAxis fontSize={12} stroke="var(--color-text-muted)" />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="value" fill="#22d3ee" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}

                {insight.chart_type === 'line' && (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={insight.data}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                      <XAxis dataKey="name" fontSize={12} stroke="var(--color-text-muted)" />
                      <YAxis fontSize={12} stroke="var(--color-text-muted)" />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#22d3ee"
                        strokeWidth={2}
                        dot={{ fill: '#22d3ee', r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}