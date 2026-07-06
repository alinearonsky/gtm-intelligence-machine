import { describe, it, expect } from 'vitest'
import { runScan } from '../src/scan.ts'
import { MemoryStore } from '../src/store/memory.ts'
import type { AtsAdapter } from '../src/ats/types.ts'
import { AtsError } from '../src/ats/types.ts'
import type { RawPostingT, WatchlistT } from '@gtm/core'

function p(id: string, title: string): RawPostingT {
  return { externalId: id, title, url: `https://x.example/${id}`, location: null, department: null, description: 'SNOMED', publishedAt: null }
}
const org = (slug: string, ats?: 'greenhouse') => ({
  name: slug, domain: `${slug}.example`, segment: 'digital-health-startup' as const,
  products: ['tt' as const], slug, ...(ats ? { ats } : {}),
})
const NOW = () => '2026-07-05T06:00:00.000Z'
const PREFILTER = () => ({ pass: true, matches: ['terminologist'] })

function fakeAdapter(postingsBySlug: Record<string, RawPostingT[] | Error>): AtsAdapter {
  return {
    type: 'greenhouse',
    async probe() { return true },
    async fetchPostings(slug) {
      const v = postingsBySlug[slug]
      if (v === undefined) throw new AtsError('greenhouse', slug, 'HTTP 404')
      if (v instanceof Error) throw v
      return v
    },
  }
}

describe('runScan', () => {
  it('scans orgs, marks baseline on first scan, records a run summary', async () => {
    const store = new MemoryStore()
    const adapter = fakeAdapter({ alpha: [p('1', 'Terminologist')] })
    const wl: WatchlistT = { orgs: [org('alpha', 'greenhouse')] }

    const summary = await runScan(wl, { store, adapters: { greenhouse: adapter } as never, prefilter: PREFILTER, now: NOW })
    expect(summary.orgsScanned).toBe(1)
    expect(summary.orgsFailed).toBe(0)
    expect(summary.postingsNew).toBe(1)
    const orgId = 1
    expect(store.dumpPostings(orgId)[0]!.isBaseline).toBe(true)
  })

  it('second scan is not baseline and detects removals', async () => {
    const store = new MemoryStore()
    const wl: WatchlistT = { orgs: [org('alpha', 'greenhouse')] }
    await runScan(wl, { store, adapters: { greenhouse: fakeAdapter({ alpha: [p('1', 'A'), p('2', 'B')] }) } as never, prefilter: PREFILTER, now: NOW })
    const s2 = await runScan(wl, { store, adapters: { greenhouse: fakeAdapter({ alpha: [p('1', 'A')] }) } as never, prefilter: PREFILTER, now: () => '2026-07-06T06:00:00.000Z' })
    expect(s2.postingsRemoved).toBe(1)
    const rows = store.dumpPostings(1)
    expect(rows.find((r) => r.externalId === '2')!.removedAt).not.toBeNull()
    expect(rows.find((r) => r.externalId === '1')!.isBaseline).toBe(true) // set at first appearance, sticks
  })

  it('one org failing does not kill the run; failures are counted and recorded', async () => {
    const store = new MemoryStore()
    const wl: WatchlistT = { orgs: [org('bad', 'greenhouse'), org('good', 'greenhouse')] }
    const adapter = fakeAdapter({ good: [p('1', 'A')] }) // 'bad' → 404
    const summary = await runScan(wl, { store, adapters: { greenhouse: adapter } as never, prefilter: PREFILTER, now: NOW })
    expect(summary.orgsScanned).toBe(2)
    expect(summary.orgsFailed).toBe(1)
    expect(summary.errors[0]).toMatchObject({ orgSlug: 'bad' })
    expect(summary.postingsNew).toBe(1)
    const badOrg = await store.getOrg(1)
    expect(badOrg!.consecutiveFailures).toBe(1)
    const goodOrg = await store.getOrg(2)
    expect(goodOrg!.consecutiveFailures).toBe(0)
  })

  it('runs detection when org has no ats configured', async () => {
    const store = new MemoryStore()
    const wl: WatchlistT = { orgs: [org('mystery')] } // no ats
    const adapter = fakeAdapter({ mystery: [p('1', 'A')] })
    const summary = await runScan(wl, {
      store, adapters: { greenhouse: adapter } as never, prefilter: PREFILTER, now: NOW,
      detect: async () => 'greenhouse',
    })
    expect(summary.orgsFailed).toBe(0)
    expect((await store.getOrg(1))!.atsDetected).toBe('greenhouse')
  })

  it('a store failure during failure bookkeeping does not kill the run', async () => {
    const store = new MemoryStore()
    const flaky = Object.create(store) as MemoryStore
    flaky.getOrg = async () => { throw new Error('db blip') }
    const wl: WatchlistT = { orgs: [org('bad', 'greenhouse'), org('good', 'greenhouse')] }
    const adapter = fakeAdapter({ good: [p('1', 'A')] })
    const summary = await runScan(wl, { store: flaky, adapters: { greenhouse: adapter } as never, prefilter: PREFILTER, now: NOW })
    expect(summary.orgsScanned).toBe(2)
    expect(summary.errors.some((e) => e.message.includes('failure-counter update failed'))).toBe(true)
  })

  it('marks org failed when detection finds nothing', async () => {
    const store = new MemoryStore()
    const wl: WatchlistT = { orgs: [org('ghost')] }
    const summary = await runScan(wl, {
      store, adapters: {} as never, prefilter: PREFILTER, now: NOW, detect: async () => null,
    })
    expect(summary.orgsFailed).toBe(1)
    expect(summary.errors[0]!.message).toMatch(/no ATS detected/i)
  })
})
