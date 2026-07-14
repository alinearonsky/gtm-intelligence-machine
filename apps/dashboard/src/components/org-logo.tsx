import { cn } from '@/lib/utils'

// Consistent monogram tile. We deliberately don't fetch external brand logos:
// the free logo endpoints are unreliable for small healthtech orgs (mix of
// 404s and blank 200s), which looks worse than a clean uniform monogram. A
// real logo source with caching can slot in behind this same API later.
export function OrgLogo({ name, className }: { domain?: string; name: string; className?: string }) {
  const letter = name.trim().charAt(0).toUpperCase() || '?'
  return (
    <span
      aria-hidden
      className={cn(
        'grid size-10 shrink-0 place-items-center rounded-md border bg-muted text-sm font-semibold text-muted-foreground',
        className,
      )}
    >
      {letter}
    </span>
  )
}
