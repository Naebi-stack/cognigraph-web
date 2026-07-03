'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
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

export default function SessionDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const supabase = createClient()

  const [data, setData] = useState<SessionDetailResponse | null>(null)
  const [activeTab, setActiveTab] = useState<'web' | 'rag'>('web')
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
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [params.id])

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-sm text-muted-foreground">Loading session...</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 space-y-4">
        <p className="text-sm text-red-500">{error || 'Something went wrong.'}</p>
        <Link href="/history" className="text-sm underline">
          Back to history
        </Link>
      </div>
    )
  }

  const { session, sources } = data
  const webSources = sources.filter((s) => s.source_type === 'web')
  const ragSources = sources.filter((s) => s.source_type === 'rag')
  const activeSources = activeTab === 'web' ? webSources : ragSources

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 space-y-8">
      <div className="flex items-center justify-between">
        <Link href="/history" className="text-sm underline">
          ← Back to history
        </Link>
        <span className="text-xs text-muted-foreground">
          {formatDate(session.created_at)}
        </span>
      </div>

      <div>
        <h1 className="text-xl font-semibold">{session.query}</h1>
        <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span>{session.iterations} iterations</span>
          <span>{session.total_queries_executed} queries executed</span>
          <span>{session.web_sources_count} web sources</span>
          <span>{session.rag_sources_count} RAG sources</span>
          <span>{formatDuration(session.duration_seconds)}</span>
        </div>
      </div>

      <section>
        <h2 className="mb-2 text-lg font-semibold">Report</h2>
        <div className="whitespace-pre-wrap rounded-md border p-4 text-sm">
          {session.final_report}
        </div>
      </section>

      {session.research_plan && (
        <section>
          <h2 className="mb-2 text-lg font-semibold">Research Plan</h2>
          <div className="whitespace-pre-wrap rounded-md border p-4 text-sm text-muted-foreground">
            {session.research_plan}
          </div>
        </section>
      )}

      {session.final_critique && (
        <section>
          <h2 className="mb-2 text-lg font-semibold">Final Critique</h2>
          <div className="whitespace-pre-wrap rounded-md border p-4 text-sm text-muted-foreground">
            {session.final_critique}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-lg font-semibold">
          Sources ({sources.length})
        </h2>

        <div className="mb-4 flex gap-2 border-b">
          <button
            onClick={() => setActiveTab('web')}
            className={`px-3 py-2 text-sm ${
              activeTab === 'web'
                ? 'border-b-2 border-black font-medium'
                : 'text-muted-foreground'
            }`}
          >
            Web ({webSources.length})
          </button>
          <button
            onClick={() => setActiveTab('rag')}
            className={`px-3 py-2 text-sm ${
              activeTab === 'rag'
                ? 'border-b-2 border-black font-medium'
                : 'text-muted-foreground'
            }`}
          >
            Documents ({ragSources.length})
          </button>
        </div>

        {activeSources.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No {activeTab === 'web' ? 'web' : 'document'} sources for this
            session.
          </p>
        ) : (
          <ul className="space-y-3">
            {activeSources.map((s) => (
              <li key={s.id} className="rounded-md border p-3 text-sm">
                <div className="font-medium">{s.title}</div>
                {s.url && (
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-blue-600 underline"
                  >
                    {s.url}
                  </a>
                )}
                {s.page_number != null && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    page {s.page_number}
                  </span>
                )}
                <p className="mt-1 text-muted-foreground">
                  {s.content_preview}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}