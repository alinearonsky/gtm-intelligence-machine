import Link from 'next/link'
import { cachedRunHealth } from '@/db/cached'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ErrorCell } from '@/components/error-cell'
import { EmptyState } from '@/components/empty-state'

export const dynamic = 'force-dynamic'

export default async function RunsPage() {
  const runs = await cachedRunHealth()
  return (
    <main className="mx-auto max-w-4xl space-y-4 p-6">
      <div className="space-y-1">
        <Link href="/watchlist" className="text-xs text-muted-foreground hover:text-foreground">← Monitoring</Link>
        <h1 className="text-xl font-semibold tracking-tight">Scan history</h1>
      </div>
      {runs.length === 0 && <EmptyState message="No scan runs recorded yet." />}
      {runs.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Finished</TableHead><TableHead>Orgs</TableHead><TableHead>Failed</TableHead>
              <TableHead>New</TableHead><TableHead>Removed</TableHead><TableHead>Errors</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {runs.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs">{new Date(r.finishedAt).toLocaleString()}</TableCell>
                <TableCell className="font-mono tabular-nums">{r.orgsScanned}</TableCell>
                <TableCell className={r.orgsFailed > 0 ? 'font-mono font-medium tabular-nums text-priority-act-now' : 'font-mono tabular-nums text-muted-foreground'}>
                  {r.orgsFailed}
                </TableCell>
                <TableCell className="font-mono tabular-nums">{r.postingsNew}</TableCell>
                <TableCell className="font-mono tabular-nums">{r.postingsRemoved}</TableCell>
                <TableCell><ErrorCell errors={r.errors} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </main>
  )
}
