import { describe, it, expect } from 'vitest'
import { fileURLToPath } from 'node:url'
import type { WatchlistOrgT, RawPostingT } from '@gtm/core'
import { diffPostings, loadRules, loadLens } from '@gtm/core'
import { MemoryStore } from '../src/store/memory.ts'
import { runInterpret } from '../src/interpret/run.ts'

const rules = loadRules(fileURLToPath(new URL('../../../ontology/signal-rules.yaml', import.meta.url)))
const tt = loadLens(fileURLToPath(new URL('../../../ontology/lenses/tt.yaml', import.meta.url)))
const ORG: WatchlistOrgT = { name: 'Fixture Health', domain: 'fixturehealth.example',
  segment: 'digital-health-startup', products: ['tt'], slug: 'fixturehealth', ats: 'greenhouse' }
const post = (id: string): RawPostingT =>
  ({ externalId: id, title: 'Clinical Terminologist', url: `https://x/${id}`, location: null, department: null, description: 'SNOMED', publishedAt: null })

async function seed(s: MemoryStore, baseline: boolean) {
  const orgId = await s.upsertOrg(ORG)
  await s.applyDiff(orgId, diffPostings([], [post('1')]),
    { baseline, now: '2026-07-01T00:00:00.000Z', prefilter: () => ({ pass: true, matches: ['terminologist'] }) })
  const [need] = await s.listPostingsNeedingExtraction(orgId, 'ext-v1')
  await s.upsertExtraction(need!.postingId, { roleCategory: 'terminologist', seniority: 'senior',
    standardsMentioned: ['SNOMED'], clinicalDomain: null, teamContext: null, functionType: 'new-function', confidence: 0.9 },
    { model: 'm', promptVersion: 'ext-v1', now: '2026-07-01T00:00:00.000Z' })
  return orgId
}

describe('runInterpret (with lens)', () => {
  it('scores a post-baseline first-hire as act-now for TT', async () => {
    const s = new MemoryStore()
    await seed(s, false)
    const summary = await runInterpret({ store: s, rules, lenses: [tt] })
    expect(summary.lensScoresWritten).toBeGreaterThan(0)
    const scores = s.dumpLensScores()
    expect(scores.some((x) => x.lens === 'tt' && x.priority === 'act-now')).toBe(true)
  })

  it('a baseline org never produces an act-now lens score', async () => {
    const s = new MemoryStore()
    await seed(s, true)
    await runInterpret({ store: s, rules, lenses: [tt] })
    expect(s.dumpLensScores().every((x) => x.priority !== 'act-now')).toBe(true)
  })
})
