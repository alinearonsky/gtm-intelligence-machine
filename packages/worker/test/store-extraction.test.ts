import { describe, it, expect } from 'vitest'
import type { WatchlistOrgT, RawPostingT } from '@gtm/core'
import { diffPostings } from '@gtm/core'
import { MemoryStore } from '../src/store/memory.ts'

const ORG: WatchlistOrgT = { name: 'Fixture Health', domain: 'fixturehealth.example',
  segment: 'digital-health-startup', products: ['tt'], slug: 'fixturehealth', ats: 'greenhouse' }

function posting(id: string, title: string, description = 'd'): RawPostingT {
  return { externalId: id, title, url: `https://x.example/${id}`, location: null, department: null, description, publishedAt: null }
}
const PF = (p: RawPostingT) => ({ pass: /snomed|terminolog/i.test(`${p.title} ${p.description}`), matches: ['terminologist'] })

describe('extraction store methods (memory)', () => {
  it('lists only prefilter-pass postings needing extraction, then stops after upsert', async () => {
    const s = new MemoryStore()
    const orgId = await s.upsertOrg(ORG)
    const hit = posting('1', 'Clinical Terminologist', 'SNOMED')
    const miss = posting('2', 'Chef')
    await s.applyDiff(orgId, diffPostings([], [hit, miss]), { baseline: true, now: '2026-07-01T00:00:00.000Z', prefilter: PF })

    let need = await s.listPostingsNeedingExtraction(orgId, 'ext-v1')
    expect(need.map((n) => n.posting.externalId)).toEqual(['1'])

    await s.upsertExtraction(need[0]!.postingId, {
      roleCategory: 'terminologist', seniority: 'senior', standardsMentioned: ['SNOMED'],
      clinicalDomain: null, teamContext: null, functionType: 'new-function', confidence: 0.9,
    }, { model: 'claude-haiku-4-5', promptVersion: 'ext-v1', now: '2026-07-01T00:00:00.000Z' })

    need = await s.listPostingsNeedingExtraction(orgId, 'ext-v1')
    expect(need).toEqual([])
    need = await s.listPostingsNeedingExtraction(orgId, 'ext-v2')
    expect(need.map((n) => n.posting.externalId)).toEqual(['1'])
  })

  it('a failed extraction also stops re-listing at that prompt version', async () => {
    const s = new MemoryStore()
    const orgId = await s.upsertOrg(ORG)
    await s.applyDiff(orgId, diffPostings([], [posting('1', 'SNOMED Terminologist')]),
      { baseline: true, now: '2026-07-01T00:00:00.000Z', prefilter: PF })
    const [only] = await s.listPostingsNeedingExtraction(orgId, 'ext-v1')
    await s.markExtractionFailed(only!.postingId, { model: 'm', promptVersion: 'ext-v1', now: '2026-07-01T00:00:00.000Z' })
    expect(await s.listPostingsNeedingExtraction(orgId, 'ext-v1')).toEqual([])
  })

  it('listOrgIds returns every upserted org', async () => {
    const s = new MemoryStore()
    const a = await s.upsertOrg(ORG)
    const b = await s.upsertOrg({ ...ORG, slug: 'other', name: 'Other' })
    expect((await s.listOrgIds()).sort()).toEqual([a, b].sort())
  })
})
