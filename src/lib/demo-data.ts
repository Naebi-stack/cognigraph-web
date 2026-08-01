/**
 * Sample data for the demo workspace.
 *
 * Shapes are kept structurally identical to the API responses the real pages
 * consume, so pages can assign these straight into state with no `as any`
 * cast — if an API type changes, this file becomes a type error, which is the
 * point.
 *
 * Timestamps are generated relative to load time. Hardcoded 2023 dates made
 * the dashboard's "sessions over time" chart look like a dead account.
 */

export interface DemoAnalyticsSummary {
  total_sessions: number
  avg_iterations: number
  avg_duration_seconds: number
  total_web_sources: number
  total_rag_sources: number
  avg_sources_per_session: number
}

export interface DemoSession {
  id: string
  user_id: string
  query: string
  final_report: string
  iterations: number
  total_queries_executed: number
  web_sources_count: number
  rag_sources_count: number
  research_plan: string
  final_critique: string
  duration_seconds: number
  created_at: string
}

export interface DemoCitation {
  id: string
  title: string
  url: string | null
  author: string | null
  publish_date: string | null
  source_type: 'web' | 'rag'
  tags: string[]
  added_at: string
}

/** ISO timestamp for `daysAgo` days before now, at a fixed-ish hour. */
function daysAgo(days: number, hour = 10): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(hour, 0, 0, 0)
  return d.toISOString()
}

export const demoAnalyticsSummary: DemoAnalyticsSummary = {
  total_sessions: 14,
  avg_iterations: 3.4,
  avg_duration_seconds: 168,
  total_web_sources: 61,
  total_rag_sources: 23,
  avg_sources_per_session: 6,
}

const SEED: {
  query: string
  report: string
  plan: string
  critique: string
  iterations: number
  queries: number
  web: number
  rag: number
  duration: number
  day: number
}[] = [
  {
    query: 'How is retrieval-augmented generation changing enterprise search?',
    report:
      'RAG has shifted enterprise search from keyword ranking to answer synthesis. Across the sources reviewed, three patterns recur: hybrid retrieval (dense + sparse) consistently outperforms either alone; chunking strategy affects answer quality more than model choice; and grounding citations inline is what actually drives user trust...',
    plan:
      '1. Establish how RAG pipelines are architected in production.\n2. Gather measured comparisons against keyword baselines.\n3. Identify failure modes teams report after rollout.\n4. Synthesize into an adoption picture with caveats.',
    critique:
      'Well grounded on architecture, but light on cost. A further round should look for reported inference spend per query.',
    iterations: 4,
    queries: 9,
    web: 7,
    rag: 2,
    duration: 214,
    day: 0,
  },
  {
    query: 'What does the evidence say about four-day work weeks?',
    report:
      'Trials in the UK, Iceland, and Japan report retained or improved output alongside notable drops in burnout scores. The strongest caveat is selection bias: participating firms opted in, skewing toward knowledge work with existing flexibility...',
    plan:
      '1. Locate the large published trials.\n2. Extract productivity and wellbeing measures.\n3. Check methodology and sample composition.\n4. Separate findings that generalize from those that do not.',
    critique:
      'Balanced treatment of limitations. Coverage of shift-based and manufacturing sectors is thin.',
    iterations: 3,
    queries: 7,
    web: 6,
    rag: 1,
    duration: 152,
    day: 1,
  },
  {
    query: 'Compare solid-state and lithium-ion batteries for grid storage',
    report:
      'Solid-state offers higher energy density and a better thermal safety profile, but for stationary grid storage those advantages matter less than cycle cost, where lithium-iron-phosphate currently dominates. Manufacturing scale, not chemistry, is the binding constraint...',
    plan:
      '1. Compare the two chemistries on density, safety, and cycle life.\n2. Find grid-scale deployment costs.\n3. Assess manufacturing readiness.\n4. Conclude on near-term suitability.',
    critique:
      'Clear comparison. Sourcing leans on vendor material; independent measurements would strengthen it.',
    iterations: 3,
    queries: 6,
    web: 5,
    rag: 2,
    duration: 147,
    day: 3,
  },
  {
    query: 'Summarize our internal Q3 research notes on churn drivers',
    report:
      'Across the uploaded interview notes and support transcripts, churn clusters around onboarding rather than pricing. Accounts that never completed a second workflow in week one churned at roughly triple the base rate...',
    plan:
      '1. Read the uploaded interview notes.\n2. Cross-reference support transcripts for repeated complaints.\n3. Group causes by lifecycle stage.\n4. Rank by frequency and severity.',
    critique:
      'Grounded almost entirely in internal documents, which is appropriate here. No external benchmark for comparison.',
    iterations: 2,
    queries: 4,
    web: 0,
    rag: 9,
    duration: 98,
    day: 4,
  },
  {
    query: 'What are the practical limits of current quantum error correction?',
    report:
      'Surface codes remain the leading approach, and recent results demonstrate below-threshold operation on small logical qubits. The gap to useful computation is dominated by physical qubit overhead — current estimates land in the thousands of physical qubits per logical one...',
    plan:
      '1. Establish the leading error-correction schemes.\n2. Find the most recent below-threshold demonstrations.\n3. Quantify overhead requirements.\n4. Map overhead against announced roadmaps.',
    critique:
      'Technically accurate and well cited. Could better distinguish peer-reviewed results from press announcements.',
    iterations: 5,
    queries: 11,
    web: 9,
    rag: 1,
    duration: 268,
    day: 6,
  },
  {
    query: 'How effective are carbon border adjustment mechanisms?',
    report:
      "The EU's CBAM is the only mechanism far enough along to assess, and early data covers reporting compliance rather than emissions outcomes. Modelling suggests meaningful leakage reduction in cement and steel, with weaker effects where supply chains can reroute...",
    plan:
      '1. Identify which jurisdictions have live mechanisms.\n2. Collect available outcome data.\n3. Review modelling of carbon leakage.\n4. Note where evidence does not yet exist.',
    critique:
      'Appropriately cautious given how little outcome data exists. Well structured.',
    iterations: 3,
    queries: 8,
    web: 8,
    rag: 0,
    duration: 176,
    day: 8,
  },
  {
    query: 'What is known about long-term effects of intermittent fasting?',
    report:
      'Trials beyond twelve months are scarce. Where they exist, weight-loss differences against continuous calorie restriction largely disappear, though some metabolic markers improve independently of weight change...',
    plan:
      '1. Find trials with 12+ month follow-up.\n2. Compare against continuous restriction arms.\n3. Separate weight from metabolic outcomes.\n4. Flag where evidence is short-term only.',
    critique:
      'Good at distinguishing strength of evidence. Adherence data deserves more weight.',
    iterations: 4,
    queries: 8,
    web: 7,
    rag: 2,
    duration: 191,
    day: 11,
  },
  {
    query: 'Which programming languages are gaining ground in systems work?',
    report:
      'Rust has moved from adoption experiments into shipped infrastructure at several major vendors, driven mostly by memory-safety mandates rather than performance. Zig and Go occupy narrower niches...',
    plan:
      '1. Gather adoption signals from large infrastructure projects.\n2. Identify the stated reasons for adoption.\n3. Check for counter-signals and reversals.\n4. Summarize the trend with caveats.',
    critique:
      'Reasonable, but adoption signals are drawn largely from public blog posts and may overstate the trend.',
    iterations: 3,
    queries: 6,
    web: 6,
    rag: 1,
    duration: 143,
    day: 14,
  },
]

