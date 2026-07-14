import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { TestDb } from '../../test/pgtest.ts'
import { startTestDb, seedFixture } from '../../test/pgtest.ts'
import { getSignalFeed, getOrgProfile, getFilterOptions } from './queries.ts'

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

  it('returns per-posting extraction facts and the lens narrative', async () => {
    await tdb.sql`insert into orgs (slug, name, domain, segment, products) values ('acme','Acme','acme.com','payer','{tt}')`
    const [org] = await tdb.sql`select id from orgs where slug='acme'`
    const id = org!.id as number
    await tdb.sql`insert into postings (org_id, external_id, content_hash, title, url, description, is_baseline, prefilter_pass, first_seen, last_seen)
              values (${id}, 'p1', 'h', 'Terminologist', 'https://acme.com/p1', 'd', false, true, now(), now())`
    const [postingRow] = await tdb.sql`select id from postings where external_id='p1'`
    const pid = postingRow!.id as number
    await tdb.sql`insert into extractions (posting_id, role_category, seniority, standards_mentioned, clinical_domain, team_context, function_type, confidence, model, prompt_version)
              values (${pid}, 'data-quality', 'senior', '{FHIR,SNOMED}', 'oncology', 'terminology team', 'new-function', 0.9, 'm', 'ext-v1')`
    await tdb.sql`insert into org_narratives (org_id, lens, narrative, model, prompt_version, source_signature)
              values (${id}, 'tt', 'Acme is adopting FHIR.', 'm', 'narr-v1', 'sig1')`

    const profile = await getOrgProfile(tdb.sql, 'acme', 'tt')
    expect(profile!.narrative).toBe('Acme is adopting FHIR.')
    const posting = profile!.postings[0]!
    expect(posting.standards).toEqual(['FHIR', 'SNOMED'])
    expect(posting.seniority).toBe('senior')
    expect(posting.clinicalDomain).toBe('oncology')
    expect(posting.functionType).toBe('new-function')
  })
})

describe('getFilterOptions', () => {
  it('returns distinct sorted segments, signal types, and statuses for the lens', async () => {
    const opts = await getFilterOptions(tdb.sql, 'tt')
    expect(opts.signalTypes).toContain('entering-adoption')
    expect(opts.segments).toContain('ehr-vendor')
    expect(opts.statuses.length).toBeGreaterThan(0)
    expect([...opts.segments].sort()).toEqual(opts.segments)
  })

  it('returns empty lists for a lens with no signals', async () => {
    const opts = await getFilterOptions(tdb.sql, 'nope')
    expect(opts).toEqual({ segments: [], signalTypes: [], statuses: [] })
  })
})

describe('retired orgs in the feed', () => {
  it("excludes retired orgs' signals and filter options", async () => {
    await tdb.sql`update orgs set status = 'retired' where slug = 'beta-labs'`
    try {
      const feed = await getSignalFeed(tdb.sql, 'tt', {})
      expect(feed.map((s) => s.orgSlug)).not.toContain('beta-labs')
      const opts = await getFilterOptions(tdb.sql, 'tt')
      expect(opts.signalTypes).not.toContain('entering-adoption')
    } finally {
      await tdb.sql`update orgs set status = 'active' where slug = 'beta-labs'`
    }
  })
})

describe('stale signals in the feed', () => {
  it('excludes stale by default, includes them when the status filter asks', async () => {
    await tdb.sql`update signals set status = 'stale' where id = (
      select s.id from signals s join orgs o on o.id = s.org_id where o.slug = 'beta-labs' limit 1)`
    try {
      const feed = await getSignalFeed(tdb.sql, 'tt', {})
      expect(feed.map((s) => s.orgSlug)).not.toContain('beta-labs')
      const stale = await getSignalFeed(tdb.sql, 'tt', { status: 'stale' })
      expect(stale.map((s) => s.orgSlug)).toContain('beta-labs')
    } finally {
      await tdb.sql`update signals set status = 'new' where status = 'stale'`
    }
  })
})
