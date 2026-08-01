'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  FlaskConical,
  LayoutDashboard,
  History as HistoryIcon,
  Library as LibraryIcon,
  Settings as SettingsIcon,
  Shield,
  FileText,
  LogOut,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'
import {
  LibraryStyleProvider,
  useLibraryStyle,
  CitationStyle,
} from '@/context/library-style'
import { TourProvider } from '@/context/tour-context'
import { DemoModeProvider } from '@/context/demo-mode-context'
import Welcome from '@/components/tour/welcome'
import HelpCenter from '@/components/help/help-center'
import DemoBanner from '@/components/help/demo-banner'
// Tour must never be server-rendered — react-joyride branches on
// `typeof window !== 'undefined'` internally, so a normal import would
// render `null` on the server but a real <div> on the client's first
// paint, causing a hydration mismatch that shifts every sibling after it
// (this is what broke <aside> below). ssr: false skips it during SSR
// entirely; it mounts client-side only, after hydration.
import dynamic from 'next/dynamic'
const Tour = dynamic(
  () => import('@/components/tour/tour').then((mod) => mod.Tour),
  { ssr: false }
)

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const RECENT_SESSIONS_LIMIT = 8

const NAV_ITEMS = [
  { href: '/research', label: 'Research', icon: FlaskConical },
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/history', label: 'History', icon: HistoryIcon },
  { href: '/library', label: 'Library', icon: LibraryIcon },
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

function truncate(text: string, max = 28): string {
  return text.length > max ? text.slice(0, max) + '…' : text
}

function getInitials(email: string | null, fullName?: string | null): string {
  if (fullName) {
    const parts = fullName.trim().split(/\s+/)
    return parts
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('')
  }
  return email ? email[0].toUpperCase() : '?'
}

function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const { style, setStyle } = useLibraryStyle()

  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([])
  const [collapsed, setCollapsed] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userFullName, setUserFullName] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  const profileMenuRef = useRef<HTMLDivElement>(null)

  const isLibrary = pathname.startsWith('/library')

  // Remember collapsed/expanded state across visits
  useEffect(() => {
    const stored = localStorage.getItem('cognigraph:sidebar-collapsed')
    if (stored === 'true') setCollapsed(true)
  }, [])

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem('cognigraph:sidebar-collapsed', String(next))
      return next
    })
  }

  // Profile info for the avatar/menu — Google sign-in populates full_name
  // and avatar_url in user_metadata; email/password accounts won't have
  // these, so the initials-circle fallback below covers that case.
  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return
      setUserEmail(user.email ?? null)
      setUserFullName((user.user_metadata?.full_name as string) ?? null)
      setAvatarUrl((user.user_metadata?.avatar_url as string) ?? null)
    }
    loadUser()
  }, [])

  // Close the profile menu on an outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(e.target as Node)
      ) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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

    window.addEventListener('cognigraph:session-created', loadRecent)
    return () =>
      window.removeEventListener('cognigraph:session-created', loadRecent)
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const displayName = userFullName || userEmail || ''
  const initials = getInitials(userEmail, userFullName)

  return (
    <div className="flex h-screen overflow-hidden bg-bg text-text">
      <Tour />
      <aside
        className={`flex shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-300 ease-in-out ${
          collapsed ? 'w-16' : 'w-64'
        }`}
      >
        {/* Header: logo + collapse toggle */}
        <div
          className={`flex items-center gap-2 px-3 py-5 ${
            collapsed ? 'justify-center' : 'justify-between'
          }`}
        >
          <div className="flex min-w-0 items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-mark.svg"
              alt="CogniGraph"
              className="h-6 w-6 shrink-0"
            />
            {!collapsed && (
              <p className="truncate text-lg font-semibold tracking-tight">
                Cogni<span className="text-accent">Graph</span>
              </p>
            )}
          </div>
          {!collapsed && (
            <button
              onClick={toggleCollapsed}
              aria-label="Collapse sidebar"
              className="rounded-lg p-1.5 text-text-muted transition hover:bg-surface-hover hover:text-text"
            >
              <PanelLeftClose className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Collapsed state moves the expand toggle to its own row below the
            logo, since the logo now always occupies the header row above */}
        {collapsed && (
          <div className="flex justify-center pb-2">
            <button
              onClick={toggleCollapsed}
              aria-label="Expand sidebar"
              className="rounded-lg p-1.5 text-text-muted transition hover:bg-surface-hover hover:text-text"
            >
              <PanelLeftOpen className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* New Research — always accessible from anywhere in the app.
            Dispatches an event (in addition to navigating) so the Research
            page can reset its own form/state even if the user is already
            on that route and clicks this again mid-session. */}
        <div className="px-2 pb-2">
          <button
            id="tour-new-research"
            onClick={() => {
              window.dispatchEvent(new Event('cognigraph:new-research'))
              router.push('/research')
            }}
            title={collapsed ? 'New Research' : undefined}
            className={`flex w-full items-center gap-2 rounded-lg border border-border bg-surface-hover px-3 py-2 text-sm font-medium text-text transition hover:border-accent hover:text-accent ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            <Plus className="h-4 w-4 shrink-0" />
            {!collapsed && 'New Research'}
          </button>
        </div>

        {/* Nav */}
        <nav className="sidebar-scroll flex-1 min-h-0 space-y-1 overflow-y-auto px-2">
          {NAV_ITEMS.map((item) => {
            const active = pathname.startsWith(item.href)
            const Icon = item.icon
            return (
              <div key={item.href}>
                <Link
                  // Tour target — see src/components/tour/tours.ts. Derived
                  // from href so adding a nav item keeps its tour anchor.
                  id={`tour-nav-${item.href.slice(1)}`}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                    collapsed ? 'justify-center' : ''
                  } ${
                    active
                      ? 'bg-accent/15 text-accent'
                      : 'text-text-muted hover:bg-surface-hover hover:text-text'
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {!collapsed && item.label}
                </Link>

                {/* Recent sessions — hidden entirely in icon-rail mode,
                    since there's no room to show titles meaningfully */}
                {!collapsed &&
                  item.href === '/history' &&
                  recentSessions.length > 0 && (
                    <div className="sidebar-scroll ml-8 mt-1 max-h-48 space-y-0.5 overflow-y-auto border-l border-border pl-3">
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
                    only while a Library page is active, and only expanded */}
                {!collapsed && item.href === '/library' && isLibrary && (
                  <div
                    id="tour-citation-style"
                    className="ml-8 mt-1 space-y-0.5 border-l border-border pl-3"
                  >
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

        {/* Profile — avatar/initials + menu (Settings, Privacy, Terms, Sign out) */}
        <div ref={profileMenuRef} className="relative border-t border-border p-2">
          {profileOpen && (
            <div
              className={`absolute bottom-full mb-1 space-y-0.5 rounded-lg border border-border bg-surface p-1 shadow-lg ${
                collapsed ? 'left-2 w-48' : 'left-2 right-2'
              }`}
            >
              <Link
                href="/settings"
                onClick={() => setProfileOpen(false)}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-text-muted transition hover:bg-surface-hover hover:text-text"
              >
                <SettingsIcon className="h-4 w-4" />
                Settings
              </Link>
              <Link
                href="/privacy"
                onClick={() => setProfileOpen(false)}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-text-muted transition hover:bg-surface-hover hover:text-text"
              >
                <Shield className="h-4 w-4" />
                Privacy Policy
              </Link>
              <Link
                href="/terms"
                onClick={() => setProfileOpen(false)}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-text-muted transition hover:bg-surface-hover hover:text-text"
              >
                <FileText className="h-4 w-4" />
                Terms of Service
              </Link>
              <div className="my-1 border-t border-border" />
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-text-muted transition hover:bg-surface-hover hover:text-text"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          )}

          <button
            onClick={() => setProfileOpen((prev) => !prev)}
            title={collapsed ? displayName : undefined}
            className={`flex w-full items-center gap-2 rounded-lg p-2 text-left transition hover:bg-surface-hover ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt=""
                className="h-7 w-7 shrink-0 rounded-full"
              />
            ) : (
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-medium text-white">
                {initials}
              </span>
            )}
            {!collapsed && (
              <span className="truncate text-sm text-text">{displayName}</span>
            )}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <DemoBanner />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>

      {/* Onboarding surfaces live at the shell level so they're reachable from
          every page, not just the dashboard. */}
      <Welcome />
      <HelpCenter />
    </div>
  )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <LibraryStyleProvider>
      <DemoModeProvider>
        <TourProvider>
          <AppShell>{children}</AppShell>
        </TourProvider>
      </DemoModeProvider>
    </LibraryStyleProvider>
  )
}