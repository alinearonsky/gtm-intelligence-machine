import Link from 'next/link'
import type { ReactNode } from 'react'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { EvidencePopover } from './evidence-popover'
import { StrengthDots } from './strength-dots'
import type { FeedSignal } from '@/db/types'
import type { PriorityT } from '@gtm/core'

const PRIORITY_BORDER: Record<PriorityT, string> = {
  'act-now': 'border-l-priority-act-now',
  watch: 'border-l-priority-watch',
  ignore: 'border-l-priority-ignore',
}

const PRIORITY_PILL: Record<PriorityT, string> = {
  'act-now': 'border-priority-act-now/40 bg-priority-act-now/10 text-priority-act-now',
  watch: 'border-priority-watch/40 bg-priority-watch/10 text-priority-watch',
  ignore: 'border-transparent bg-muted text-muted-foreground',
}

export function SignalCard({ signal, footer }: { signal: FeedSignal; footer?: ReactNode }) {
  return (
    <Card className={cn('border-l-2', PRIORITY_BORDER[signal.priority] ?? 'border-l-border')}>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link href={`/orgs/${signal.orgSlug}`} className="font-semibold tracking-tight hover:underline">
              {signal.orgName}
            </Link>
            <Badge variant="outline" className="font-mono text-[11px] font-normal text-muted-foreground">
              {signal.segment}
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="font-mono">{signal.signalType}</span>
            <span>{signal.stage}</span>
            <StrengthDots value={signal.strength} />
          </div>
        </div>
        <span className={cn('rounded-full border px-2 py-0.5 font-mono text-[11px]',
          PRIORITY_PILL[signal.priority] ?? PRIORITY_PILL.ignore)}>
          {signal.priority}
        </span>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm leading-relaxed">{signal.rationale}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {signal.isBaselineAssessment && (
            <Badge variant="outline" className="text-baseline">baseline</Badge>
          )}
          <EvidencePopover evidence={signal.evidence} />
        </div>
      </CardContent>
      {footer && <CardFooter className="justify-between border-t pt-3">{footer}</CardFooter>}
    </Card>
  )
}
