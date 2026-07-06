import type { Store, ExtractionMeta } from '../store/types.ts'
import type { Extractor } from './extractor.ts'

export interface ExtractDeps {
  store: Store
  extractor: Extractor
  promptVersion: string
  model: string
  now: () => string
  concurrency?: number
  log?: (msg: string) => void
}

export interface ExtractSummary {
  orgsProcessed: number
  postingsExtracted: number
  postingsFailed: number
  errors: { postingId: number; message: string }[]
}

/** Run async fn over items with at most `n` in flight. Order-independent. */
async function pMap<T>(items: T[], n: number, fn: (item: T) => Promise<void>): Promise<void> {
  const queue = [...items]
  const workers = Array.from({ length: Math.max(1, Math.min(n, items.length)) }, async () => {
    while (queue.length) {
      const item = queue.shift()
      if (item === undefined) return
      await fn(item)
    }
  })
  await Promise.all(workers)
}

export async function runExtraction(deps: ExtractDeps): Promise<ExtractSummary> {
  const summary: ExtractSummary = { orgsProcessed: 0, postingsExtracted: 0, postingsFailed: 0, errors: [] }
  const meta = (): ExtractionMeta => ({ model: deps.model, promptVersion: deps.promptVersion, now: deps.now() })

  for (const orgId of await deps.store.listOrgIds()) {
    summary.orgsProcessed++
    const needing = await deps.store.listPostingsNeedingExtraction(orgId, deps.promptVersion)
    await pMap(needing, deps.concurrency ?? 4, async ({ postingId, posting }) => {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const ext = await deps.extractor.extract(posting)
          await deps.store.upsertExtraction(postingId, ext, meta())
          summary.postingsExtracted++
          return
        } catch (e) {
          if (attempt === 0) continue
          await deps.store.markExtractionFailed(postingId, meta())
          summary.postingsFailed++
          summary.errors.push({ postingId, message: e instanceof Error ? e.message : String(e) })
        }
      }
    })
  }
  deps.log?.(`extract: ${summary.postingsExtracted} ok, ${summary.postingsFailed} failed across ${summary.orgsProcessed} orgs`)
  return summary
}
