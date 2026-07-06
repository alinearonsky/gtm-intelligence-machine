import { describe, it, expect } from 'vitest'
import type { WatchlistOrgT, RawPostingT } from '@gtm/core'
import { diffPostings } from '@gtm/core'
import { MemoryStore } from '../src/store/memory.ts'
import type { SignalRecord } from '../src/store/types.ts'

const ORG: WatchlistOrgT = { name: 'Fixture Health', domain: 'fixturehealth.example',
  segment: 'digital-health-startup', products: ['tt'], slug: 'fixturehealth', ats: 'greenhouse' }
const post = (id: string, title: string): RawPostingT =>
  ({ externalId: id, title, url: `https://x.example/${id}`, location: null, department: null, description: 'Maintain SNOMED value sets.', publishedAt: null })
const PF = () => ({ pass: true, matches: ['terminologist'] })

describe('signal store methods (memory)', () => {
  it('getOrgExtractionFacts joins the latest ok extraction to posting metadata', async () => {
    const s = new MemoryStore()
    const orgId = await s.upsertOrg(ORG)
    await s.applyDiff(orgId, diffPostings([], [post('1', 'Clinical Terminologist')]),
      { baseline: true, now: '2026-07-01T00:00:00.000Z', prefilter: PF })
    const [need] = await s.listPostingsNeedingExtraction(orgId, 'ext-v1')
    await s.upsertExtraction(need!.postingId, { roleCategory: 'terminologist', seniority: 'senior',
      standardsMentioned: ['SNOMED'], clinicalDomain: null, teamContext: null, functionType: 'new-function', confidence: 0.9 },
      { model: 'm', promptVersion: 'ext-v1', now: '2026-07-01T00:00:00.000Z' })

    const facts = await s.getOrgExtractionFacts(orgId)
    expect(facts).toHaveLength(1)
    expect(facts[0]).toMatchObject({ externalId: '1', roleCategory: 'terminologist', isBaseline: true, standardsMentioned: ['SNOMED'] })
    expect(facts[0]!.evidenceQuote).toContain('Clinical Terminologist')
  })

  it('failed extractions are excluded from facts', async () => {
    const s = new MemoryStore()
    const orgId = await s.upsertOrg(ORG)
    await s.applyDiff(orgId, diffPostings([], [post('1', 'x')]), { baseline: true, now: '2026-07-01T00:00:00.000Z', prefilter: PF })
    const [need] = await s.listPostingsNeedingExtraction(orgId, 'ext-v1')
    await s.markExtractionFailed(need!.postingId, { model: 'm', promptVersion: 'ext-v1', now: '2026-07-01T00:00:00.000Z' })
    expect(await s.getOrgExtractionFacts(orgId)).toEqual([])
  })

  it('upsertSignal is idempotent on (org, rule, evidence) and listSignals returns rows', async () => {
    const s = new MemoryStore()
    const orgId = await s.upsertOrg(ORG)
    const rec: SignalRecord = { orgId, signalType: 'entering-adoption', stage: 'early', strength: 4,
      ruleId: 'first-terminology-hire', evidenceKey: '1', evidence: [{ externalId: '1', url: 'https://x/1', quote: 'q' }],
      confidence: 0.9, isBaselineAssessment: false, rulesVersion: 1 }
    const id1 = await s.upsertSignal(rec)
    const id2 = await s.upsertSignal({ ...rec, strength: 5 })
    expect(id2).toBe(id1)
    const rows = await s.listSignals(orgId)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ id: id1, strength: 5, ruleId: 'first-terminology-hire' })
  })
})
