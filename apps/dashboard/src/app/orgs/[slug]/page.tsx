import { notFound } from 'next/navigation'
import { cachedOrgProfile } from '@/db/cached'
import { SignalCard } from '@/components/signal-card'

export const dynamic = 'force-dynamic'

export default async function OrgPage({ params, searchParams }: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ lens?: string }>
}) {
  const { slug } = await params
  const lens = (await searchParams).lens ?? 'tt'
  const org = await cachedOrgProfile(slug, lens)
  if (!org) notFound()

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">{org.name}</h1>
        <p className="text-sm text-muted-foreground">{org.segment} · {org.domain} · {org.products.join(', ')}</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Signals</h2>
        {org.signals.length === 0 && <p className="text-muted-foreground">No signals for this lens yet.</p>}
        {org.signals.map((s) => <SignalCard key={s.id} signal={s} />)}
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Postings</h2>
        <ul className="space-y-1 text-sm">
          {org.postings.map((p) => (
            <li key={p.externalId} className={p.removedAt ? 'text-muted-foreground line-through' : ''}>
              <a href={p.url} target="_blank" rel="noreferrer noopener" className="hover:underline">{p.title}</a>
              {p.isBaseline && ' · baseline'}{p.location ? ` · ${p.location}` : ''}
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
