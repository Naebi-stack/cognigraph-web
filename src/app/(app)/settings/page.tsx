'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLibraryStyle, CitationStyle } from '@/context/library-style'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const STYLE_OPTIONS: { value: CitationStyle; label: string; description: string }[] = [
  { value: 'apa', label: 'APA', description: '7th edition author-date style' },
  { value: 'mla', label: 'MLA', description: '9th edition style' },
  { value: 'chicago', label: 'Chicago', description: 'Notes-bibliography style' },
]

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()
  const { style, setStyle } = useLibraryStyle()

  const [email, setEmail] = useState<string | null>(null)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [isGoogleAccount, setIsGoogleAccount] = useState(false)
  const [nameLoading, setNameLoading] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)
  const [nameSuccess, setNameSuccess] = useState(false)

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Max iterations for the research agent — a per-browser preference
  // rather than account data, so it lives in localStorage. The Research
  // page reads this same key on load and falls back to 3 if it's never
  // been set.
  const [iterations, setIterations] = useState(3)

  useEffect(() => {
    const stored = localStorage.getItem('cognigraph:max-iterations')
    if (stored) setIterations(Number(stored))
  }, [])

  const handleIterationsChange = (value: number) => {
    setIterations(value)
    localStorage.setItem('cognigraph:max-iterations', String(value))
  }

  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setEmail(user?.email ?? null)

      const meta = user?.user_metadata ?? {}
      if (meta.first_name || meta.last_name) {
        setFirstName(meta.first_name ?? '')
        setLastName(meta.last_name ?? '')
      } else if (meta.full_name) {
        // Google accounts populate full_name but not first_name/last_name
        // separately — split it as a best-effort starting point that the
        // user can still correct.
        const parts = String(meta.full_name).trim().split(/\s+/)
        setFirstName(parts[0] ?? '')
        setLastName(parts.slice(1).join(' '))
      }

      setIsGoogleAccount(user?.app_metadata?.provider === 'google')
    }
    loadUser()
  }, [])

  const handleChangeName = async (e: React.FormEvent) => {
    e.preventDefault()
    setNameError(null)
    setNameSuccess(false)

    const trimmedFirst = firstName.trim()
    const trimmedLast = lastName.trim()

    if (!trimmedFirst || !trimmedLast) {
      setNameError('Please enter both a first and last name.')
      return
    }

    setNameLoading(true)
    const { error } = await supabase.auth.updateUser({
      data: {
        first_name: trimmedFirst,
        last_name: trimmedLast,
        full_name: `${trimmedFirst} ${trimmedLast}`,
      },
    })
    setNameLoading(false)

    if (error) {
      setNameError(error.message)
      return
    }

    setNameSuccess(true)
    // Sidebar reads user_metadata on its own load, not via shared state,
    // so it won't pick up the new name until next navigation/refresh —
    // acceptable here since this page doesn't own that component.
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError(null)
    setPasswordSuccess(false)

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.')
      return
    }
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters.')
      return
    }

    setPasswordLoading(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setPasswordLoading(false)

    if (error) {
      setPasswordError(error.message)
      return
    }

    setPasswordSuccess(true)
    setNewPassword('')
    setConfirmPassword('')
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  // Requires a DELETE /account endpoint on the backend using the Supabase
  // admin/service-role client — the anon-key client used elsewhere in this
  // app cannot delete a user's own auth record. Frontend is wired and ready;
  // this call will fail until that endpoint exists.
  const handleDeleteAccount = async () => {
    setDeleteError(null)
    setDeleteLoading(true)

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      router.push('/login')
      return
    }

    try {
      const res = await fetch(`${API_URL}/account`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.detail || 'Failed to delete account.')
      }

      await supabase.auth.signOut()
      router.push('/')
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-10 px-4 py-10">
      <h1 className="text-2xl font-semibold text-text">Settings</h1>

      {/* Account */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-text">Account</h2>

        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-xs text-text-muted">Signed in as</p>
          <p className="mt-1 text-sm text-text">{email ?? '\u2026'}</p>
        </div>

        <form
          onSubmit={handleChangeName}
          className="space-y-3 rounded-lg border border-border bg-surface p-4"
        >
          <p className="text-sm font-medium text-text">Name</p>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="first-name" className="text-xs text-text-muted">
                First name
              </label>
              <input
                id="first-name"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="last-name" className="text-xs text-text-muted">
                Last name
              </label>
              <input
                id="last-name"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          {nameError && (
            <p className="text-sm text-error" role="alert">
              {nameError}
            </p>
          )}
          {nameSuccess && (
            <p className="text-sm text-signature">
              Name updated. It'll show in the sidebar next time you navigate.
            </p>
          )}

          <button
            type="submit"
            disabled={nameLoading}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-hover disabled:opacity-50"
          >
            {nameLoading ? 'Saving...' : 'Save name'}
          </button>

          {isGoogleAccount && (
            <p className="text-xs text-text-muted">
              You signed up with Google — this only changes how your name
              appears in CogniGraph, not your Google account itself.
            </p>
          )}
        </form>

        <form
          onSubmit={handleChangePassword}
          className="space-y-3 rounded-lg border border-border bg-surface p-4"
        >
          <p className="text-sm font-medium text-text">Change password</p>

          <div className="space-y-1">
            <label htmlFor="new-password" className="text-xs text-text-muted">
              New password
            </label>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none"
              placeholder="At least 6 characters"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="confirm-password" className="text-xs text-text-muted">
              Confirm new password
            </label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none"
              placeholder="Repeat password"
            />
          </div>

          {passwordError && (
            <p className="text-sm text-error" role="alert">
              {passwordError}
            </p>
          )}
          {passwordSuccess && (
            <p className="text-sm text-signature">Password updated.</p>
          )}

          <button
            type="submit"
            disabled={passwordLoading || !newPassword}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-hover disabled:opacity-50"
          >
            {passwordLoading ? 'Updating...' : 'Update password'}
          </button>

          <p className="text-xs text-text-muted">
            Signed up with Google? Setting a password here also lets you sign
            in with email going forward.
          </p>
        </form>

        <button
          onClick={handleSignOut}
          className="w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-left text-sm text-text-muted transition hover:bg-surface-hover hover:text-text"
        >
          Sign out
        </button>
      </section>

      {/* Research defaults */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-text">Research defaults</h2>
        <p className="text-sm text-text-muted">
          Controls how many plan → search → critique rounds the agent runs
          before finalizing a report. Higher values can produce more
          thorough reports but take longer.
        </p>

        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="flex items-center justify-between">
            <label htmlFor="iterations" className="text-sm font-medium text-text">
              Max iterations
            </label>
            <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-sm font-medium text-accent">
              {iterations}
            </span>
          </div>
          <input
            id="iterations"
            type="range"
            min={1}
            max={10}
            value={iterations}
            onChange={(e) => handleIterationsChange(Number(e.target.value))}
            className="mt-3 w-full accent-accent"
          />
          <div className="mt-1 flex justify-between text-xs text-text-muted">
            <span>1</span>
            <span>10</span>
          </div>
        </div>
      </section>

      {/* Default citation style */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-text">
          Default citation style
        </h2>
        <p className="text-sm text-text-muted">
          Used across your Library and exports. You can still switch styles
          per-session from the sidebar while viewing Library.
        </p>
        <div className="grid grid-cols-3 gap-3">
          {STYLE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStyle(opt.value)}
              className={`rounded-lg border p-3 text-left transition ${
                style === opt.value
                  ? 'border-accent bg-accent/10'
                  : 'border-border bg-surface hover:bg-surface-hover'
              }`}
            >
              <p
                className={`text-sm font-medium ${
                  style === opt.value ? 'text-accent' : 'text-text'
                }`}
              >
                {opt.label}
              </p>
              <p className="mt-1 text-xs text-text-muted">{opt.description}</p>
            </button>
          ))}
        </div>
      </section>

      {/* Appearance — light theme deferred to v3 as its own design project */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-text">Appearance</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-accent bg-accent/10 p-4">
            <p className="text-sm font-medium text-accent">Dark</p>
            <p className="mt-1 text-xs text-text-muted">Current theme</p>
          </div>
          <div className="cursor-not-allowed rounded-lg border border-border bg-surface p-4 opacity-50">
            <p className="text-sm font-medium text-text">Light</p>
            <p className="mt-1 text-xs text-text-muted">
              Coming in a future update
            </p>
          </div>
        </div>
      </section>

      {/* Danger zone */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-error">Danger zone</h2>
        <div className="space-y-3 rounded-lg border border-error/40 bg-surface p-4">
          <p className="text-sm text-text">
            Deleting your account permanently removes your research
            sessions, uploaded documents, and citation library. This cannot
            be undone.
          </p>

          <div className="space-y-1">
            <label htmlFor="delete-confirm" className="text-xs text-text-muted">
              Type <span className="text-text">DELETE</span> to confirm
            </label>
            <input
              id="delete-confirm"
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text focus:border-error focus:outline-none"
            />
          </div>

          {deleteError && (
            <p className="text-sm text-error" role="alert">
              {deleteError}
            </p>
          )}

          <button
            onClick={handleDeleteAccount}
            disabled={deleteConfirmText !== 'DELETE' || deleteLoading}
            className="rounded-lg bg-error px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-40"
          >
            {deleteLoading ? 'Deleting...' : 'Delete my account'}
          </button>
        </div>
      </section>
    </div>
  )
}