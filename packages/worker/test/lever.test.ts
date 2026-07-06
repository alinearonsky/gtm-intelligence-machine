import { describe, it, expect, vi, afterEach } from 'vitest'
import { lever } from '../src/ats/lever.ts'
import fixture from './fixtures/lever.json'

afterEach(() => vi.unstubAllGlobals())

describe('lever adapter', () => {
  it('maps the fixture to normalized postings', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(fixture))))
    const posts = await lever.fetchPostings('fixturehealth')
    expect(posts).toHaveLength(3)
    expect(posts[0]).toEqual({
      externalId: 'abc-123',
      title: 'FHIR Integration Engineer',
      url: 'https://jobs.lever.co/fixturehealth/abc-123',
      location: 'Boston, MA',
      department: 'Engineering',
      description: 'Build HL7 FHIR interfaces for clinical data exchange.',
      publishedAt: new Date(1750000000000).toISOString(),
    })
    expect(posts[1]!.location).toBeNull()
  })

  it('falls back to stripped HTML when descriptionPlain is empty', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(fixture))))
    const posts = await lever.fetchPostings('fixturehealth')
    expect(posts[2]!.description).toBe('Own SNOMED value set governance.')
  })

  it('throws AtsError on HTTP failure', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 500 })))
    await expect(lever.fetchPostings('x')).rejects.toThrow(/lever:x.*500/)
  })

  it('wraps a malformed job in AtsError with job context', async () => {
    const bad = [{ ...fixture[0], hostedUrl: 'not-a-url' }]
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(bad))))
    await expect(lever.fetchPostings('fixturehealth')).rejects.toThrow(/lever:fixturehealth.*invalid job abc-123/)
  })
})
