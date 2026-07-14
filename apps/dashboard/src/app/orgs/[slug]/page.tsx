import { notFound } from 'next/navigation'
import { cachedOrgProfile } from '@/db/cached'
import { SignalCard } from '@/components/signal-card'
import { PostingRow } from '@/components/posting-row'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EmptyState } from '@/components/empty-state'
import { cn } from '@/lib/utils'
import { priorityLabel, segmentLabel } from '@/lib/humanize'
import { standardsFootprint, newFunctionCount, topPriority, lastSignalDate } from '@/lib/org-rollup'
import type { PriorityT } from '@gtm/core'

export const dynamic = 'force-dynamic'

const PRIORITY_PILL: Record<PriorityT, string> = {
  'act-now': 'border-priority-act-now/40 bg-priority-act-now/10 text-priority-act-now-fg',
  watch: 'border-priority-watch/40 bg-priority-watch/10 text-priority-watch-fg',
  ignore: 'border-transparent bg-muted text-muted-foreground',
}

// Highest-intent signal first: rank by priority, then strength. Its rationale is
// the header "why now" line when no LLM narrative exists.
const PRIORITY_RANK: Record<string, number> = { 'act-now': 3, watch: 2, ignore: 1 }

export default async function OrgPage({ params, searchParams }: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ lens?: string }>
}) {
  const { slug } = await params
  const lens = (await searchParams).lens ?? 'tt'
  const org = await cachedOrgProfile(slug, lens)
  if (!org) notFound()

  const footprint = standardsFootprint(org)
  const standards = footprint.filter((s) => s !== 'other')
  const priority = topPriority(org)
  const lastSignal = lastSignalDate(org)
  const lead = [...org.signals].sort(
    (a, b) => (PRIORITY_RANK[b.priority] ?? 0) - (PRIORITY_RANK[a.priority] ?? 0) || b.strength - a.strength,
  )[0]
  const headline = org.narrative ?? lead?.rationale ?? null
  // externalId → the evidence quote that fired a signal, for posting-row detail.
  const evidenceByPosting = new Map<string, string>()
  for (const s of org.signals) for (const e of s.evidence) if (!evidenceByPosting.has(e.externalId)) evidenceByPosting.set(e.externalId, e.quote)

  return (
    <main className="mx-auto max-w-4xl space-y-8 px-8 py-6">
      <div className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1.5">
            <h1 className="text-xl font-semibold tracking-tight">{org.name}</h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="font-mono text-xs">{org.domain}</span>
              <Badge variant="outline">{segmentLabel(org.segment)}</Badge>
              {org.products.map((p) => (
                <Badge key={p} variant="secondary" className="font-mono text-[11px]">{p}</Badge>
              ))}
            </div>
          </div>
          {priority && (
            <span
              className={cn(
                'shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium',
                PRIORITY_PILL[priority],
              )}
            >
              {priorityLabel(priority)}
            </span>
          )}
        </div>

        {/* Why now — the headline. Prefer the LLM narrative; else the strongest signal's rationale. */}
        {headline && <p className="text-[15px] font-medium leading-snug text-foreground">{headline}</p>}

        {/* Supporting receipts — demoted below the headline, priority already shown as the pill above. */}
        <div className="flex flex-wrap gap-x-8 gap-y-4 rounded-lg border bg-secondary/60 p-4 text-sm shadow-panel">
          <Tile label="Standards named">
            {standards.length ? <span className="font-mono">{standards.join(' · ')}</span> : '—'}
          </Tile>
          <Tile label="New-function roles"><span className="font-mono">{newFunctionCount(org)}</span></Tile>
          <Tile label="Last signal"><span className="font-mono text-xs">{lastSignal ? lastSignal.slice(0, 10) : '—'}</span></Tile>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Signals</h2>
        {org.signals.length === 0 && <EmptyState message="No signals for this lens yet." />}
        {org.signals.map((s) => <SignalCard key={s.id} signal={s} />)}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Postings</h2>
        {org.postings.length === 0 && <EmptyState message="No postings recorded yet." />}
        {org.postings.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead><TableHead>Location</TableHead>
                <TableHead>First seen</TableHead><TableHead><span className="sr-only">Posting status</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {org.postings.map((p) => (
                <PostingRow key={p.externalId} posting={p} evidenceQuote={evidenceByPosting.get(p.externalId)} />
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </main>
  )
}

function Tile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <div className="text-[11px] font-medium uppercase tracking-wider text-primary/70">{label}</div>
      <div>{children}</div>
    </div>
  )
}
