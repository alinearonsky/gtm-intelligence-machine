import { describe, it, expect } from 'vitest'
import { buildOutreachBrief } from './brief.ts'
import type { FeedSignal } from '../db/types.ts'

const signal: FeedSignal = {
  id: 1, orgId: 10, orgSlug: 'beta-labs', orgName: 'Beta Labs', domain: 'beta.example', segment: 'ehr-vendor',
  signalType: 'entering-adoption', stage: 'early', strength: 4, confidence: 0.9,
  isBaselineAssessment: false, status: 'new', createdAt: '2026-07-01T00:00:00.000Z',
  priority: 'act-now', rationale: 'Beta Labs: prime trial window.',
  evidence: [{ externalId: 'b1', url: 'https://beta.example/b1', quote: 'Terminology lead wanted' }],
}

describe('buildOutreachBrief', () => {
  it('produces markdown with org, signal, rationale, and evidence quote + link', () => {
    const md = buildOutreachBrief(signal)
    expect(md).toContain('# Beta Labs — entering-adoption')
    expect(md).toContain('Priority: act-now')
    expect(md).toContain('Beta Labs: prime trial window.')
    expect(md).toContain('> Terminology lead wanted')
    expect(md).toContain('https://beta.example/b1')
  })

  it('includes every evidence item', () => {
    const md = buildOutreachBrief({ ...signal, evidence: [
      { externalId: 'b1', url: 'https://beta.example/b1', quote: 'Quote one' },
      { externalId: 'b2', url: 'https://beta.example/b2', quote: 'Quote two' },
    ]})
    expect(md).toContain('> Quote one')
    expect(md).toContain('> Quote two')
    expect(md).toContain('https://beta.example/b2')
  })
})
