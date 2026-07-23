'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLibraryStyle } from '@/context/library-style'

type ExportFormat = 'text' | 'bibtex' | 'pdf' | 'docx'

interface Citation {
  id: string
  title: string
  url: string | null
  author: string | null
  publish_date: string | null
  source_type: 'web' | 'rag'
  tags: string[]
  added_at: string
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const EXPORT_FORMATS: { value: ExportFormat; label: string }[] = [
  { value: 'text', label: 'Export TXT' },
  { value: 'bibtex', label: 'Export BibTeX' },
  { value: 'pdf', label: 'Export PDF' },
  { value: 'docx', label: 'Export DOCX' },
]

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function LibraryPage() {
  const router = useRouter()
  const supabase = createClient()
  // Style now lives in the sidebar (shared context), not a page-level control
  const { style } = useLibraryStyle()

  const [citations, setCitations] = useState<Citation[]>([])
  const [formatted, setFormatted] = useState<Record<string, string>>({})
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [formatting, setFormatting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  const getToken = async (): Promise<string | null> => {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
      return null
    }
    return session.access_token
  }

  useEffect(() => {
    const load = async () => {
      const token = await getToken()
      if (!token) return

      try {
        const res = await fetch(`${API_URL}/citations`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error('Failed to load citation library.')

        const body: { citations: Citation[] } = await res.json()
        setCitations(body.citations)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const loadFormatted = useCallback(async () => {
    if (citations.length === 0) {
      setFormatted({})
      return
    }

    const token = await getToken()
    if (!token) return

    setFormatting(true)
    try {
      const results = await Promise.all(
        citations.map(async (c) => {
          const res = await fetch(
            `${API_URL}/citations/${c.id}/format?style=${style}`,
            { headers: { Authorization: `Bearer ${token}` } }
          )
          if (!res.ok) return [c.id, ''] as const
          const body: { formatted: string } = await res.json()
          return [c.id, body.formatted] as const
        })
      )
      setFormatted(Object.fromEntries(results))
    } finally {
      setFormatting(false)
    }
  }, [citations, style])

  useEffect(() => {
    loadFormatted()
  }, [loadFormatted])

  const handleCopy = async (id: string) => {
    const text = formatted[id]
    if (!text) return
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  const handleDelete = async (id: string) => {
    const token = await getToken()
    if (!token) return

    setDeletingId(id)
    try {
      const res = await fetch(`${API_URL}/citations/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to delete citation.')
      setCitations((prev) => prev.filter((c) => c.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setDeletingId(null)
    }
  }

  const handleExport = async (format: ExportFormat) => {
    const token = await getToken()
    if (!token) return

    setExporting(true)
    setError(null)
    try {
      const res = await fetch(
        `${API_URL}/citations/export?style=${style}&format=${format}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.detail || 'Export failed.')
      }

      const blob = await res.blob()
      const extension = { text: 'txt', bibtex: 'bib', pdf: 'pdf', docx: 'docx' }[format]
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `bibliography.${extension}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed.')
    } finally {
      setExporting(false)
    }
  }

  const filtered = citations.filter(
    (c) =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text">Reference Library</h1>
          <p className="mt-1 text-sm text-text-muted">
            Sources you've saved from research sessions, ready to cite or export.
          </p>
        </div>
        <span className="rounded-full border border-border bg-surface px-3 py-1 text-xs uppercase tracking-wide text-text-muted">
          Style: <span className="text-accent">{style}</span>
        </span>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search by title or tag..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-xs rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none"
        />

        <div className="ml-auto flex flex-wrap gap-2">
          {EXPORT_FORMATS.map((fmt) => (
            <button
              key={fmt.value}
              onClick={() => handleExport(fmt.value)}
              disabled={exporting || citations.length === 0}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-text hover:border-accent hover:text-accent disabled:cursor-default disabled:opacity-40"
            >
              {fmt.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-error">{error}</p>}

      {loading && <p className="text-sm text-text-muted">Loading library...</p>}

      {!loading && filtered.length === 0 && (
        <p className="text-sm text-text-muted">
          {citations.length === 0
            ? "Your library is empty. Add sources from a research session's detail page."
            : 'No citations match your search.'}
        </p>
      )}

      {!loading && filtered.length > 0 && (
        <ul className="space-y-3">
          {filtered.map((c) => (
            <li
              key={c.id}
              className="rounded-xl border border-border bg-surface p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-sm text-text">
                    {formatting ? 'Formatting...' : formatted[c.id] || c.title}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-text-muted">
                    <span className="rounded-full bg-bg px-2 py-0.5 uppercase">
                      {c.source_type}
                    </span>
                    <span>added {formatDate(c.added_at)}</span>
                    {c.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-accent/10 px-2 py-0.5 text-accent"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => handleCopy(c.id)}
                    disabled={!formatted[c.id]}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text hover:border-accent hover:text-accent disabled:opacity-40"
                  >
                    {copiedId === c.id ? 'Copied ✓' : 'Copy'}
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    disabled={deletingId === c.id}
                    className="rounded-lg border border-error/30 px-3 py-1.5 text-xs font-medium text-error hover:bg-error/10 disabled:opacity-40"
                  >
                    {deletingId === c.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}