export const demoSessionList: DemoSession[] = SEED.map((s, i) => ({
  id: `demo-${i + 1}`,
  user_id: 'demo-user',
  query: s.query,
  final_report: s.report,
  research_plan: s.plan,
  final_critique: s.critique,
  iterations: s.iterations,
  total_queries_executed: s.queries,
  web_sources_count: s.web,
  rag_sources_count: s.rag,
  duration_seconds: s.duration,
  created_at: daysAgo(s.day, 9 + (i % 8)),
}))

/**
 * Formats a demo citation client-side.
 *
 * The real Library calls `POST /citations/:id/format` per citation, which
 * would 404 for these synthetic ids. Demo mode needs formatting to work
 * locally because the Library tour points at the citation-style switcher —
 * a switcher that visibly does nothing would be worse than no demo at all.
 * This is deliberately approximate; the backend remains authoritative for
 * real citations.
 */
export function formatDemoCitation(
  citation: DemoCitation,
  style: 'apa' | 'mla' | 'chicago',
): string {
  const { author, title, url, publish_date } = citation
  const year = publish_date ? new Date(publish_date).getFullYear() : 'n.d.'
  const who = author ?? 'Unknown author'
  const where = url ?? 'Uploaded document'

  switch (style) {
    case 'mla':
      return `${who}. "${title}." ${year}, ${where}.`
    case 'chicago':
      return `${who}. "${title}." ${year}. ${where}.`
    case 'apa':
    default:
      return `${who} (${year}). ${title}. ${where}`
  }
}

export const demoCitations: DemoCitation[] = [
  {
    id: 'demo-c1',
    title: 'Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks',
    url: 'https://arxiv.org/abs/2005.11401',
    author: 'Lewis, P., Perez, E., Piktus, A.',
    publish_date: '2020-05-22',
    source_type: 'web',
    tags: ['rag', 'foundational'],
    added_at: daysAgo(0, 11),
  },
  {
    id: 'demo-c2',
    title: 'Going Public: Iceland’s Journey to a Shorter Working Week',
    url: 'https://autonomy.work/portfolio/icelandsww/',
    author: 'Haraldsson, G. D., Kellam, J.',
    publish_date: '2021-06-04',
    source_type: 'web',
    tags: ['labour', 'trials'],
    added_at: daysAgo(1, 14),
  },
  {
    id: 'demo-c3',
    title: 'Quantum Error Correction Below the Surface Code Threshold',
    url: 'https://www.nature.com/articles/s41586-024-08449-y',
    author: 'Google Quantum AI',
    publish_date: '2024-12-09',
    source_type: 'web',
    tags: ['quantum', 'peer-reviewed'],
    added_at: daysAgo(6, 16),
  },
  {
    id: 'demo-c4',
    title: 'Q3 Customer Interview Notes (internal)',
    url: null,
    author: 'Research Team',
    publish_date: null,
    source_type: 'rag',
    tags: ['internal', 'churn'],
    added_at: daysAgo(4, 10),
  },
  {
    id: 'demo-c5',
    title: 'Support Transcript Archive — Jul to Sep (internal)',
    url: null,
    author: null,
    publish_date: null,
    source_type: 'rag',
    tags: ['internal', 'churn', 'support'],
    added_at: daysAgo(4, 12),
  },
  {
    id: 'demo-c6',
    title: 'CBAM: Transitional Period Implementation Review',
    url: 'https://taxation-customs.ec.europa.eu/carbon-border-adjustment-mechanism_en',
    author: 'European Commission',
    publish_date: '2024-09-30',
    source_type: 'web',
    tags: ['climate', 'policy'],
    added_at: daysAgo(8, 15),
  },
]
