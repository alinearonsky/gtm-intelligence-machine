import type { RawPostingT } from '@gtm/core'
import { type AtsAdapter, AtsError, getJson, parsePosting } from './types.ts'
import { stripHtml, toIso } from './util.ts'

interface SrListItem {
  id: string
  name: string
  releasedDate?: string
  location?: { city?: string; region?: string } | null
  department?: { label?: string } | null
}

interface SrDetail {
  jobAd?: { sections?: Record<string, { text?: string } | undefined> }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export const smartrecruiters: AtsAdapter = {
  type: 'smartrecruiters',
  async fetchPostings(slug: string): Promise<RawPostingT[]> {
    const base = `https://api.smartrecruiters.com/v1/companies/${slug}/postings`
    const body = (await getJson(`${base}?limit=100`, 'smartrecruiters', slug)) as {
      totalFound?: number
      content: SrListItem[]
    }
    // >100 open postings would silently vanish and later be misread as
    // "role filled" removals — fail visibly instead (spec: no silent gaps).
    if ((body.totalFound ?? 0) > body.content.length) {
      throw new AtsError('smartrecruiters', slug,
        `truncated: ${body.totalFound} postings, only fetched ${body.content.length}`)
    }
    const out: RawPostingT[] = []
    for (const j of body.content) {
      const detail = (await getJson(`${base}/${j.id}`, 'smartrecruiters', slug)) as SrDetail
      const sections = detail.jobAd?.sections ?? {}
      const description = ['jobDescription', 'qualifications', 'additionalInformation']
        .map((k) => stripHtml(sections[k]?.text ?? ''))
        .filter(Boolean)
        .join('\n')
      const loc = [j.location?.city, j.location?.region].filter(Boolean).join(', ')
      out.push(
        parsePosting('smartrecruiters', slug, j.id, {
          externalId: j.id,
          title: j.name,
          url: `https://jobs.smartrecruiters.com/${slug}/${j.id}`,
          location: loc || null,
          department: j.department?.label || null,
          description,
          publishedAt: toIso(j.releasedDate),
        }),
      )
      await sleep(100)
    }
    return out
  },
  async probe(slug: string): Promise<boolean> {
    try {
      // SR answers 200 {totalFound:0} for ANY slug — require real postings.
      // Tradeoff: a real SR org with zero open postings reads as not-found.
      const b = (await getJson(`https://api.smartrecruiters.com/v1/companies/${slug}/postings?limit=1`, 'smartrecruiters', slug)) as { totalFound?: number }
      return (b.totalFound ?? 0) > 0
    } catch { return false }
  },
}
