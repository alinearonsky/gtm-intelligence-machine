import { describe, it, expect } from 'vitest'
import type { WatchlistOrgT } from '@gtm/core'
import { MemoryStore } from '../src/store/memory.ts'
import type { SignalRecord } from '../src/store/types.ts'

const ORG: WatchlistOrgT = { name: 'Fixture Health', domain: 'fixturehealth.example',
  segment: 'digital-health-startup', products: ['tt'], slug: 'fixturehealth', ats: 'greenhouse' }

describe('lens store method (memory)', () => {
  it('upserts a lens score idempotently on (signal, lens)', async () => {
    const s = new MemoryStore()
    const orgId = await s.upsertOrg(ORG)
    const rec: SignalRecord = { orgId, signalType: 'entering-adoption', stage: 'early', strength: 4,
      ruleId: 'first-terminology-hire', evidenceKey: '1', evidence: [], confidence: 0.9, isBaselineAssessment: false, rulesVersion: 1 }
    const signalId = await s.upsertSignal(rec)

    await s.upsertLensScore({ signalId, lens: 'tt', priority: 'act-now', rationale: 'a', rubricVersion: 1 })
    await s.upsertLensScore({ signalId, lens: 'tt', priority: 'watch', rationale: 'b', rubricVersion: 1 })
    const scores = s.dumpLensScores()
    expect(scores).toHaveLength(1)
    expect(scores[0]).toMatchObject({ signalId, lens: 'tt', priority: 'watch' })
  })
})
