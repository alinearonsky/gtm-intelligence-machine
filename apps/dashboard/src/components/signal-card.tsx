import Link from 'next/link'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EvidencePopover } from './evidence-popover'
import type { FeedSignal } from '@/db/types'

const PRIORITY_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  'act-now': 'default',
  watch: 'secondary',
  ignore: 'outline',
}

export function SignalCard({ signal }: { signal: FeedSignal }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <Link href={`/orgs/${signal.orgSlug}`} className="font-semibold hover:underline">
            {signal.orgName}
          </Link>
          <div className="text-sm text-muted-foreground">
            {signal.signalType} · {signal.stage} · strength {signal.strength}
          </div>
        </div>
        <Badge variant={PRIORITY_VARIANT[signal.priority] ?? 'outline'}>{signal.priority}</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm">{signal.rationale}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{signal.segment}</span>
          {signal.isBaselineAssessment && <Badge variant="outline">baseline</Badge>}
          <EvidencePopover evidence={signal.evidence} />
        </div>
      </CardContent>
    </Card>
  )
}
