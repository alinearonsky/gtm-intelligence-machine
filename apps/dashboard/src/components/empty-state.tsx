import { SearchX } from 'lucide-react'

// A no-results state should orient, not just announce absence — a quiet mark plus
// the caller's teaching message (e.g. "clear a filter or wait for the next scan").
export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed px-6 py-12 text-center">
      <SearchX className="size-6 text-muted-foreground/60" aria-hidden />
      <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
    </div>
  )
}
