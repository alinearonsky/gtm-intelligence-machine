import Link from 'next/link'

// v1: only 'tt' has data. Lens-agnostic so 'ckms' drops in later.
const LENSES = [{ id: 'tt', label: 'Terminology Tool' }]

export function LensSwitcher({ active }: { active: string }) {
  return (
    <nav className="flex gap-2 text-sm">
      {LENSES.map((l) => (
        <Link key={l.id} href={`/?lens=${l.id}`}
          className={l.id === active ? 'font-semibold underline' : 'text-muted-foreground hover:underline'}>
          {l.label}
        </Link>
      ))}
    </nav>
  )
}
