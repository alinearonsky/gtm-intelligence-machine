'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'

const TABS = [
  { value: '', label: 'All' },
  { value: 'act-now', label: 'Act now' },
  { value: 'watch', label: 'Watch' },
] as const

export function PriorityTabs() {
  const pathname = usePathname()
  const sp = useSearchParams()
  const active = sp.get('priority') ?? ''

  return (
    <div role="tablist" aria-label="Priority" className="flex items-center gap-5">
      {TABS.map((t) => {
        const next = new URLSearchParams(sp)
        if (t.value) next.set('priority', t.value)
        else next.delete('priority')
        const qs = next.toString()
        return (
          <Link
            key={t.value || 'all'}
            href={qs ? `${pathname}?${qs}` : pathname}
            role="tab"
            aria-selected={t.value === active}
            className={cn(
              '-mb-px border-b-2 pb-2 text-sm font-medium transition-colors',
              t.value === active
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
          </Link>
        )
      })}
    </div>
  )
}
