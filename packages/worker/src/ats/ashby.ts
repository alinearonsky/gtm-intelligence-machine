import type { RawPostingT } from '@gtm/core'
import { type AtsAdapter, getJson, parsePosting } from './types.ts'
import { stripHtml, toIso } from './util.ts'

interface AshbyJob {
  id: string
  title: string
  location?: string | null
  department?: string | null
  jobUrl?: string
  applyUrl?: string
  publishedAt?: string
  descriptionHtml?: string
}

export const ashby: AtsAdapter = {
  type: 'ashby',
  async fetchPostings(slug: string): Promise<RawPostingT[]> {
    const body = (await getJson(
      `https://api.ashbyhq.com/posting-api/job-board/${slug}?includeCompensation=false`, 'ashby', slug,
    )) as { jobs: AshbyJob[] }
    return body.jobs.map((j) =>
      parsePosting('ashby', slug, j.id, {
        externalId: j.id,
        title: j.title,
        url: j.jobUrl || j.applyUrl,
        location: j.location || null,
        department: j.department || null,
        description: stripHtml(j.descriptionHtml || ''),
        publishedAt: toIso(j.publishedAt),
      }),
    )
  },
  async probe(slug: string): Promise<boolean> {
    try {
      const b = (await getJson(`https://api.ashbyhq.com/posting-api/job-board/${slug}?includeCompensation=false`, 'ashby', slug)) as { jobs?: unknown }
      return Array.isArray(b.jobs)
    } catch { return false }
  },
}
