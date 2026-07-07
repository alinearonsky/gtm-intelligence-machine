import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { TestDb } from '../../test/pgtest.ts'
import { startTestDb, seedFixture } from '../../test/pgtest.ts'
import { getSignalFeed, getOrgProfile } from './queries.ts'

let tdb: TestDb

beforeAll(async () => {
  tdb = await startTestDb()
  await seedFixture(tdb.sql)
})
afterAll(async () => { await tdb?.stop() })

describe('getSignalFeed', () => {
  it('returns one row per signal for the tt lens with correct org + priority', async () => {
    const feed = await getSignalFeed(tdb.sql, 'tt', {})
    expect(feed).toHaveLength(2)
    const beta = feed.find((s) => s.orgSlug === 'beta-labs')!
    expect(beta.priority).toBe('act-now')
    expect(beta.signalType).toBe('entering-adoption')
    expect(beta.evidence.map((e) => e.externalId).sort()).toEqual(['b1', 'b2'])
    const acme = feed.find((s) => s.orgSlug === 'acme-health')!
    expect(acme.evidence).toHaveLength(1)
    expect(acme.evidence[0]!.quote).toBe('Acme quote')
  })

  it('filters by minStrength', async () => {
    const feed = await getSignalFeed(tdb.sql, 'tt', { minStrength: 3 })
    expect(feed.map((s) => s.orgSlug)).toEqual(['beta-labs'])
  })
})

describe('getOrgProfile', () => {
  it('returns the org with only its own signals', async () => {
    const profile = await getOrgProfile(tdb.sql, 'beta-labs', 'tt')
    expect(profile).not.toBeNull()
    expect(profile!.signals).toHaveLength(1)
    expect(profile!.signals[0]!.evidence).toHaveLength(2)
  })
})
