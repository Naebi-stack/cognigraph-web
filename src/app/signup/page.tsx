'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// Pinned so the OAuth redirect always lands on the same host that set the
// PKCE verifier cookie — see login/page.tsx for the full explanation.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.13-.84 2.09-1.8 2.73v2.27h2.92c1.7-1.57 2.68-3.88 2.68-6.64z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.27c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.34C2.44 15.98 5.48 18 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.71a5.4 5.4 0 010-3.42V4.95H.96a9 9 0 000 8.1l3.01-2.34z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0 5.48 0 2.44 2.02.96 4.95l3.01 2.34C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  )
}

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  // Distinct from `error` on purpose — a successful signup pending email
  // confirmation is not a failure and shouldn't be styled like one.
  const [verificationSent, setVerificationSent] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const trimmedFirst = firstName.trim()
    const trimmedLast = lastName.trim()

    if (!trimmedFirst || !trimmedLast) {
      setError('Please enter your first and last name.')
      return
    }

    setLoading(true)

    // Stored in user_metadata under the same keys Google OAuth already
    // populates (full_name, avatar_url) — see layout.tsx's getInitials()/
    // displayName logic, which reads user_metadata.full_name regardless
    // of signup method. first_name/last_name are kept alongside in case
    // they're needed separately later (e.g. formal report headers).
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: trimmedFirst,
          last_name: trimmedLast,
          full_name: `${trimmedFirst} ${trimmedLast}`,
        },
      },
    })

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    // Email confirmation config affects this: if ON, data.session will be
    // null here and we show the "check your email" screen below. If OFF,
    // signUp returns an active session immediately and we go straight in.
    if (data.session) {
      router.push('/research')
      router.refresh()
    } else {
      setVerificationSent(true)
    }
  }

  const handleGoogleSignup = async () => {
    setError(null)
    setGoogleLoading(true)

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${SITE_URL}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
      setGoogleLoading(false)
    }
    // On success the browser redirects to Google, so no further action here.
  }

  if (verificationSent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg px-4">
        <div className="w-full max-w-sm space-y-5 text-center">
          <div className="flex items-center justify-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-mark.svg" alt="" className="h-5 w-5" />
            <p className="text-sm font-semibold tracking-tight text-text">
              Cogni<span className="text-accent">Graph</span>
            </p>
          </div>
          <div className="rounded-xl border border-border border-l-2 border-l-signature bg-surface p-6">
            <p className="text-2xl" aria-hidden="true">
              ✉️
            </p>
            <h1 className="mt-3 text-lg font-semibold text-text">
              Check your email
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-text-muted">
              We sent a confirmation link to{' '}
              <span className="text-text">{email}</span>. Click it to
              activate your account, then come back and log in.
            </p>
          </div>
          <p className="text-sm text-text-muted">
            Didn&apos;t get it? Check spam, or{' '}
            <button
              type="button"
              onClick={() => setVerificationSent(false)}
              className="text-accent underline"
            >
              try a different email
            </button>
            .
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm space-y-6">
        <div>
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-mark.svg" alt="" className="h-5 w-5" />
            <p className="text-sm font-semibold tracking-tight text-text">
              Cogni<span className="text-accent">Graph</span>
            </p>
          </div>
          <h1 className="mt-4 text-2xl font-semibold text-text">Sign up</h1>
          <p className="text-sm text-text-muted">
            Create your CogniGraph account
          </p>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignup}
          disabled={googleLoading}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface px-3 py-2.5 text-sm font-medium text-text transition hover:bg-surface-hover disabled:opacity-50"
        >
          <GoogleIcon />
          {googleLoading ? 'Redirecting...' : 'Continue with Google'}
        </button>

        <p className="text-center text-xs text-text-muted">
          By continuing, you agree to CogniGraph&apos;s{' '}
          <Link href="/terms" className="text-accent underline">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="text-accent underline">
            Privacy Policy
          </Link>
          .
        </p>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-text-muted">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="first-name" className="text-sm font-medium text-text">
                First name
              </label>
              <input
                id="first-name"
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none"
                placeholder="Ada"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="last-name" className="text-sm font-medium text-text">
                Last name
              </label>
              <input
                id="last-name"
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none"
                placeholder="Lovelace"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="email" className="text-sm font-medium text-text">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none"
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="text-sm font-medium text-text">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 pr-10 text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none"
                placeholder="At least 6 characters"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted transition hover:text-text"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-error" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-accent px-3 py-2.5 text-sm font-medium text-white transition hover:bg-accent-hover disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Sign up'}
          </button>
        </form>

        <p className="text-sm text-text-muted">
          Already have an account?{' '}
          <Link href="/login" className="text-accent underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  )
}