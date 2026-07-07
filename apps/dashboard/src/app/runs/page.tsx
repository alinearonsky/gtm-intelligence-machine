import { cachedRunHealth } from '@/db/cached'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

export const dynamic = 'force-dynamic'

export default async function RunsPage() {
  const runs = await cachedRunHealth()
  return (
    <main className="mx-auto max-w-4xl space-y-4 p-6">
      <h1 className="text-2xl font-bold">Run health</h1>
      {runs.length === 0 && <p className="text-muted-foreground">No scan runs recorded yet.</p>}
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
              <TableCell>{new Date(r.finishedAt).toLocaleString()}</TableCell>
              <TableCell>{r.orgsScanned}</TableCell>
              <TableCell>{r.orgsFailed > 0 ? <Badge variant="destructive">{r.orgsFailed}</Badge> : 0}</TableCell>
              <TableCell>{r.postingsNew}</TableCell>
              <TableCell>{r.postingsRemoved}</TableCell>
              <TableCell className="text-xs">
                {r.errors.length === 0 ? '—' : r.errors.map((e) => `${e.orgSlug}: ${e.message}`).join('; ')}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </main>
  )
}
