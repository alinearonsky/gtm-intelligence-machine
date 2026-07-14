import { cachedSignalFeed, cachedFilterOptions } from '@/db/cached'
import { OrgSignalCard } from '@/components/org-signal-card'
import { PriorityTabs } from '@/components/priority-tabs'
import { FilterBar } from '@/components/filter-bar'
import { EmptyState } from '@/components/empty-state'
import { groupFeedByOrg } from '@/lib/group-feed'
import { isPrivate } from '@/lib/instance'

// Dynamic: reads request searchParams + live DB; caching handled in cached.ts.
export const dynamic = 'force-dynamic'

export default async function Home({ searchParams }: {
  searchParams: Promise<{ lens?: string; segment?: string; signalType?: string; minStrength?: string; status?: string; priority?: string }>
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
      priority: p.priority,
    }),
    cachedFilterOptions(lens),
  ])
  const orgs = groupFeedByOrg(feed)
  const canWrite = isPrivate()

  return (
    <main className="mx-auto max-w-3xl space-y-5 p-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Companies to watch</h1>
        <p className="text-sm text-muted-foreground">
          Healthtech orgs whose hiring shows they may be entering a buying window — highest-priority first.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <PriorityTabs />
        <span className="text-xs text-muted-foreground">
          {orgs.length} {orgs.length === 1 ? 'company' : 'companies'}
        </span>
      </div>

      <FilterBar options={filterOptions} />

      {orgs.length === 0 && <EmptyState message="No companies match — clear a filter or wait for the next scan." />}

      <div className="space-y-4">
        {orgs.map((org) => (
          <OrgSignalCard key={org.orgId} org={org} canWrite={canWrite} />
        ))}
      </div>
    </main>
  )
}
