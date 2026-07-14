'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { TableCell, TableRow } from '@/components/ui/table'
import type { OrgProfile } from '@/db/types'

export function PostingRow({ posting: p, evidenceQuote }: {
  posting: OrgProfile['postings'][number]
  evidenceQuote?: string
}) {
  const [open, setOpen] = useState(false)
  const hasDetail = p.seniority || p.clinicalDomain || p.teamContext || p.confidence != null || evidenceQuote

  return (
    <>
      <TableRow className={p.removedAt ? 'text-muted-foreground' : ''}>
        <TableCell>
          <a href={p.url} target="_blank" rel="noreferrer noopener" className="hover:underline">{p.title}</a>
          <div className="mt-1 flex flex-wrap items-center gap-1">
            {p.functionType === 'new-function' && <Badge variant="outline" className="text-[10px]">new function</Badge>}
            {p.functionType === 'backfill' && <Badge variant="outline" className="text-[10px] text-muted-foreground">backfill</Badge>}
            {p.standards.map((s) => <Badge key={s} variant="secondary" className="font-mono text-[10px]">{s}</Badge>)}
          </div>
        </TableCell>
        <TableCell className="text-muted-foreground">{p.location ?? '—'}</TableCell>
        <TableCell className="font-mono text-xs text-muted-foreground">{p.firstSeen.slice(0, 10)}</TableCell>
        <TableCell className="text-right">
          {p.removedAt && <Badge variant="outline" className="text-muted-foreground">removed</Badge>}
          {p.isBaseline && !p.removedAt && <Badge variant="outline" className="text-baseline">baseline</Badge>}
          {hasDetail && (
            <button type="button" onClick={() => setOpen((v) => !v)}
              className="ml-2 text-xs text-muted-foreground hover:text-foreground" aria-expanded={open}>
              {open ? 'Hide details' : 'Details'}
            </button>
          )}
        </TableCell>
      </TableRow>
      {open && hasDetail && (
        <TableRow>
          <TableCell colSpan={4} className="bg-muted/30 text-sm">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-4">
              {p.seniority && <div><dt className="text-xs text-muted-foreground">Seniority</dt><dd>{p.seniority}</dd></div>}
              {p.clinicalDomain && <div><dt className="text-xs text-muted-foreground">Domain</dt><dd>{p.clinicalDomain}</dd></div>}
              {p.teamContext && <div className="col-span-2"><dt className="text-xs text-muted-foreground">Team</dt><dd>{p.teamContext}</dd></div>}
              {p.confidence != null && <div><dt className="text-xs text-muted-foreground">Confidence</dt><dd className="font-mono">{p.confidence.toFixed(2)}</dd></div>}
            </dl>
            {evidenceQuote && <blockquote className="mt-2 border-l-2 pl-3 text-muted-foreground italic">{evidenceQuote}</blockquote>}
          </TableCell>
        </TableRow>
      )}
    </>
  )
}
