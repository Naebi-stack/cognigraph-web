import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Handles the redirect back from Supabase after an OAuth provider (e.g.
// Google) completes sign-in. Supabase appends a `code` param; exchanging it
// here sets the session cookie before sending the user into the app.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // No code, or the exchange failed — send back to login with a flag the
  // login page can optionally read to show an error message.
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}