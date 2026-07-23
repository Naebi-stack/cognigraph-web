'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LibraryStyleProvider,
  useLibraryStyle,
  CitationStyle,
} from '@/context/library-style'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const RECENT_SESSIONS_LIMIT = 8

const NAV_ITEMS = [
  { href: '/research', label: 'Research', icon: '◈' },
  { href: '/dashboard', label: 'Dashboard', icon: '▦' },
  { href: '/history', label: 'History', icon: '◷' },
  { href: '/library', label: 'Library', icon: '▤' },
]

const STYLE_OPTIONS: { value: CitationStyle; label: string }[] = [
  { value: 'apa', label: 'APA' },
  { value: 'mla', label: 'MLA' },
  { value: 'chicago', label: 'Chicago' },
]

interface RecentSession {
  id: string
  query: string
}

function truncate(text: string, max = 32): string {
  return text.length > max ? text.slice(0, max) + '…' : text
}

function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const { style, setStyle } = useLibraryStyle()
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([])

  const isLibrary = pathname.startsWith('/library')

  // Recent sessions are fetched once per app load (not re-fetched on every
  // navigation) and refreshed whenever a new session gets created — see the
  // 'cognigraph:session-created' listener below.
  useEffect(() => {
    const loadRecent = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) return

      try {
        const res = await fetch(`${API_URL}/sessions`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (!res.ok) return
        const body: { sessions: RecentSession[] } = await res.json()
        setRecentSessions(body.sessions.slice(0, RECENT_SESSIONS_LIMIT))
      } catch {
        // Non-fatal — sidebar just shows no recent sessions
      }
    }

    loadRecent()

    // Research page dispatches this event after a successful run, so the
    // sidebar reflects the new session without needing a full page reload
    window.addEventListener('cognigraph:session-created', loadRecent)
    return () =>
      window.removeEventListener('cognigraph:session-created', loadRecent)
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="flex min-h-screen bg-bg text-text">
      <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-surface">
        <div className="px-5 py-6">
          <p className="text-lg font-semibold tracking-tight">
            Cogni<span className="text-accent">Graph</span>
          </p>
        </div>

        {/* min-h-0 lets the scrollable recent-sessions list inside this nav
            actually constrain to available height instead of growing the
            flex item and pushing Library / Sign out down/off. */}
        <nav className="flex-1 min-h-0 space-y-1 px-3 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const active = pathname.startsWith(item.href)
            return (
              <div key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                    active
                      ? 'bg-accent/15 text-accent'
                      : 'text-text-muted hover:bg-surface-hover hover:text-text'
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  {item.label}
                </Link>

                {/* Recent sessions — always visible, quick jump back into
                    a past report from anywhere in the app. Capped at a fixed
                    height and independently scrollable so a long list never
                    pushes Library / Sign out out of view. */}
                {item.href === '/history' && recentSessions.length > 0 && (
                  <div className="ml-8 mt-1 max-h-48 space-y-0.5 overflow-y-auto border-l border-border pl-3">
                    {recentSessions.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => router.push(`/history/${s.id}`)}
                        title={s.query}
                        className={`block w-full truncate rounded-md px-2 py-1 text-left text-xs transition ${
                          pathname === `/history/${s.id}`
                            ? 'text-accent'
                            : 'text-text-muted hover:text-text'
                        }`}
                      >
                        {truncate(s.query)}
                      </button>
                    ))}
                  </div>
                )}

                {/* Citation style sub-menu — only shown under Library,
                    only while a Library page is active */}
                {item.href === '/library' && isLibrary && (
                  <div className="ml-8 mt-1 space-y-0.5 border-l border-border pl-3">
                    {STYLE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setStyle(opt.value)}
                        className={`block w-full rounded-md px-2 py-1 text-left text-xs transition ${
                          style === opt.value
                            ? 'text-accent'
                            : 'text-text-muted hover:text-text'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        <div className="border-t border-border p-3">
          <button
            onClick={handleLogout}
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-text-muted transition hover:bg-surface-hover hover:text-text"
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <LibraryStyleProvider>
      <AppShell>{children}</AppShell>
    </LibraryStyleProvider>
  )
}