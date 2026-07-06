import { describe, it, expect, vi, afterEach } from 'vitest'
import { ashby } from '../src/ats/ashby.ts'
import fixture from './fixtures/ashby.json'

afterEach(() => vi.unstubAllGlobals())

describe('ashby adapter', () => {
  it('maps the fixture to normalized postings', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(fixture))))
    const posts = await ashby.fetchPostings('fixturehealth')
    expect(posts).toEqual([
      {
        externalId: 'uuid-1',
        title: 'Knowledge Management Lead',
        url: 'https://jobs.ashbyhq.com/fixturehealth/uuid-1',
        location: 'Remote',
        department: 'Clinical',
        description: 'Own our clinical content and ontology strategy.',
        publishedAt: '2026-06-15T00:00:00.000Z',
      },
    ])
  })

  it('throws AtsError on HTTP failure', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('x', { status: 404 })))
    await expect(ashby.fetchPostings('x')).rejects.toThrow(/ashby:x.*404/)
  })

  it('wraps a malformed job in AtsError with job context', async () => {
    const bad = { jobs: [{ ...fixture.jobs[0], jobUrl: 'not-a-url' }] }
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(bad))))
    await expect(ashby.fetchPostings('fixturehealth')).rejects.toThrow(/ashby:fixturehealth.*invalid job uuid-1/)
  })
})
