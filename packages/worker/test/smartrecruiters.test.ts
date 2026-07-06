import { describe, it, expect, vi, afterEach } from 'vitest'
import { smartrecruiters } from '../src/ats/smartrecruiters.ts'
import list from './fixtures/smartrecruiters-list.json'
import detail from './fixtures/smartrecruiters-detail.json'

afterEach(() => vi.unstubAllGlobals())

describe('smartrecruiters adapter', () => {
  it('maps list + detail to normalized postings', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string | URL) =>
      new Response(JSON.stringify(String(url).endsWith('/postings/744000001') ? detail : list)),
    ))
    const posts = await smartrecruiters.fetchPostings('fixturehealth')
    expect(posts).toEqual([
      {
        externalId: '744000001',
        title: 'eCQM Measure Developer',
        url: 'https://jobs.smartrecruiters.com/fixturehealth/744000001',
        location: 'Chicago, IL',
        department: 'Quality',
        description: 'Develop clinical quality measures.\nHEDIS experience required.',
        publishedAt: '2026-06-10T08:00:00.000Z',
      },
    ])
  })

  it('throws AtsError when the list is truncated (totalFound > fetched)', async () => {
    const truncated = { ...list, totalFound: 250 }
    vi.stubGlobal('fetch', vi.fn(async (url: string | URL) =>
      new Response(JSON.stringify(String(url).endsWith('/postings/744000001') ? detail : truncated)),
    ))
    await expect(smartrecruiters.fetchPostings('fixturehealth')).rejects.toThrow(/smartrecruiters:fixturehealth.*truncated: 250/)
  })

  it('throws AtsError on list failure', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('x', { status: 403 })))
    await expect(smartrecruiters.fetchPostings('x')).rejects.toThrow(/smartrecruiters:x.*403/)
  })

  it('wraps a malformed job in AtsError with job context', async () => {
    const badList = { totalFound: 1, content: [{ ...list.content[0], name: '' }] }
    vi.stubGlobal('fetch', vi.fn(async (url: string | URL) =>
      new Response(JSON.stringify(String(url).endsWith('/postings/744000001') ? detail : badList)),
    ))
    await expect(smartrecruiters.fetchPostings('fixturehealth')).rejects.toThrow(/smartrecruiters:fixturehealth.*invalid job 744000001/)
  })
})
