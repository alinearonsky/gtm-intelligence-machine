import { describe, it, expect } from 'vitest'
import { groupFeedByOrg } from './group-feed.ts'
import type { FeedSignal } from '../db/types.ts'

const sig = (over: Partial<FeedSignal>): FeedSignal => ({
  id: 1, orgId: 1, orgSlug: 'o', orgName: 'Org', domain: 'o.com', segment: 'payer',
  signalType: 'entering-adoption', stage: 'early', strength: 3, confidence: 0.8,
  isBaselineAssessment: false, status: 'new', createdAt: '2026-07-01T00:00:00.000Z',
  priority: 'watch', rationale: 'r', evidence: [], ...over,
})

describe('groupFeedByOrg', () => {
  it('collapses signals into one entry per org', () => {
    const orgs = groupFeedByOrg([
      sig({ id: 1, orgId: 10, orgSlug: 'a' }),
      sig({ id: 2, orgId: 10, orgSlug: 'a' }),
      sig({ id: 3, orgId: 20, orgSlug: 'b' }),
    ])
    expect(orgs).toHaveLength(2)
    expect(orgs.find((o) => o.orgSlug === 'a')!.signals).toHaveLength(2)
  })

  it("sets each org's topPriority to its strongest signal", () => {
    const [org] = groupFeedByOrg([
      sig({ id: 1, orgId: 10, priority: 'watch' }),
      sig({ id: 2, orgId: 10, priority: 'act-now' }),
    ])
    expect(org!.topPriority).toBe('act-now')
    expect(org!.signals[0]!.priority).toBe('act-now') // lead signal is the strongest
  })

  it('orders act-now orgs ahead of watch orgs', () => {
    const orgs = groupFeedByOrg([
      sig({ id: 1, orgId: 10, orgSlug: 'watch-org', priority: 'watch' }),
      sig({ id: 2, orgId: 20, orgSlug: 'act-org', priority: 'act-now' }),
    ])
    expect(orgs.map((o) => o.orgSlug)).toEqual(['act-org', 'watch-org'])
  })
})
