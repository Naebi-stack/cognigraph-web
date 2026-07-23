'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
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
        <span className="text-xs text-[var(--color-text-muted)]">
          {formatDate(session.created_at)}
        </span>
      </div>

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
        <div className="whitespace-pre-wrap rounded-lg border border-[var(--color-border)] border-l-2 border-l-[var(--color-signature)] bg-[var(--color-surface)] p-4 text-sm text-[var(--color-text)]">
          {session.final_report}
        </div>
      </section>

      {session.research_plan && (
        <section>
          <h2 className="mb-2 text-lg font-semibold text-[var(--color-text)]">Research Plan</h2>
          <div className="whitespace-pre-wrap rounded-lg border border-[var(--color-border)] border-l-2 border-l-[var(--color-signature)] bg-[var(--color-surface)] p-4 text-sm text-[var(--color-text-muted)]">
            {session.research_plan}
          </div>
        </section>
      )}

      {session.final_critique && (
        <section>
          <h2 className="mb-2 text-lg font-semibold text-[var(--color-text)]">Final Critique</h2>
          <div className="whitespace-pre-wrap rounded-lg border border-[var(--color-border)] border-l-2 border-l-[var(--color-signature)] bg-[var(--color-surface)] p-4 text-sm text-[var(--color-text-muted)]">
            {session.final_critique}
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