import Link from 'next/link'

export const metadata = {
  title: 'Privacy Policy — CogniGraph',
}

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-bg text-text">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-6">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          Cogni<span className="text-accent">Graph</span>
        </Link>
        <Link href="/" className="text-sm text-text-muted transition hover:text-text">
          ← Back home
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-24 pt-4">
        <h1 className="text-3xl font-semibold tracking-tight">Privacy Policy</h1>
        <p className="mt-2 text-sm text-text-muted">Last updated: [July 2026]</p>

        <div className="mt-6 rounded-lg border border-border border-l-2 border-l-signature bg-surface p-4 text-sm text-text-muted">
          This is a starting draft, not legal advice — it reflects what
          CogniGraph actually does with data today, but should be reviewed
          by a lawyer before it's treated as your binding policy,
          particularly for GDPR/CCPA-style obligations once real users'
          documents are involved.
        </div>

        <div className="mt-10 space-y-10 text-sm leading-relaxed text-text-muted">
          <section>
            <h2 className="text-lg font-semibold text-text">1. Overview</h2>
            <p className="mt-3">
              CogniGraph (&quot;we,&quot; &quot;us&quot;) is an AI research
              assistant that plans and runs research on your behalf,
              searches the web and any documents you upload, and produces
              cited reports. This policy explains what information we
              collect, how it&apos;s used, and who it&apos;s shared with.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text">
              2. Information we collect
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>
                <span className="text-text">Account information:</span> your
                email address, and if you sign in with Google, the basic
                profile information Google provides (name, email, profile
                photo).
              </li>
              <li>
                <span className="text-text">Research content:</span> the
                queries you submit, the reports, research plans, and
                critiques CogniGraph generates, and any web sources found
                during a session.
              </li>
              <li>
                <span className="text-text">Uploaded documents:</span> PDFs
                you upload for your personal document library (RAG), stored
                and indexed so CogniGraph can search them alongside the web.
              </li>
              <li>
                <span className="text-text">Citation library:</span> sources
                you save, along with any tags or formatting preferences you
                set.
              </li>
              <li>
                <span className="text-text">Usage data:</span> basic
                analytics such as session counts, iteration counts, and
                timestamps, used to power your dashboard.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text">
              3. How we use this information
            </h2>
            <p className="mt-3">We use the information above to:</p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>Run the research agent and generate your reports.</li>
              <li>
                Maintain your research history, citation library, and
                account settings.
              </li>
              <li>
                Show you aggregate stats about your own usage (dashboard,
                analytics).
              </li>
              <li>Authenticate you and keep your account secure.</li>
            </ul>
            <p className="mt-3">
              We do not sell your personal information or your research
              content.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text">
              4. Third-party services
            </h2>
            <p className="mt-3">
              To do its work, CogniGraph sends parts of your data to the
              following third-party services:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>
                <span className="text-text">Supabase</span> — hosts our
                database and authentication. Your account details, research
                sessions, and citation library are stored here.
              </li>
              <li>
                <span className="text-text">
                  LLM inference providers (currently Groq, transitioning to
                  OpenRouter/DeepSeek)
                </span>{' '}
                — your research queries, report text, and relevant excerpts
                from your uploaded documents are sent to these providers to
                generate plans, reports, critiques, and chart insights.
              </li>
              <li>
                <span className="text-text">Tavily</span> — used to run web
                searches on your behalf during a research session.
              </li>
              <li>
                <span className="text-text">Google</span> — if you choose
                Google sign-in, Google authenticates you and shares basic
                profile information with us.
              </li>
            </ul>
            <p className="mt-3">
              Each of these providers has its own privacy policy governing
              how they handle data sent to them. We only send what&apos;s
              necessary for them to perform their function (e.g. running a
              search, generating a report).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text">
              5. Data retention &amp; deletion
            </h2>
            <p className="mt-3">
              Your research sessions, uploaded documents, and citation
              library are retained until you delete them or close your
              account. You can delete individual citations and sessions from
              within the app. To request full account and data deletion,
              contact us at{' '}
              <span className="text-text">[willford.fx@gmail.com]</span>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text">6. Cookies</h2>
            <p className="mt-3">
              We use cookies set by Supabase to keep you signed in. We
              don&apos;t use third-party advertising or tracking cookies.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text">
              7. Your rights
            </h2>
            <p className="mt-3">
              Depending on where you live, you may have the right to access,
              correct, export, or delete your personal information. Contact
              us at <span className="text-text">[willford.fx@gmail.com]</span> to
              exercise these rights.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text">
              8. Children&apos;s privacy
            </h2>
            <p className="mt-3">
              CogniGraph is not directed at children under 13, and we do not
              knowingly collect information from them.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text">
              9. Changes to this policy
            </h2>
            <p className="mt-3">
              We may update this policy as CogniGraph evolves. We&apos;ll
              update the &quot;Last updated&quot; date above when we do.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text">10. Contact</h2>
            <p className="mt-3">
              Questions about this policy? Reach us at{' '}
              <span className="text-text">[willford.fx@gmail.com]</span>.
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}