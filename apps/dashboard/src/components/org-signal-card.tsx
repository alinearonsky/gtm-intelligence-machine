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
  'act-now': 'border-priority-act-now/40 bg-priority-act-now/10 text-priority-act-now',
  watch: 'border-priority-watch/40 bg-priority-watch/10 text-priority-watch',
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

      <CardContent className="space-y-4">
        <p className="text-sm leading-relaxed">{lead.rationale}</p>

        <div className="space-y-2 border-t pt-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {org.signals.length === 1 ? 'Signal' : `${org.signals.length} signals`}
          </p>
          <ul className="space-y-2">
            {org.signals.map((s) => (
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
        </div>
      </CardContent>

      <div className="flex items-center justify-between border-t px-6 py-3">
        <span className="text-xs text-muted-foreground">
          {rest > 0 ? `Lead signal shown above · ${rest} more` : 'One signal'}
        </span>
        <CopyBriefButton signal={lead} />
      </div>
    </Card>
  )
}
