'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { BarChart3, Download } from 'lucide-react'
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

// Shared Markdown styling — mirrors the same mapping used on Session
// Detail so a freshly generated report and a revisited one from History
// look identical, now that the Synthesizer writes structured Markdown.
const markdownComponents = {
  h1: (props: React.ComponentPropsWithoutRef<'h1'>) => (
    <h1 className="mb-3 text-xl font-semibold text-text" {...props} />
  ),
  h2: (props: React.ComponentPropsWithoutRef<'h2'>) => (
    <h2
      className="mb-2 mt-6 border-b border-border pb-1 text-base font-semibold text-text first:mt-0"
      {...props}
    />
  ),
  h3: (props: React.ComponentPropsWithoutRef<'h3'>) => (
    <h3
      className="mb-1 mt-4 text-sm font-semibold uppercase tracking-wide text-signature"
      {...props}
    />
  ),
  p: (props: React.ComponentPropsWithoutRef<'p'>) => (
    <p className="mb-3 text-[15px] leading-relaxed text-text last:mb-0" {...props} />
  ),
  ul: (props: React.ComponentPropsWithoutRef<'ul'>) => (
    <ul className="mb-3 list-disc space-y-1 pl-5 text-text" {...props} />
  ),
  ol: (props: React.ComponentPropsWithoutRef<'ol'>) => (
    <ol className="mb-3 list-decimal space-y-1 pl-5 text-text" {...props} />
  ),
  li: (props: React.ComponentPropsWithoutRef<'li'>) => (
    <li className="leading-relaxed" {...props} />
  ),
  strong: (props: React.ComponentPropsWithoutRef<'strong'>) => (
    <strong className="font-semibold text-text" {...props} />
  ),
  table: (props: React.ComponentPropsWithoutRef<'table'>) => (
    <div className="mb-3 overflow-x-auto">
      <table className="w-full border-collapse text-sm" {...props} />
    </div>
  ),
  th: (props: React.ComponentPropsWithoutRef<'th'>) => (
    <th className="border border-border bg-surface-hover px-2 py-1 text-left text-text" {...props} />
  ),
  td: (props: React.ComponentPropsWithoutRef<'td'>) => (
    <td className="border border-border px-2 py-1 text-text-muted" {...props} />
  ),
}

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

  // Sidebar's "New Research" button dispatches this so the form resets
  // even if the user is already on this page mid-session.
  useEffect(() => {
    const handleNewResearch = () => {
      setQuery('')
      setResult(null)
      setError(null)
    }
    window.addEventListener('cognigraph:new-research', handleNewResearch)
    return () =>
      window.removeEventListener('cognigraph:new-research', handleNewResearch)
  }, [])

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

  const handleDownload = async (format: 'pdf' | 'docx') => {
    if (!result?.session_id) return

    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) return

    try {
      const res = await fetch(
        `${API_URL}/sessions/${result.session_id}/export?format=${format}`,
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      )
      if (!res.ok) return

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
      // Non-fatal — user can just retry
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
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-signature">
                <span className="h-1.5 w-1.5 rounded-full bg-signature" /> Report
              </p>

              {/* Only shown once the session is actually persisted —
                  Visualize links to the Data Insights section on Session
                  Detail, downloads use the same export endpoint used there. */}
              {result.session_id && (
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/history/${result.session_id}#data-insights`}
                    className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-hover px-3 py-1.5 text-xs font-medium text-text transition hover:border-accent hover:text-accent"
                  >
                    <BarChart3 className="h-3.5 w-3.5" />
                    Visualize Report
                  </Link>
                  <button
                    onClick={() => handleDownload('pdf')}
                    className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-hover px-3 py-1.5 text-xs font-medium text-text transition hover:border-accent hover:text-accent"
                  >
                    <Download className="h-3.5 w-3.5" />
                    PDF
                  </button>
                  <button
                    onClick={() => handleDownload('docx')}
                    className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-hover px-3 py-1.5 text-xs font-medium text-text transition hover:border-accent hover:text-accent"
                  >
                    <Download className="h-3.5 w-3.5" />
                    DOCX
                  </button>
                </div>
              )}
            </div>

            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {result.final_report}
            </ReactMarkdown>
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