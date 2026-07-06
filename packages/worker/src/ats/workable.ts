import type { RawPostingT } from '@gtm/core'
import { type AtsAdapter, getJson, parsePosting } from './types.ts'
import { stripHtml, toIso } from './util.ts'

interface WorkableJob {
  title: string
  shortcode: string
  url: string
  published_on?: string
  department?: string | null
  description?: string
  city?: string | null
  state?: string | null
  country?: string | null
}

export const workable: AtsAdapter = {
  type: 'workable',
  async fetchPostings(slug: string): Promise<RawPostingT[]> {
    const body = (await getJson(
      `https://apply.workable.com/api/v1/widget/accounts/${slug}?details=true`, 'workable', slug,
    )) as { jobs: WorkableJob[] }
    // Workable duplicates a job entry per target country for multi-location
    // postings (same shortcode+url, different country/city). diffPostings'
    // last-wins dedup by externalId keeps exactly one — location is therefore
    // response-order-dependent for multi-country roles. Acceptable for v1.
    return body.jobs.map((j) => {
      const loc = [j.city, j.state, j.country].filter(Boolean).join(', ')
      return parsePosting('workable', slug, j.shortcode, {
        externalId: j.shortcode,
        title: j.title,
        url: j.url,
        location: loc || null,
        department: j.department ?? null,
        description: stripHtml(j.description ?? ''),
        publishedAt: toIso(j.published_on),
      })
    })
  },
  async probe(slug: string): Promise<boolean> {
    try {
      const b = (await getJson(`https://apply.workable.com/api/v1/widget/accounts/${slug}?details=false`, 'workable', slug)) as { jobs?: unknown }
      return Array.isArray(b.jobs)
    } catch { return false }
  },
}
