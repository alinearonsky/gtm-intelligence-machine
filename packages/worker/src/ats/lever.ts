import type { RawPostingT } from '@gtm/core'
import { type AtsAdapter, getJson, parsePosting } from './types.ts'
import { stripHtml, toIso } from './util.ts'

interface LeverPosting {
  id: string
  text: string
  hostedUrl: string
  createdAt?: number
  categories?: { location?: string; team?: string; department?: string }
  descriptionPlain?: string
  description?: string
}

export const lever: AtsAdapter = {
  type: 'lever',
  async fetchPostings(slug: string): Promise<RawPostingT[]> {
    const body = (await getJson(`https://api.lever.co/v0/postings/${slug}?mode=json`, 'lever', slug)) as LeverPosting[]
    return body.map((j) =>
      parsePosting('lever', slug, j.id, {
        externalId: j.id,
        title: j.text,
        url: j.hostedUrl,
        location: j.categories?.location ?? null,
        department: j.categories?.department ?? j.categories?.team ?? null,
        description: j.descriptionPlain || stripHtml(j.description ?? ''),
        publishedAt: toIso(j.createdAt),
      }),
    )
  },
  async probe(slug: string): Promise<boolean> {
    try {
      return Array.isArray(await getJson(`https://api.lever.co/v0/postings/${slug}?mode=json`, 'lever', slug))
    } catch { return false }
  },
}
