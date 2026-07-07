import { cachedSignalFeed } from '@/db/cached'
import { SignalCard } from '@/components/signal-card'
import { CopyBriefButton } from '@/components/copy-brief-button'
import { SignalStatusControls } from '@/components/signal-status-controls'
import { LensSwitcher } from '@/components/lens-switcher'
import { isPrivate } from '@/lib/instance'

// Dynamic: reads request searchParams + live DB; caching handled in cached.ts.
export const dynamic = 'force-dynamic'

export default async function Home({ searchParams }: {
  searchParams: Promise<{ lens?: string; segment?: string; signalType?: string; minStrength?: string; status?: string }>
}) {
  const p = await searchParams
  const lens = p.lens ?? 'tt'
  const minStrengthNum = p.minStrength ? Number(p.minStrength) : undefined
  const feed = await cachedSignalFeed(lens, {
    segment: p.segment,
    signalType: p.signalType,
    minStrength: Number.isFinite(minStrengthNum) ? minStrengthNum : undefined,
    status: p.status,
  })
  const canWrite = isPrivate()

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6">
      <LensSwitcher active={lens} />
      <h1 className="text-2xl font-bold">Signal feed</h1>
      {feed.length === 0 && <p className="text-muted-foreground">No signals yet — the next scan will populate this.</p>}
      {feed.map((s) => (
        <div key={s.id} className="space-y-2">
          <SignalCard signal={s} />
          <div className="flex items-center justify-between px-1">
            <CopyBriefButton signal={s} />
            {canWrite && <SignalStatusControls signalId={s.id} status={s.status} />}
          </div>
        </div>
      ))}
    </main>
  )
}
