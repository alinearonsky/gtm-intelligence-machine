import { contentHash } from './hash.ts'
import type { RawPostingT } from './types.ts'

export interface StoredPostingRef { externalId: string; contentHash: string }

export interface PostingDiff {
  added: RawPostingT[]
  changed: RawPostingT[]
  removedExternalIds: string[]
  unchangedExternalIds: string[]
}

export function diffPostings(existing: StoredPostingRef[], fetched: RawPostingT[]): PostingDiff {
  // ATS responses can contain duplicate externalIds (pagination overlap /
  // stale pages). Dedup last-wins so each id gets exactly one classification.
  const deduped = [...new Map(fetched.map((f) => [f.externalId, f])).values()]
  const byId = new Map(existing.map((e) => [e.externalId, e.contentHash]))
  const fetchedIds = new Set(deduped.map((f) => f.externalId))
  const d: PostingDiff = { added: [], changed: [], removedExternalIds: [], unchangedExternalIds: [] }
  for (const f of deduped) {
    const prev = byId.get(f.externalId)
    if (prev === undefined) d.added.push(f)
    else if (prev !== contentHash(f.title, f.description)) d.changed.push(f)
    else d.unchangedExternalIds.push(f.externalId)
  }
  for (const e of existing) if (!fetchedIds.has(e.externalId)) d.removedExternalIds.push(e.externalId)
  return d
}
