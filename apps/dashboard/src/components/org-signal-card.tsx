import Link from 'next/link'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { OrgLogo } from './org-logo'
import { EvidencePopover } from './evidence-popover'
import { StrengthDots } from './strength-dots'
import { CopyBriefButton } from './copy-brief-button'
import { SignalStatusControls } from './signal-status-controls'
import { signalTypeLabel, stageLabel, stageHint, segmentLabel, priorityLabel } from '@/lib/humanize'
import type { PriorityT } from '@gtm/core'
import type { FeedOrg } from '@/lib/group-feed'

const PRIORITY_BORDER: Record<PriorityT, string> = {
  'act-now': 'border-l-priority-act-now',
  watch: 'border-l-priority-watch',
  ignore: 'border-l-border',
}

const PRIORITY_PILL: Record<PriorityT, string> = {
  'act-now': 'border-priority-act-now/40 bg-priority-act-now/10 text-priority-act-now-fg',
  watch: 'border-priority-watch/40 bg-priority-watch/10 text-priority-watch-fg',
  ignore: 'border-transparent bg-muted text-muted-foreground',
}

export function OrgSignalCard({ org, canWrite = false }: { org: FeedOrg; canWrite?: boolean }) {
  const lead = org.signals[0]!
  const rest = org.signals.length - 1

  return (
    <Card className={cn('border-l-2', PRIORITY_BORDER[org.topPriority])}>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <OrgLogo domain={org.domain} name={org.orgName} />
          <div className="space-y-0.5">
            <Link
              href={`/orgs/${org.orgSlug}`}
              className="text-lg font-semibold leading-tight tracking-tight transition-colors hover:text-primary"
            >
              {org.orgName}
            </Link>
            <p className="text-sm text-muted-foreground">{segmentLabel(org.segment)}</p>
          </div>
        </div>
        <span
          className={cn(
            'shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium',
            PRIORITY_PILL[org.topPriority],
          )}
        >
          {priorityLabel(org.topPriority)}
        </span>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Why now — the one line that drives the reach-out decision. This is the headline. */}
        <p className="text-[15px] font-medium leading-snug text-foreground">{lead.rationale}</p>

        {/* Strongest signal, framed as the outreach hook — one click to its evidence. */}
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Top signal
          </span>
          <span className="font-medium">{signalTypeLabel(lead.signalType)}</span>
          <span className="text-muted-foreground" title={stageHint(lead.stage)}>
            {stageLabel(lead.stage)}
          </span>
          <StrengthDots value={lead.strength} />
          {lead.isBaselineAssessment && (
            <Badge variant="outline" className="text-baseline">baseline</Badge>
          )}
          <span className="ml-auto flex items-center gap-1">
            <EvidencePopover evidence={lead.evidence} />
            {canWrite && <SignalStatusControls signalId={lead.id} status={lead.status} />}
          </span>
        </div>

        {/* Everything else the engine found — collapsed so the eye lands on the decision, not the telemetry. */}
        {rest > 0 && (
          <details className="group border-t pt-2">
            <summary className="flex cursor-pointer list-none items-center text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
              <span className="group-open:hidden">Show {rest} more signal{rest === 1 ? '' : 's'}</span>
              <span className="hidden group-open:inline">Hide extra signals</span>
            </summary>
            <ul className="mt-2 space-y-2">
              {org.signals.slice(1).map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <span className="font-medium">{signalTypeLabel(s.signalType)}</span>
                  <span className="text-xs text-muted-foreground" title={stageHint(s.stage)}>
                    {stageLabel(s.stage)}
                  </span>
                  <StrengthDots value={s.strength} />
                  {s.isBaselineAssessment && (
                    <Badge variant="outline" className="text-baseline">baseline</Badge>
                  )}
                  <span className="ml-auto flex items-center gap-1">
                    <EvidencePopover evidence={s.evidence} />
                    {canWrite && <SignalStatusControls signalId={s.id} status={s.status} />}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </CardContent>

      <div className="flex items-center justify-between border-t px-6 py-3">
        <span className="text-xs text-muted-foreground">
          {org.signals.length} signal{org.signals.length === 1 ? '' : 's'} found
        </span>
        <CopyBriefButton signal={lead} />
      </div>
    </Card>
  )
}
