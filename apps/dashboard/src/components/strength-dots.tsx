import { cn } from '@/lib/utils'

export function StrengthDots({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <span role="img" className="inline-flex items-center gap-1.5" aria-label={`strength ${value} of ${max}`}>
      <span aria-hidden className="flex gap-0.5">
        {Array.from({ length: max }, (_, i) => (
          <span key={i} className={cn('size-1.5 rounded-full', i < value ? 'bg-foreground' : 'bg-border')} />
        ))}
      </span>
      <span className="font-mono text-xs tabular-nums text-muted-foreground">{value}</span>
    </span>
  )
}
