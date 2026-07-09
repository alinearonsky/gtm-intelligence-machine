import { cachedOrgsAdmin } from '@/db/cached'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/empty-state'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function WatchlistPage() {
  const orgs = (await cachedOrgsAdmin()).filter((o) => o.status === 'active')
  return (
    <main className="mx-auto max-w-4xl space-y-4 p-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Watchlist</h1>
        <p className="text-sm text-muted-foreground">
          Read-only. Orgs are curated in the watchlist YAML and picked up on the next scan.
        </p>
      </div>
      {orgs.length === 0 && <EmptyState message="No active orgs on the watchlist." />}
      {orgs.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Org</TableHead><TableHead>Segment</TableHead><TableHead>ATS</TableHead>
              <TableHead className="text-right">Active postings</TableHead><TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orgs.map((o) => (
              <TableRow key={o.id}>
                <TableCell>
                  {o.name}
                  <div className="font-mono text-xs text-muted-foreground">{o.domain}</div>
                </TableCell>
                <TableCell className="text-muted-foreground">{o.segment}</TableCell>
                <TableCell className="font-mono text-xs">{o.atsDetected ?? o.ats ?? '—'}</TableCell>
                <TableCell className={cn('text-right font-mono tabular-nums',
                  o.activePostings === 0 && 'text-muted-foreground')}>
                  {o.activePostings}
                </TableCell>
                <TableCell>
                  {o.consecutiveFailures >= 3
                    ? <Badge variant="destructive">needs-attention</Badge>
                    : o.consecutiveFailures >= 1
                      ? <span className="rounded-full border border-priority-act-now/40 bg-priority-act-now/10 px-2 py-0.5 font-mono text-[11px] text-priority-act-now">failing ×{o.consecutiveFailures}</span>
                      : <Badge variant="secondary">active</Badge>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </main>
  )
}
