'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Source {
  title: string
  url?: string
  content: string
  source_type: 'web' | 'rag'
  page?: number
}

interface ResearchResponse {
  query: string
  final_report: string
  iterations: number
  total_queries_executed: number
  web_sources_count: number
  rag_sources_count: number
  total_sources_count: number
  sources: Source[]
  research_plan: string
  critique: string
  session_id: string | null
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default function ResearchPage() {
  const router = useRouter()
  const supabase = createClient()

  const [query, setQuery] = useState('')
  const [maxIterations, setMaxIterations] = useState(3)
  const [useRag, setUseRag] = useState(true)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ResearchResponse | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setResult(null)

    if (query.trim().length < 5) {
      setError('Query must be at least 5 characters.')
      return
    }

    setLoading(true)

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      setLoading(false)
      router.push('/login')
      return
    }

    try {
      const res = await fetch(`${API_URL}/research`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          query,
          max_iterations: maxIterations,
          use_rag: useRag,
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.detail || `Request failed (${res.status})`)
      }

      const data: ResearchResponse = await res.json()
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">CogniGraph Research</h1>
        <button
          onClick={handleLogout}
          className="text-sm text-muted-foreground underline"
        >
          Log out
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label htmlFor="query" className="text-sm font-medium">
            Research query
          </label>
          <textarea
            id="query"
            required
            rows={3}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
            placeholder="What do you want CogniGraph to research?"
          />
        </div>

        <div className="flex items-center gap-6">
          <div className="space-y-1">
            <label htmlFor="maxIterations" className="text-sm font-medium">
              Max iterations
            </label>
            <input
              id="maxIterations"
              type="number"
              min={1}
              max={10}
              value={maxIterations}
              onChange={(e) => setMaxIterations(Number(e.target.value))}
              className="w-24 rounded-md border px-3 py-2 text-sm"
            />
          </div>

          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={useRag}
              onChange={(e) => setUseRag(e.target.checked)}
            />
            Use my documents (RAG)
          </label>
        </div>

        {error && (
          <p className="text-sm text-red-500" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? 'Researching...' : 'Run research'}
        </button>
      </form>

      {loading && (
        <p className="mt-8 text-sm text-muted-foreground">
          Agent is planning, searching, and synthesizing — this can take a
          minute for multiple iterations.
        </p>
      )}

      {result && (
        <div className="mt-10 space-y-6">
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span>{result.iterations} iterations</span>
            <span>{result.total_queries_executed} queries executed</span>
            <span>{result.web_sources_count} web sources</span>
            <span>{result.rag_sources_count} RAG sources</span>
          </div>

          <div>
            <h2 className="mb-2 text-lg font-semibold">Report</h2>
            <div className="whitespace-pre-wrap rounded-md border p-4 text-sm">
              {result.final_report}
            </div>
          </div>

          {result.sources?.length > 0 && (
            <div>
              <h2 className="mb-2 text-lg font-semibold">
                Sources ({result.sources.length})
              </h2>
              <ul className="space-y-3">
                {result.sources.map((s, i) => (
                  <li key={i} className="rounded-md border p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{s.title}</span>
                      <span className="rounded bg-muted px-2 py-0.5 text-xs uppercase text-muted-foreground">
                        {s.source_type}
                      </span>
                    </div>
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
                    <p className="mt-1 text-muted-foreground">
                      {s.content}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}