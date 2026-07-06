import { describe, it, expect } from 'vitest'
import { MemoryStore } from '../src/store/memory.ts'
import type { RawPostingT } from '@gtm/core'

const ORG = {
  name: 'Fixture Health', domain: 'fixturehealth.example',
  segment: 'digital-health-startup' as const, products: ['tt' as const], slug: 'fixturehealth',
}
function p(id: string, title: string): RawPostingT {
  return { externalId: id, title, url: `https://x.example/${id}`, location: null, department: null, description: 'SNOMED work', publishedAt: null }
}
const NOW = '2026-07-05T06:00:00.000Z'
const LATER = '2026-07-06T06:00:00.000Z'

describe('MemoryStore', () => {
  it('upsertOrg is idempotent by slug', async () => {
    const s = new MemoryStore()
    const a = await s.upsertOrg(ORG)
    const b = await s.upsertOrg({ ...ORG, name: 'Fixture Health Inc' })
    expect(a).toBe(b)
    expect((await s.getOrg(a))!.name).toBe('Fixture Health Inc')
  })

  it('orgHasHistory flips after the first applyDiff', async () => {
    const s = new MemoryStore()
    const id = await s.upsertOrg(ORG)
    expect(await s.orgHasHistory(id)).toBe(false)
    await s.applyDiff(id, { added: [p('1', 'Terminologist')], changed: [], removedExternalIds: [], unchangedExternalIds: [] },
      { baseline: true, now: NOW, prefilter: () => ({ pass: true, matches: ['terminologist'] }) })
    expect(await s.orgHasHistory(id)).toBe(true)
  })

  it('applyDiff inserts (baseline flag), updates last_seen, marks removed', async () => {
    const s = new MemoryStore()
    const id = await s.upsertOrg(ORG)
    await s.applyDiff(id, { added: [p('1', 'Terminologist'), p('2', 'Nurse')], changed: [], removedExternalIds: [], unchangedExternalIds: [] },
      { baseline: true, now: NOW, prefilter: (x) => ({ pass: x.title !== 'Nurse', matches: [] }) })

    let active = await s.listActivePostings(id)
    expect(active.map((a) => a.externalId).sort()).toEqual(['1', '2'])

    await s.applyDiff(id, { added: [], changed: [], removedExternalIds: ['2'], unchangedExternalIds: ['1'] },
      { baseline: false, now: LATER, prefilter: () => ({ pass: true, matches: [] }) })

    active = await s.listActivePostings(id)
    expect(active.map((a) => a.externalId)).toEqual(['1'])
    const all = s.dumpPostings(id) // test helper on MemoryStore only
    expect(all.find((x) => x.externalId === '2')!.removedAt).toBe(LATER)
    expect(all.find((x) => x.externalId === '1')!.lastSeen).toBe(LATER)
    expect(all.find((x) => x.externalId === '1')!.isBaseline).toBe(true)
    expect(all.find((x) => x.externalId === '2')!.prefilterPass).toBe(false)
  })

  it('changed postings get a new content hash and lastSeen', async () => {
    const s = new MemoryStore()
    const id = await s.upsertOrg(ORG)
    await s.applyDiff(id, { added: [p('1', 'Terminologist')], changed: [], removedExternalIds: [], unchangedExternalIds: [] },
      { baseline: true, now: NOW, prefilter: () => ({ pass: true, matches: [] }) })
    const changed = { ...p('1', 'Senior Terminologist') }
    await s.applyDiff(id, { added: [], changed: [changed], removedExternalIds: [], unchangedExternalIds: [] },
      { baseline: false, now: LATER, prefilter: () => ({ pass: true, matches: [] }) })
    const row = s.dumpPostings(id)[0]!
    expect(row.title).toBe('Senior Terminologist')
    expect(row.lastSeen).toBe(LATER)
    expect(row.isBaseline).toBe(true) // baseline flag sticks to the posting's first appearance
  })

  it('orgHasHistory flips even when the first scan found zero postings', async () => {
    const s = new MemoryStore()
    const id = await s.upsertOrg(ORG)
    await s.applyDiff(id, { added: [], changed: [], removedExternalIds: [], unchangedExternalIds: [] },
      { baseline: true, now: NOW, prefilter: () => ({ pass: true, matches: [] }) })
    expect(await s.orgHasHistory(id)).toBe(true) // empty board ≠ no scan; org must not stay baseline forever
  })

  it('upsertOrg clears a previously-set ats when the watchlist omits it', async () => {
    const s = new MemoryStore()
    const id = await s.upsertOrg({ ...ORG, ats: 'greenhouse' as const })
    await s.upsertOrg(ORG) // no ats key — watchlist is authoritative; detection takes over
    expect((await s.getOrg(id))!.ats).toBeUndefined()
  })

  it('re-adding a removed posting reopens it (fresh firstSeen, removedAt null)', async () => {
    const s = new MemoryStore()
    const id = await s.upsertOrg(ORG)
    await s.applyDiff(id, { added: [p('1', 'Terminologist')], changed: [], removedExternalIds: [], unchangedExternalIds: [] },
      { baseline: true, now: NOW, prefilter: () => ({ pass: true, matches: [] }) })
    await s.applyDiff(id, { added: [], changed: [], removedExternalIds: ['1'], unchangedExternalIds: [] },
      { baseline: false, now: LATER, prefilter: () => ({ pass: true, matches: [] }) })
    const REOPEN = '2026-07-07T06:00:00.000Z'
    await s.applyDiff(id, { added: [p('1', 'Terminologist')], changed: [], removedExternalIds: [], unchangedExternalIds: [] },
      { baseline: false, now: REOPEN, prefilter: () => ({ pass: true, matches: [] }) })
    const row = s.dumpPostings(id)[0]!
    expect(row.removedAt).toBeNull()
    expect(row.firstSeen).toBe(REOPEN)
    expect(row.isBaseline).toBe(false)
    expect((await s.listActivePostings(id)).map((a) => a.externalId)).toEqual(['1'])
  })

  it('applyDiff throws a legible error for an unknown externalId', async () => {
    const s = new MemoryStore()
    const id = await s.upsertOrg(ORG)
    await expect(
      s.applyDiff(id, { added: [], changed: [], removedExternalIds: ['ghost'], unchangedExternalIds: [] },
        { baseline: false, now: NOW, prefilter: () => ({ pass: true, matches: [] }) }),
    ).rejects.toThrow(/unknown externalId "ghost"/)
  })

  it('records runs', async () => {
    const s = new MemoryStore()
    await s.recordRun({ startedAt: NOW, finishedAt: LATER, orgsScanned: 2, orgsFailed: 1, postingsFound: 10, postingsNew: 3, postingsRemoved: 1, errors: [{ orgSlug: 'x', message: 'HTTP 500' }] })
    expect(s.runs).toHaveLength(1)
  })
})
