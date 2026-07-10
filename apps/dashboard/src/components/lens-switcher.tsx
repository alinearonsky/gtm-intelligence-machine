'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { FILTER_KEYS } from './filter-bar'

// v1: only 'tt' has data. Lens-agnostic so 'ckms' drops in later.
const LENSES = [{ id: 'tt', label: 'Terminology Tool' }]

export function LensSwitcher() {
  const pathname = usePathname()
  const sp = useSearchParams()
  const active = sp.get('lens') ?? 'tt'
  return (
    <nav aria-label="Lens" className="flex items-center gap-1">
      {LENSES.map((l) => {
        const next = new URLSearchParams(sp)
        next.set('lens', l.id)
        // filter values are lens-scoped; carrying them across lenses can
        // leave the feed filtered by an invisible, invalid value
        for (const k of FILTER_KEYS) next.delete(k)
        return (
          <Link key={l.id} href={`${pathname}?${next.toString()}`}
            aria-current={l.id === active ? 'true' : undefined}
            className={cn(
              'rounded-md border px-2 py-1 text-xs',
              l.id === active
                ? 'border-primary/30 bg-accent font-medium text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}>
            {l.label}
          </Link>
        )
      })}
    </nav>
  )
}
