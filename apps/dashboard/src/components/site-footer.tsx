import Link from 'next/link'

const LINKS = [
  { href: '/ontology', label: 'How matching works' },
  { href: '/watchlist', label: 'Monitoring' },
]

export function SiteFooter() {
  return (
    <footer className="mt-8 border-t">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-4 text-xs text-muted-foreground">
        <span>GTM Intelligence — hiring-signal timing for healthtech go-to-market.</span>
        <nav aria-label="Secondary" className="flex items-center gap-4">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-foreground">
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  )
}
