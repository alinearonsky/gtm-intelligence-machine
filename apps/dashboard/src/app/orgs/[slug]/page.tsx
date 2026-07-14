import { notFound } from 'next/navigation'
import { cachedOrgProfile } from '@/db/cached'
import { SignalCard } from '@/components/signal-card'
import { PostingRow } from '@/components/posting-row'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EmptyState } from '@/components/empty-state'
import { standardsFootprint, newFunctionCount, topPriority, lastSignalDate, rollupOneLiner } from '@/lib/org-rollup'

export const dynamic = 'force-dynamic'

export default async function OrgPage({ params, searchParams }: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ lens?: string }>
}) {
  const { slug } = await params
  const lens = (await searchParams).lens ?? 'tt'
  const org = await cachedOrgProfile(slug, lens)
  if (!org) notFound()

  const footprint = standardsFootprint(org)
  const priority = topPriority(org)
  const lastSignal = lastSignalDate(org)
  // externalId → the evidence quote that fired a signal, for posting-row detail.
  const evidenceByPosting = new Map<string, string>()
  for (const s of org.signals) for (const e of s.evidence) if (!evidenceByPosting.has(e.externalId)) evidenceByPosting.set(e.externalId, e.quote)

  return (
    <main className="mx-auto max-w-4xl space-y-8 p-6">
      <div className="space-y-3">
        <div className="space-y-1.5">
          <h1 className="text-xl font-semibold tracking-tight">{org.name}</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="font-mono text-xs">{org.domain}</span>
            <Badge variant="outline">{org.segment}</Badge>
            {org.products.map((p) => (
              <Badge key={p} variant="secondary" className="font-mono text-[11px]">{p}</Badge>
            ))}
          </div>
        </div>

        {org.narrative && <p className="text-sm leading-relaxed text-foreground/90">{org.narrative}</p>}

        <div className="flex flex-wrap gap-4 rounded-lg border bg-muted/20 p-3 text-sm">
          <Tile label="Standards">{footprint.length ? <span className="font-mono">{footprint.join(' · ')}</span> : '—'}</Tile>
          <Tile label="New-function roles"><span className="font-mono">{newFunctionCount(org)}</span></Tile>
          <Tile label="Priority">{priority ? <Badge variant="outline">{priority}</Badge> : '—'}</Tile>
          <Tile label="Last signal"><span className="font-mono text-xs">{lastSignal ? lastSignal.slice(0, 10) : '—'}</span></Tile>
        </div>
        <p className="text-xs text-muted-foreground">{rollupOneLiner(org)}</p>
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
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div>{children}</div>
    </div>
  )
}
