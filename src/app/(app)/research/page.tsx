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

  const [showUpload, setShowUpload] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null)

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
      // Let the sidebar know a new session exists so its recent-sessions
      // list updates without a full page reload
      window.dispatchEvent(new Event('cognigraph:session-created'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    setUploadError(null)
    setUploadSuccess(null)

    if (!uploadFile) {
      setUploadError('Choose a PDF first.')
      return
    }
    if (!uploadFile.name.toLowerCase().endsWith('.pdf')) {
      setUploadError('Only PDF files are supported.')
      return
    }

    setUploading(true)

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      setUploading(false)
      router.push('/login')
      return
    }

    try {
      const formData = new FormData()
      formData.append('file', uploadFile)

      const res = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.detail || `Upload failed (${res.status})`)
      }

      const body: { chunks_added: number; filename: string } = await res.json()
      setUploadSuccess(`Added "${body.filename}" — ${body.chunks_added} chunks indexed.`)
      setUploadFile(null)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-text">Research</h1>
        <p className="mt-1 text-sm text-text-muted">
          Ask a question — the agent plans, searches, and synthesizes a cited report.
        </p>
      </div>

      {/* Document upload card */}
      <div className="mb-6 rounded-xl border border-border bg-surface p-4">
        <button
          type="button"
          onClick={() => setShowUpload((v) => !v)}
          className="flex w-full items-center justify-between text-sm font-medium text-text"
        >
          <span className="flex items-center gap-2">
            <span className="text-accent">▤</span> My Documents
          </span>
          <span className="text-text-muted">{showUpload ? '−' : '+'}</span>
        </button>

        {showUpload && (
          <form onSubmit={handleUpload} className="mt-4 space-y-3">
            <p className="text-sm text-text-muted">
              Add a PDF to your personal knowledge base — the agent can draw on
              it when &ldquo;Use my documents&rdquo; is checked below.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                className="text-sm text-text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-surface-hover file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-text hover:file:bg-accent/20"
              />
              <button
                type="submit"
                disabled={uploading || !uploadFile}
                className="rounded-lg bg-accent px-4 py-1.5 text-sm font-medium text-white transition hover:bg-accent-hover disabled:opacity-40"
              >
                {uploading ? 'Uploading…' : 'Upload'}
              </button>
            </div>
            {uploadError && <p className="text-sm text-error">{uploadError}</p>}
            {uploadSuccess && <p className="text-sm text-signature">{uploadSuccess}</p>}
          </form>
        )}
      </div>

      {/* Query card */}
      <div className="rounded-xl border border-border bg-surface p-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            required
            rows={3}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask a research question..."
            className="w-full resize-none rounded-lg border border-border bg-bg px-4 py-3 text-text placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />

          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <label className="text-sm text-text-muted">Iterations</label>
              <input
                type="number"
                min={1}
                max={10}
                value={maxIterations}
                onChange={(e) => setMaxIterations(Number(e.target.value))}
                className="w-16 rounded-lg border border-border bg-bg px-2 py-1 text-sm text-text focus:border-accent focus:outline-none"
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-text-muted">
              <input
                type="checkbox"
                checked={useRag}
                onChange={(e) => setUseRag(e.target.checked)}
                className="accent-accent"
              />
              Use my documents
            </label>
          </div>

          {error && <p className="text-sm text-error">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-accent px-6 py-2.5 text-sm font-medium text-white transition hover:bg-accent-hover disabled:opacity-40"
          >
            {loading ? 'Researching…' : 'Run research'}
          </button>
        </form>
      </div>

      {loading && (
        <div className="mt-6 flex items-center gap-3 rounded-xl border border-signature/30 bg-signature/5 px-4 py-3">
          <span className="h-2 w-2 animate-pulse rounded-full bg-signature" />
          <p className="text-sm text-text-muted">
            Planning, searching, synthesizing — this can take a minute
          </p>
        </div>
      )}

      {result && (
        <div className="mt-8 space-y-6">
          <div className="flex flex-wrap gap-2">
            {[
              `${result.iterations} iterations`,
              `${result.total_queries_executed} queries`,
              `${result.web_sources_count} web`,
              `${result.rag_sources_count} documents`,
            ].map((stat) => (
              <span
                key={stat}
                className="rounded-full border border-border bg-surface px-3 py-1 text-xs text-text-muted"
              >
                {stat}
              </span>
            ))}
          </div>

          <div className="rounded-xl border border-signature/30 bg-surface p-5">
            <p className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-signature">
              <span className="h-1.5 w-1.5 rounded-full bg-signature" /> Report
            </p>
            <div className="whitespace-pre-wrap text-[15px] leading-relaxed text-text">
              {result.final_report}
            </div>
          </div>

          {result.sources?.length > 0 && (
            <div className="rounded-xl border border-signature/30 bg-surface p-5">
              <p className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-signature">
                <span className="h-1.5 w-1.5 rounded-full bg-signature" /> Sources
                · {result.sources.length}
              </p>
              <ul className="space-y-3">
                {result.sources.map((s, i) => (
                  <li
                    key={i}
                    className="rounded-lg border border-border bg-bg p-3 text-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-text">{s.title}</span>
                      <span className="rounded-full bg-surface-hover px-2 py-0.5 text-xs uppercase text-text-muted">
                        {s.source_type}
                      </span>
                    </div>
                    {s.url && (
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 block truncate text-xs text-accent underline"
                      >
                        {s.url}
                      </a>
                    )}
                    <p className="mt-2 text-text-muted">{s.content}</p>
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