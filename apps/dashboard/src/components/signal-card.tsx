import type { ReactNode } from 'react'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { EvidencePopover } from './evidence-popover'
import { signalTypeLabel, priorityLabel, signalMeaning, signalImplication } from '@/lib/humanize'
import type { FeedSignal } from '@/db/types'
import type { PriorityT } from '@gtm/core'

const PRIORITY_BORDER: Record<PriorityT, string> = {
  'act-now': 'border-l-priority-act-now',
  watch: 'border-l-priority-watch',
  ignore: 'border-l-priority-ignore',
}

const PRIORITY_TEXT: Record<PriorityT, string> = {
  'act-now': 'text-priority-act-now-fg',
  watch: 'text-priority-watch-fg',
  ignore: 'text-muted-foreground',
}

// One signal, four things: what it is (title), what it means, its implication,
// and a link to the evidence. Everything else the engine tracks (strength,
// stage, baseline) is deliberately kept off this card.
export function SignalCard({ signal, footer }: { signal: FeedSignal; footer?: ReactNode }) {
  return (
    <Card className={cn('border-l-2', PRIORITY_BORDER[signal.priority] ?? 'border-l-border')}>
      <CardHeader className="pb-0">
        <h3 className="text-base font-semibold tracking-tight">{signalTypeLabel(signal.signalType)}</h3>
      </CardHeader>
      <CardContent className="space-y-3 pt-3 text-sm">
        <Field label="What it means">{signalMeaning(signal.signalType)}</Field>
        <Field label="Implications">
          <span className={cn('font-medium', PRIORITY_TEXT[signal.priority] ?? 'text-muted-foreground')}>
            {priorityLabel(signal.priority)}
          </span>
          {' — '}
          {signalImplication(signal.signalType, signal.priority)}
        </Field>
        {signal.evidence.length > 0 && (
          <Field label="Evidence">
            <EvidencePopover evidence={signal.evidence} asLink />
          </Field>
        )}
      </CardContent>
      {footer && <CardFooter className="justify-between border-t pt-3">{footer}</CardFooter>}
    </Card>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-3">
      <span className="pt-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="leading-relaxed text-foreground">{children}</span>
    </div>
  )
}
