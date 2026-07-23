'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { createClient } from '@/lib/supabase/client'

interface AnalyticsSummary {
  total_sessions: number
  avg_iterations: number
  avg_duration_seconds: number
  total_web_sources: number
  total_rag_sources: number
  avg_sources_per_session: number
}

interface SessionListItem {
  id: string
  user_id: string
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

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// Web = violet (primary/user-directed), RAG = cyan (agent-sourced from personal docs)
const PIE_COLORS = ['#8b5cf6', '#22d3ee']

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`
  const mins = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  return `${mins}m ${secs}s`
}

function groupSessionsByDay(sessions: SessionListItem[]) {
  const counts: Record<string, number> = {}
  for (const s of sessions) {
    const day = new Date(s.created_at).toISOString().slice(0, 10) // YYYY-MM-DD
    counts[day] = (counts[day] || 0) + 1
  }
  return Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }))
}

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()

  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [sessions, setSessions] = useState<SessionListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.push('/login')
        return
      }

      const headers = { Authorization: `Bearer ${session.access_token}` }

      try {
        const [summaryRes, sessionsRes] = await Promise.all([
          fetch(`${API_URL}/analytics/summary`, { headers }),
          fetch(`${API_URL}/sessions`, { headers }),
        ])

        if (!summaryRes.ok) throw new Error('Failed to load analytics summary')
        if (!sessionsRes.ok) throw new Error('Failed to load sessions')

        const summaryData: AnalyticsSummary = await summaryRes.json()
        const sessionsData: { sessions: SessionListItem[] } = await sessionsRes.json()

        setSummary(summaryData)
        setSessions(sessionsData.sessions)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <p className="text-sm text-[var(--color-text-muted)]">Loading dashboard...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <p className="text-sm text-[var(--color-error)]">{error}</p>
      </div>
    )
  }

  if (!summary) return null

  const pieData = [
    { name: 'Web', value: summary.total_web_sources },
    { name: 'Documents (RAG)', value: summary.total_rag_sources },
  ]

  const activityData = groupSessionsByDay(sessions)

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 space-y-10">
      <h1 className="text-2xl font-semibold text-[var(--color-text)]">Dashboard</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total Research Sessions" value={summary.total_sessions} accent="accent" />
        <StatCard label="Avg. Iterations" value={summary.avg_iterations.toFixed(1)} accent="signature" />
        <StatCard label="Avg. Research Time" value={formatDuration(summary.avg_duration_seconds)} accent="signature" />
        <StatCard label="Avg. Sources / Session" value={summary.avg_sources_per_session.toFixed(1)} accent="signature" />
      </div>

      {/* Chart 1: Source type breakdown */}
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <h2 className="mb-4 text-lg font-semibold text-[var(--color-text)]">Source Type Breakdown</h2>
        {summary.total_web_sources + summary.total_rag_sources === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">No sources yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--color-surface-hover)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 8,
                  color: 'var(--color-text)',
                }}
              />
              <Legend wrapperStyle={{ color: 'var(--color-text-muted)', fontSize: 13 }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Chart 2: Recent activity */}
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <h2 className="mb-4 text-lg font-semibold text-[var(--color-text)]">Recent Activity</h2>
        {activityData.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">No sessions yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={activityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="date" fontSize={12} stroke="var(--color-text-muted)" />
              <YAxis allowDecimals={false} fontSize={12} stroke="var(--color-text-muted)" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--color-surface-hover)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 8,
                  color: 'var(--color-text)',
                }}
              />
              <Bar dataKey="count" fill="#8b5cf6" name="Sessions" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string
  value: string | number
  accent: 'accent' | 'signature'
}) {
  const valueColor = accent === 'signature' ? 'var(--color-signature)' : 'var(--color-accent)'

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-colors hover:bg-[var(--color-surface-hover)]">
      <p className="text-xs text-[var(--color-text-muted)]">{label}</p>
      <p className="mt-1 text-2xl font-semibold" style={{ color: valueColor }}>
        {value}
      </p>
    </div>
  )
}