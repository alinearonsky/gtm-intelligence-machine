import { z } from 'zod'

export const AtsType = z.enum(['greenhouse', 'lever', 'ashby', 'smartrecruiters', 'workable'])
export type AtsTypeT = z.infer<typeof AtsType>

export const Segment = z.enum([
  'digital-health-startup', 'health-system', 'payer', 'ehr-vendor', 'measure-developer', 'other',
])

export const WatchlistOrg = z.object({
  name: z.string().min(1),
  domain: z.string().min(1),
  segment: Segment,
  products: z.array(z.enum(['tt', 'ckms'])).min(1),
  slug: z.string().min(1),          // ATS board token / site slug
  ats: AtsType.optional(),          // omitted → auto-detect on scan
})
export type WatchlistOrgT = z.infer<typeof WatchlistOrg>

export const Watchlist = z.object({ orgs: z.array(WatchlistOrg).min(1) })
export type WatchlistT = z.infer<typeof Watchlist>

// Normalized posting as returned by every ATS adapter.
export const RawPosting = z.object({
  externalId: z.string().min(1),
  title: z.string().min(1),
  url: z.string().url(),
  location: z.string().nullable(),
  department: z.string().nullable(),
  description: z.string(),                 // plain text (HTML stripped by adapter)
  publishedAt: z.string().datetime().nullable(), // normalized ISO or null
})
export type RawPostingT = z.infer<typeof RawPosting>
