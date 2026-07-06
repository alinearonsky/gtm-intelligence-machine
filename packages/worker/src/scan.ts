import { diffPostings, type AtsTypeT, type RawPostingT, type WatchlistT } from '@gtm/core'
import type { AtsAdapter } from './ats/types.ts'
import { detectAts as defaultDetect } from './ats/index.ts'
import type { ScanRunResult, Store } from './store/types.ts'

export interface ScanDeps {
  store: Store
  adapters: Record<AtsTypeT, AtsAdapter>
  prefilter: (p: RawPostingT) => { pass: boolean; matches: string[] }
  now: () => string
  detect?: (slug: string) => Promise<AtsTypeT | null>
}

export async function runScan(watchlist: WatchlistT, deps: ScanDeps): Promise<ScanRunResult> {
  const detect = deps.detect ?? defaultDetect
  const startedAt = deps.now()
  const summary: ScanRunResult = {
    startedAt, finishedAt: startedAt, orgsScanned: 0, orgsFailed: 0,
    postingsFound: 0, postingsNew: 0, postingsRemoved: 0, errors: [],
  }

  for (const wlOrg of watchlist.orgs) {
    summary.orgsScanned++
    const orgId = await deps.store.upsertOrg(wlOrg)
    try {
      // Resolve ATS: config wins; else previously detected; else detect now.
      let ats: AtsTypeT | null = wlOrg.ats ?? (await deps.store.getOrg(orgId))!.atsDetected
      if (ats === null) {
        ats = await detect(wlOrg.slug)
        if (ats === null) throw new Error(`no ATS detected for slug "${wlOrg.slug}"`)
        await deps.store.setOrgAts(orgId, ats)
      }

      const fetched = await deps.adapters[ats].fetchPostings(wlOrg.slug)
      const existing = await deps.store.listActivePostings(orgId)
      const baseline = !(await deps.store.orgHasHistory(orgId))
      const diff = diffPostings(existing, fetched)
      await deps.store.applyDiff(orgId, diff, { baseline, now: deps.now(), prefilter: deps.prefilter })
      await deps.store.setOrgFailures(orgId, 0)

      summary.postingsFound += fetched.length
      summary.postingsNew += diff.added.length
      summary.postingsRemoved += diff.removedExternalIds.length
    } catch (e) {
      summary.orgsFailed++
      summary.errors.push({ orgSlug: wlOrg.slug, message: e instanceof Error ? e.message : String(e) })
      try {
        const org = await deps.store.getOrg(orgId)
        await deps.store.setOrgFailures(orgId, (org?.consecutiveFailures ?? 0) + 1)
      } catch (counterErr) {
        // failure bookkeeping must never kill the run — surface it in the summary instead
        summary.errors.push({ orgSlug: wlOrg.slug, message: `failure-counter update failed: ${counterErr instanceof Error ? counterErr.message : String(counterErr)}` })
      }
    }
  }

  summary.finishedAt = deps.now()
  await deps.store.recordRun(summary)
  return summary
}
