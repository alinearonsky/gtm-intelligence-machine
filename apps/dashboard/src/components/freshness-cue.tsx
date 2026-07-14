import { Clock } from 'lucide-react'
import { relativeTime } from '@/lib/relative-time'

// Answers "how current is this feed?" — the one status the home view was missing.
// Honest about cadence (a daily scan), exact timestamp on hover.
export function FreshnessCue({ finishedAt }: { finishedAt: string }) {
  return (
    <span
      className="flex shrink-0 items-center gap-1.5 pt-1 text-xs text-muted-foreground"
      title={`Last scan finished ${new Date(finishedAt).toLocaleString()}`}
    >
      <Clock className="size-3.5" aria-hidden />
      Last scan {relativeTime(finishedAt)}
    </span>
  )
}
