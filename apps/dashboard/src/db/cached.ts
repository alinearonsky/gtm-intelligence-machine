import { unstable_cache } from 'next/cache'
import { getSql } from './connection.ts'
import { getSignalFeed, getOrgProfile, getRunHealth, listOrgsAdmin, getFilterOptions } from './queries.ts'
import type { FeedFilters } from './types.ts'

// Grill #8: data changes ~daily. Cache reads for an hour (Next data cache),
// tagged so the status mutation can bust them immediately via revalidateTag.
export function cachedSignalFeed(lens: string, filters: FeedFilters) {
  return unstable_cache(
    () => getSignalFeed(getSql(), lens, filters),
    ['signal-feed', lens, JSON.stringify(filters)],
    { revalidate: 3600, tags: ['signals'] },
  )()
}

export function cachedOrgProfile(slug: string, lens: string) {
  return unstable_cache(
    () => getOrgProfile(getSql(), slug, lens),
    ['org-profile', slug, lens],
    { revalidate: 3600, tags: ['signals'] },
  )()
}

export function cachedRunHealth() {
  return unstable_cache(() => getRunHealth(getSql()), ['run-health'], { revalidate: 3600, tags: ['runs'] })()
}

export function cachedOrgsAdmin() {
  return unstable_cache(() => listOrgsAdmin(getSql()), ['orgs-admin'], { revalidate: 3600, tags: ['orgs'] })()
}

export function cachedFilterOptions(lens: string) {
  return unstable_cache(
    () => getFilterOptions(getSql(), lens),
    ['filter-options', lens],
    { revalidate: 3600, tags: ['signals'] },
  )()
}
