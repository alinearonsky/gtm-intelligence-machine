import { describe, it, expect, vi, afterEach } from 'vitest'
import { greenhouse } from '../src/ats/greenhouse.ts'
import fixture from './fixtures/greenhouse.json'

afterEach(() => vi.unstubAllGlobals())

function stubFetch(body: unknown, status = 200) {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(body), { status })))
}

describe('greenhouse adapter', () => {
  it('maps the fixture to normalized postings', async () => {
    stubFetch(fixture)
    const posts = await greenhouse.fetchPostings('fixturehealth')
    expect(posts).toHaveLength(2)
    expect(posts[0]).toEqual({
      externalId: '900001',
      title: 'Clinical Terminologist',
      url: 'https://boards.greenhouse.io/fixturehealth/jobs/900001',
      location: 'Remote, US',
      department: 'Clinical Informatics',
      description: 'Maintain SNOMED CT & LOINC value sets.',
      publishedAt: '2026-06-01T13:00:00.000Z',
    })
    expect(posts[1]!.location).toBeNull()
    expect(posts[1]!.department).toBeNull()
    expect(posts[1]!.publishedAt).toBe('2026-06-21T14:00:00.000Z') // falls back to updated_at
  })

  it('throws AtsError on HTTP failure', async () => {
    stubFetch({}, 404)
    await expect(greenhouse.fetchPostings('nope')).rejects.toThrow(/greenhouse:nope.*404/)
  })

  it('wraps a malformed job in AtsError with job context', async () => {
    const bad = { jobs: [{ ...fixture.jobs[0], absolute_url: 'not-a-url' }] }
    stubFetch(bad)
    await expect(greenhouse.fetchPostings('fixturehealth')).rejects.toThrow(/greenhouse:fixturehealth.*invalid job 900001/)
  })
})
