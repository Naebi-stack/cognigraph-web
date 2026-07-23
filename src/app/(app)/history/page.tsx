'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface SessionListItem {
  id: string
  query: string
  iterations: number
  web_sources_count: number
  rag_sources_count: number
  duration_seconds: number
  created_at: string
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

function truncate(text: string, max = 90): string {
  return text.length > max ? text.slice(0, max) + '…' : text
}

export default function HistoryPage() {
  const router = useRouter()
  const supabase = createClient()

  const [sessions, setSessions] = useState<SessionListItem[]>([])
  const [search, setSearch] = useState('')
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

      try {
        const res = await fetch(`${API_URL}/sessions`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })

        if (!res.ok) throw new Error('Failed to load research history')

        const data: { sessions: SessionListItem[] } = await res.json()
        const sorted = [...data.sessions].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        setSessions(sorted)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const filtered = sessions.filter((s) =>
    s.query.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-text">Research History</h1>
        <p className="mt-1 text-sm text-text-muted">
          Every question you've asked, with its full report and sources.
        </p>
      </div>

      <input
        type="text"
        placeholder="Search by query..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-6 w-full max-w-sm rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none"
      />

      {loading && <p className="text-sm text-text-muted">Loading history...</p>}

      {error && <p className="text-sm text-error">{error}</p>}

      {!loading && !error && filtered.length === 0 && (
        <p className="text-sm text-text-muted">
          {sessions.length === 0
            ? 'No research sessions yet.'
            : 'No sessions match your search.'}
        </p>
      )}

      {!loading && filtered.length > 0 && (
        <ul className="space-y-3">
          {filtered.map((s) => (
            <li
              key={s.id}
              onClick={() => router.push(`/history/${s.id}`)}
              className="cursor-pointer rounded-xl border border-border bg-surface p-4 transition hover:border-accent"
            >
              <div className="flex items-start justify-between gap-4">
                <p className="flex-1 text-sm text-text">{truncate(s.query)}</p>
                <span className="shrink-0 text-xs text-text-muted">
                  {formatDate(s.created_at)}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full border border-border bg-bg px-2.5 py-0.5 text-xs text-text-muted">
                  {s.iterations} iterations
                </span>
                <span className="rounded-full border border-border bg-bg px-2.5 py-0.5 text-xs text-text-muted">
                  {s.web_sources_count + s.rag_sources_count} sources
                </span>
                <span className="rounded-full border border-border bg-bg px-2.5 py-0.5 text-xs text-text-muted">
                  {formatDuration(s.duration_seconds)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}