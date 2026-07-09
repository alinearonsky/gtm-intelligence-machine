import { notFound } from 'next/navigation'
import { cachedOrgProfile } from '@/db/cached'
import { SignalCard } from '@/components/signal-card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EmptyState } from '@/components/empty-state'

export const dynamic = 'force-dynamic'

export default async function OrgPage({ params, searchParams }: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ lens?: string }>
}) {
  const { slug } = await params
  const lens = (await searchParams).lens ?? 'tt'
  const org = await cachedOrgProfile(slug, lens)
  if (!org) notFound()

  return (
    <main className="mx-auto max-w-4xl space-y-8 p-6">
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
                <TableRow key={p.externalId} className={p.removedAt ? 'text-muted-foreground' : ''}>
                  <TableCell>
                    <a href={p.url} target="_blank" rel="noreferrer noopener" className="hover:underline">{p.title}</a>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{p.location ?? '—'}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{p.firstSeen.slice(0, 10)}</TableCell>
                  <TableCell className="text-right">
                    {p.removedAt && <Badge variant="outline" className="text-muted-foreground">removed</Badge>}
                    {p.isBaseline && !p.removedAt && <Badge variant="outline" className="text-baseline">baseline</Badge>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </main>
  )
}
