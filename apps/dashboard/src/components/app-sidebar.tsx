'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Radar, Activity, History, Network } from 'lucide-react'
import { cn } from '@/lib/utils'

// Stellate-style dark icon rail. Promotes the routes that used to live in the
// footer into a persistent left nav — the console's defining structural element.
const NAV = [
  { href: '/', label: 'Companies', icon: Radar, match: (p: string) => p === '/' || p.startsWith('/orgs') },
  { href: '/watchlist', label: 'Monitoring', icon: Activity, match: (p: string) => p.startsWith('/watchlist') },
  { href: '/runs', label: 'Scans', icon: History, match: (p: string) => p.startsWith('/runs') },
  { href: '/ontology', label: 'Matching', icon: Network, match: (p: string) => p.startsWith('/ontology') },
] as const

export function AppSidebar() {
  const pathname = usePathname()
  return (
    <aside className="sticky top-0 z-20 flex h-dvh w-16 shrink-0 flex-col items-center gap-1 border-r border-sidebar-border bg-sidebar py-3 text-sidebar-foreground">
      <Link
        href="/"
        aria-label="GTM Intelligence — home"
        className="mb-2 flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-panel"
      >
        {/* Faceted upward peak — a rising signal, folded in Stellate's origami idiom.
            Two opacities of the foreground read as one facet catching the light. */}
        <svg viewBox="0 0 24 24" fill="currentColor" className="size-5" aria-hidden>
          <path d="M12 3.5 21 20 12 15.5 3 20Z" opacity="0.95" />
          <path d="M12 3.5 12 15.5 3 20Z" opacity="0.55" />
        </svg>
      </Link>
      <nav aria-label="Primary" className="flex flex-1 flex-col items-center gap-1">
        {NAV.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname)
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex w-14 flex-col items-center gap-1 rounded-lg py-2 text-[10px] font-medium transition-colors',
                active
                  ? 'bg-sidebar-accent text-white'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-white',
              )}
            >
              <Icon className="size-5" strokeWidth={1.75} aria-hidden />
              {label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
