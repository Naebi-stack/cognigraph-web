'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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

function truncate(text: string, max = 80): string {
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
        // Most recent first (API already returns this way per spec, sort defensively)
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
    <div className="mx-auto max-w-5xl px-4 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Research History</h1>
        <div className="flex gap-4 text-sm">
          <Link href="/dashboard" className="underline">
            Dashboard
          </Link>
          <Link href="/research" className="underline">
            New research
          </Link>
        </div>
      </div>

      <input
        type="text"
        placeholder="Search by query..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-sm rounded-md border px-3 py-2 text-sm"
      />

      {loading && (
        <p className="text-sm text-muted-foreground">Loading history...</p>
      )}

      {error && (
        <p className="text-sm text-red-500" role="alert">
          {error}
        </p>
      )}

      {!loading && !error && filtered.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {sessions.length === 0
            ? 'No research sessions yet.'
            : 'No sessions match your search.'}
        </p>
      )}

      {!loading && filtered.length > 0 && (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">Query</th>
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Iterations</th>
                <th className="px-3 py-2 font-medium">Total Sources</th>
                <th className="px-3 py-2 font-medium">Duration</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr
                  key={s.id}
                  onClick={() => router.push(`/history/${s.id}`)}
                  className="cursor-pointer border-b last:border-b-0 hover:bg-muted/30"
                >
                  <td className="px-3 py-2">{truncate(s.query)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {formatDate(s.created_at)}
                  </td>
                  <td className="px-3 py-2">{s.iterations}</td>
                  <td className="px-3 py-2">
                    {s.web_sources_count + s.rag_sources_count}
                  </td>
                  <td className="px-3 py-2">
                    {formatDuration(s.duration_seconds)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}