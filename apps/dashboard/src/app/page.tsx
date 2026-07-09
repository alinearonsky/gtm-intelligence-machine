import { cachedSignalFeed, cachedFilterOptions } from '@/db/cached'
import { SignalCard } from '@/components/signal-card'
import { CopyBriefButton } from '@/components/copy-brief-button'
import { SignalStatusControls } from '@/components/signal-status-controls'
import { FilterBar } from '@/components/filter-bar'
import { EmptyState } from '@/components/empty-state'
import { isPrivate } from '@/lib/instance'

// Dynamic: reads request searchParams + live DB; caching handled in cached.ts.
export const dynamic = 'force-dynamic'

export default async function Home({ searchParams }: {
  searchParams: Promise<{ lens?: string; segment?: string; signalType?: string; minStrength?: string; status?: string }>
}) {
  const p = await searchParams
  const lens = p.lens ?? 'tt'
  const minStrengthNum = p.minStrength ? Number(p.minStrength) : undefined
  const [feed, filterOptions] = await Promise.all([
    cachedSignalFeed(lens, {
      segment: p.segment,
      signalType: p.signalType,
      minStrength: Number.isFinite(minStrengthNum) ? minStrengthNum : undefined,
      status: p.status,
    }),
    cachedFilterOptions(lens),
  ])
  const canWrite = isPrivate()

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6">
      <h1 className="text-xl font-semibold tracking-tight">Signal feed</h1>
      <FilterBar options={filterOptions} />
      {feed.length === 0 && <EmptyState message="No signals match — clear a filter or wait for the next scan." />}
      {feed.map((s) => (
        <SignalCard
          key={s.id}
          signal={s}
          footer={
            <>
              <CopyBriefButton signal={s} />
              {canWrite && <SignalStatusControls signalId={s.id} status={s.status} />}
            </>
          }
        />
      ))}
    </main>
  )
}
