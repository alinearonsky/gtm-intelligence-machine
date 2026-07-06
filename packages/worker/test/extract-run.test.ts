import { describe, it, expect, vi } from 'vitest'
import type { WatchlistOrgT, RawPostingT, ExtractionT } from '@gtm/core'
import { diffPostings } from '@gtm/core'
import { MemoryStore } from '../src/store/memory.ts'
import { runExtraction } from '../src/extract/run.ts'
import type { Extractor } from '../src/extract/extractor.ts'

const ORG: WatchlistOrgT = { name: 'Fixture Health', domain: 'fixturehealth.example',
  segment: 'digital-health-startup', products: ['tt'], slug: 'fixturehealth', ats: 'greenhouse' }
const PF = () => ({ pass: true, matches: ['terminologist'] })
const post = (id: string, title: string): RawPostingT =>
  ({ externalId: id, title, url: `https://x.example/${id}`, location: null, department: null, description: 'd', publishedAt: null })

const ok: ExtractionT = { roleCategory: 'terminologist', seniority: 'senior', standardsMentioned: [],
  clinicalDomain: null, teamContext: null, functionType: 'new-function', confidence: 0.9 }

async function seed(s: MemoryStore, ...titles: [string, string][]) {
  const orgId = await s.upsertOrg(ORG)
  await s.applyDiff(orgId, diffPostings([], titles.map(([id, t]) => post(id, t))),
    { baseline: true, now: '2026-07-01T00:00:00.000Z', prefilter: PF })
  return orgId
}
const deps = (s: MemoryStore, extractor: Extractor) =>
  ({ store: s, extractor, promptVersion: 'ext-v1', model: 'claude-haiku-4-5', concurrency: 2, now: () => '2026-07-01T00:00:00.000Z' })

describe('runExtraction', () => {
  it('extracts each needing posting once and is idempotent on re-run', async () => {
    const s = new MemoryStore()
    await seed(s, ['1', 'A'], ['2', 'B'])
    const extract = vi.fn(async () => ok)
    const first = await runExtraction(deps(s, { extract }))
    expect(first.postingsExtracted).toBe(2)
    expect(extract).toHaveBeenCalledTimes(2)

    const second = await runExtraction(deps(s, { extract }))
    expect(second.postingsExtracted).toBe(0)
    expect(extract).toHaveBeenCalledTimes(2)
  })

  it('retries once, then parks a persistently failing posting', async () => {
    const s = new MemoryStore()
    await seed(s, ['1', 'A'])
    const extract = vi.fn(async () => { throw new Error('boom') })
    const summary = await runExtraction(deps(s, { extract }))
    expect(extract).toHaveBeenCalledTimes(2)
    expect(summary.postingsExtracted).toBe(0)
    expect(summary.postingsFailed).toBe(1)
    expect(await runExtraction(deps(s, { extract }))).toMatchObject({ postingsExtracted: 0, postingsFailed: 0 })
  })

  it('a transient failure that succeeds on retry is counted extracted', async () => {
    const s = new MemoryStore()
    await seed(s, ['1', 'A'])
    let n = 0
    const extract = vi.fn(async () => { if (n++ === 0) throw new Error('transient'); return ok })
    const summary = await runExtraction(deps(s, { extract }))
    expect(summary.postingsExtracted).toBe(1)
    expect(summary.postingsFailed).toBe(0)
  })
})
