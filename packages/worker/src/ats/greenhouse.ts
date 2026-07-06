import type { RawPostingT } from '@gtm/core'
import { type AtsAdapter, getJson, parsePosting } from './types.ts'
import { stripHtml, toIso } from './util.ts'

interface GhJob {
  id: number
  title: string
  absolute_url: string
  updated_at?: string
  first_published?: string | null
  location?: { name: string } | null
  departments?: { name: string }[]
  content?: string
}

export const greenhouse: AtsAdapter = {
  type: 'greenhouse',
  async fetchPostings(slug: string): Promise<RawPostingT[]> {
    const body = (await getJson(
      `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`, 'greenhouse', slug,
    )) as { jobs: GhJob[] }
    return body.jobs.map((j) =>
      parsePosting('greenhouse', slug, String(j.id), {
        externalId: String(j.id),
        title: j.title,
        url: j.absolute_url,
        location: j.location?.name ?? null,
        department: j.departments?.[0]?.name ?? null,
        description: stripHtml(j.content ?? ''),
        publishedAt: toIso(j.first_published) ?? toIso(j.updated_at),
      }),
    )
  },
  async probe(slug: string): Promise<boolean> {
    try {
      const b = (await getJson(`https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`, 'greenhouse', slug)) as { jobs?: unknown }
      return Array.isArray(b.jobs)
    } catch { return false }
  },
}
