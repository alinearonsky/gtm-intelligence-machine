import { describe, it, expect, vi, afterEach } from 'vitest'
import { workable } from '../src/ats/workable.ts'
import fixture from './fixtures/workable.json'

afterEach(() => vi.unstubAllGlobals())

describe('workable adapter', () => {
  it('maps the fixture to normalized postings', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(fixture))))
    const posts = await workable.fetchPostings('fixturehealth')
    expect(posts).toHaveLength(2)
    expect(posts[0]).toEqual({
      externalId: 'FH01',
      title: 'Clinical Data Steward',
      url: 'https://apply.workable.com/fixturehealth/j/FH01/',
      location: 'Denver, CO, United States',
      department: 'Data',
      description: 'Own master data and data governance for clinical vocabularies.',
      publishedAt: '2026-06-05T00:00:00.000Z',
    })
    expect(posts[1]).toMatchObject({ externalId: 'FH02', department: null, location: 'United States' })
  })

  it('throws AtsError on HTTP failure', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('x', { status: 404 })))
    await expect(workable.fetchPostings('x')).rejects.toThrow(/workable:x.*404/)
  })

  it('wraps a malformed job in AtsError with job context', async () => {
    const bad = { ...fixture, jobs: [{ ...fixture.jobs[0], url: 'not-a-url' }] }
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(bad))))
    await expect(workable.fetchPostings('fixturehealth')).rejects.toThrow(/workable:fixturehealth.*invalid job FH01/)
  })
})
