import Link from 'next/link'
import { cachedOrgsAdmin, cachedRunHealth } from '@/db/cached'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/empty-state'
import { segmentLabel } from '@/lib/humanize'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: 'alert' }) {
  return (
    <div className="rounded-lg border bg-card px-4 py-3">
      <div className={cn('font-mono text-lg tabular-nums', tone === 'alert' && 'text-priority-act-now')}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  )
}

export default async function MonitoringPage() {
  const [allOrgs, runs] = await Promise.all([cachedOrgsAdmin(), cachedRunHealth()])
  const orgs = allOrgs.filter((o) => o.status === 'active')
  const latest = runs[0]
  const failing = orgs.filter((o) => o.consecutiveFailures >= 1).length

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Monitoring</h1>
        <p className="text-sm text-muted-foreground">
          Every company being tracked and whether the daily scan is healthy. Companies are curated
          in the watchlist config and picked up on the next scan.
        </p>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Companies tracked" value={orgs.length} />
        <Stat label="Scanning cleanly" value={orgs.length - failing} />
        <Stat label="Failing to scan" value={failing} tone={failing > 0 ? 'alert' : undefined} />
        <Stat
          label="Last scan"
          value={latest ? new Date(latest.finishedAt).toLocaleDateString() : '—'}
        />
      </section>

      {latest && (
        <p className="text-xs text-muted-foreground">
          Last run scanned {latest.orgsScanned} companies ({latest.orgsFailed} failed),
          found {latest.postingsNew} new postings and {latest.postingsRemoved} removed.{' '}
          <Link href="/runs" className="underline hover:text-foreground">Full scan history →</Link>
        </p>
      )}

      {orgs.length === 0 && <EmptyState message="No active companies being tracked." />}
      {orgs.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead><TableHead>Segment</TableHead><TableHead>ATS</TableHead>
              <TableHead className="text-right">Active postings</TableHead><TableHead>Scan status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orgs.map((o) => (
              <TableRow key={o.id}>
                <TableCell>
                  {o.name}
                  <div className="font-mono text-xs text-muted-foreground">{o.domain}</div>
                </TableCell>
                <TableCell className="text-muted-foreground">{segmentLabel(o.segment)}</TableCell>
                <TableCell className="font-mono text-xs">{o.atsDetected ?? o.ats ?? '—'}</TableCell>
                <TableCell className={cn('text-right font-mono tabular-nums',
                  o.activePostings === 0 && 'text-muted-foreground')}>
                  {o.activePostings}
                </TableCell>
                <TableCell>
                  {o.consecutiveFailures >= 3
                    ? <Badge variant="destructive">needs attention</Badge>
                    : o.consecutiveFailures >= 1
                      ? <span className="rounded-full border border-priority-act-now/40 bg-priority-act-now/10 px-2 py-0.5 font-mono text-[11px] text-priority-act-now">failing ×{o.consecutiveFailures}</span>
                      : <Badge variant="secondary">healthy</Badge>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </main>
  )
}
