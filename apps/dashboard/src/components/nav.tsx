'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const LINKS = [
  { href: '/', label: 'Signals', match: (p: string) => p === '/' || p.startsWith('/orgs') },
  { href: '/watchlist', label: 'Watchlist', match: (p: string) => p.startsWith('/watchlist') },
  { href: '/ontology', label: 'Ontology', match: (p: string) => p.startsWith('/ontology') },
  { href: '/runs', label: 'Run health', match: (p: string) => p.startsWith('/runs') },
]

export function Nav() {
  const pathname = usePathname()
  return (
    <nav className="flex items-center gap-1">
      {LINKS.map((l) => {
        const active = l.match(pathname)
        return (
          <Link key={l.href} href={l.href} aria-current={active ? 'page' : undefined}
            className={cn(
              'rounded-md px-2.5 py-1.5 text-sm transition-colors',
              active ? 'bg-secondary font-medium text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}>
            {l.label}
          </Link>
        )
      })}
    </nav>
  )
}
