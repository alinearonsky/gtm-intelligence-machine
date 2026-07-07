import { cachedOrgsAdmin } from '@/db/cached'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

export const dynamic = 'force-dynamic'

export default async function WatchlistPage() {
  const orgs = await cachedOrgsAdmin()
  return (
    <main className="mx-auto max-w-4xl space-y-4 p-6">
      <div>
        <h1 className="text-2xl font-bold">Watchlist</h1>
        <p className="text-sm text-muted-foreground">
          Read-only. Orgs are curated in the watchlist YAML and picked up on the next scan.
        </p>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Org</TableHead><TableHead>Segment</TableHead><TableHead>ATS</TableHead>
            <TableHead>Active postings</TableHead><TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orgs.map((o) => (
            <TableRow key={o.id}>
              <TableCell>{o.name}<div className="text-xs text-muted-foreground">{o.domain}</div></TableCell>
              <TableCell>{o.segment}</TableCell>
              <TableCell>{o.atsDetected ?? o.ats ?? '—'}</TableCell>
              <TableCell>{o.activePostings}</TableCell>
              <TableCell>
                {o.consecutiveFailures >= 3
                  ? <Badge variant="destructive">needs-attention</Badge>
                  : <Badge variant="secondary">{o.status}</Badge>}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </main>
  )
}
