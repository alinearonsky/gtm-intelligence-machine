import type { PriorityT } from '@gtm/core'
import type { FeedSignal } from '../db/types.ts'

// act-now sorts ahead of watch ahead of ignore.
export const PRIORITY_RANK: Record<PriorityT, number> = { 'act-now': 0, watch: 1, ignore: 2 }

export interface FeedOrg {
  orgId: number
  orgSlug: string
  orgName: string
  domain: string
  segment: string
  topPriority: PriorityT
  latestAt: string
  signals: FeedSignal[]
}

const rank = (p: PriorityT) => PRIORITY_RANK[p] ?? PRIORITY_RANK.ignore

/**
 * Collapse the per-signal feed into one entry per org. Within an org, signals
 * are ordered highest-priority-then-newest so the lead signal is the strongest
 * reason to care; orgs are ordered the same way so act-now companies surface
 * first. Input order is otherwise preserved for equal-priority ties (the query
 * already sorts by created_at desc).
 */
export function groupFeedByOrg(signals: FeedSignal[]): FeedOrg[] {
  const byOrg = new Map<number, FeedOrg>()
  for (const s of signals) {
    let org = byOrg.get(s.orgId)
    if (!org) {
      org = {
        orgId: s.orgId,
        orgSlug: s.orgSlug,
        orgName: s.orgName,
        domain: s.domain,
        segment: s.segment,
        topPriority: s.priority,
        latestAt: s.createdAt,
        signals: [],
      }
      byOrg.set(s.orgId, org)
    }
    org.signals.push(s)
    if (rank(s.priority) < rank(org.topPriority)) org.topPriority = s.priority
    if (s.createdAt > org.latestAt) org.latestAt = s.createdAt
  }

  const orgs = [...byOrg.values()]
  for (const org of orgs) {
    org.signals.sort((a, b) => rank(a.priority) - rank(b.priority) || b.createdAt.localeCompare(a.createdAt))
  }
  orgs.sort((a, b) => rank(a.topPriority) - rank(b.topPriority) || b.latestAt.localeCompare(a.latestAt))
  return orgs
}
