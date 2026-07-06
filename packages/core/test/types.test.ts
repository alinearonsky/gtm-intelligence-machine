import { describe, it, expect } from 'vitest'
import { RawPosting, WatchlistOrg, contentHash } from '../src/index.ts'

describe('schemas', () => {
  it('accepts a valid RawPosting', () => {
    const p = RawPosting.parse({
      externalId: '123',
      title: 'Clinical Terminologist',
      url: 'https://example.com/jobs/123',
      location: 'Remote, US',
      department: 'Clinical Informatics',
      description: 'Maintain SNOMED CT value sets.',
      publishedAt: '2026-06-01T00:00:00.000Z',
    })
    expect(p.externalId).toBe('123')
  })

  it('rejects a posting without a url', () => {
    expect(() =>
      RawPosting.parse({ externalId: '1', title: 'x', description: 'y', location: null, department: null, publishedAt: null }),
    ).toThrow()
  })

  it('accepts a valid WatchlistOrg and rejects unknown segment', () => {
    const org = WatchlistOrg.parse({
      name: 'Fixture Health', domain: 'fixturehealth.example', segment: 'digital-health-startup',
      products: ['tt'], slug: 'fixturehealth',
    })
    expect(org.ats).toBeUndefined()
    expect(() => WatchlistOrg.parse({ ...org, segment: 'bakery' })).toThrow()
  })

  it('contentHash is stable and changes with content', () => {
    const a = contentHash('Terminologist', 'desc')
    expect(a).toBe(contentHash('Terminologist', 'desc'))
    expect(a).not.toBe(contentHash('Terminologist', 'desc2'))
    expect(a).toMatch(/^[a-f0-9]{64}$/)
    expect(contentHash('a b', 'c')).not.toBe(contentHash('a', 'b c'))
  })
})
