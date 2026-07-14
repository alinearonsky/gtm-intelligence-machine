import { describe, it, expect } from 'vitest'
import { MemoryStore } from '../src/store/memory.ts'
import { runNarrate } from '../src/narrate/run.ts'
import type { Narrator } from '../src/narrate/narrator.ts'

async function seedOrgWithSignal(store: MemoryStore) {
  const orgId = await store.upsertOrg({ slug: 'acme', name: 'Acme', domain: 'acme.com', segment: 'payer', products: ['tt'] })
  await store.applyDiff(orgId, {
    added: [{ externalId: 'p1', url: 'https://x/p1', title: 'Terminologist', description: 'FHIR', location: null, department: null, publishedAt: null }],
    changed: [], removedExternalIds: [], unchangedExternalIds: [],
  }, { baseline: false, now: '2026-07-13T00:00:00Z', prefilter: () => ({ pass: true, matches: [] }) })
  const pid = (await store.listPostingsNeedingExtraction(orgId, 'ext-v1'))[0]!.postingId
  await store.upsertExtraction(pid, { roleCategory: 'data-quality', seniority: 'senior', standardsMentioned: ['FHIR'], clinicalDomain: null, teamContext: null, functionType: 'new-function', confidence: 0.9 }, { model: 'm', promptVersion: 'ext-v1', now: '2026-07-13T00:00:00Z' })
  const sid = await store.upsertSignal({ orgId, signalType: 'standards-adoption', stage: 'mid', strength: 4, ruleId: 'r1', evidenceKey: 'k1', evidence: [], confidence: 0.9, isBaselineAssessment: false, rulesVersion: 1 })
  await store.upsertLensScore({ signalId: sid, lens: 'tt', priority: 'act-now', rationale: 'why', rubricVersion: 2 })
  return orgId
}

const fakeNarrator = (text: string): Narrator => ({ narrate: async () => text })

describe('runNarrate', () => {
  it('generates on first run, skips when signature unchanged', async () => {
    const store = new MemoryStore()
    await seedOrgWithSignal(store)
    const narrator = fakeNarrator('Acme is adopting FHIR in a new data-quality role.')

    const first = await runNarrate({ store, narrator, lenses: ['tt'] })
    expect(first.generated).toBe(1)
    const second = await runNarrate({ store, narrator, lenses: ['tt'] })
    expect(second.generated).toBe(0)
    expect(second.skipped).toBe(1)
  })

  it('counts a guardrail failure without throwing', async () => {
    const store = new MemoryStore()
    await seedOrgWithSignal(store)
    const badNarrator: Narrator = { narrate: async () => { throw new Error('narrator names standard "SNOMED"') } }
    const summary = await runNarrate({ store, narrator: badNarrator, lenses: ['tt'] })
    expect(summary.failed).toBe(1)
    expect(summary.generated).toBe(0)
  })

  it('skips orgs with no scored signal', async () => {
    const store = new MemoryStore()
    await store.upsertOrg({ slug: 'empty', name: 'Empty', domain: 'e.com', segment: 'payer', products: ['tt'] })
    const summary = await runNarrate({ store, narrator: fakeNarrator('x'), lenses: ['tt'] })
    expect(summary.generated).toBe(0)
    expect(summary.orgsProcessed).toBe(1)
  })
})
