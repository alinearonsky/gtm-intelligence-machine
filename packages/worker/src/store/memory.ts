import { contentHash, type PostingDiff, type RawPostingT, type WatchlistOrgT, type AtsTypeT } from '@gtm/core'
import type { ApplyDiffMeta, OrgRow, ScanRunResult, Store, StoredPostingRow } from './types.ts'

interface MemPosting extends StoredPostingRow {
  raw: RawPostingT
  prefilterMatches: string[]
}

export class MemoryStore implements Store {
  private orgs = new Map<number, OrgRow>()
  private bySlug = new Map<string, number>()
  private postings = new Map<number, Map<string, MemPosting>>()
  private scannedOnce = new Set<number>()
  runs: ScanRunResult[] = []
  private nextId = 1

  async upsertOrg(org: WatchlistOrgT): Promise<number> {
    const existing = this.bySlug.get(org.slug)
    if (existing !== undefined) {
      this.orgs.set(existing, { ...this.orgs.get(existing)!, ...org, ats: org.ats })
      return existing
    }
    const id = this.nextId++
    this.orgs.set(id, { ...org, id, atsDetected: null, consecutiveFailures: 0 })
    this.bySlug.set(org.slug, id)
    this.postings.set(id, new Map())
    return id
  }

  async getOrg(id: number) { return this.orgs.get(id) ?? null }
  async setOrgAts(id: number, ats: AtsTypeT) { this.orgs.get(id)!.atsDetected = ats }
  async setOrgFailures(id: number, n: number) { this.orgs.get(id)!.consecutiveFailures = n }
  async orgHasHistory(orgId: number) { return this.scannedOnce.has(orgId) }

  async listActivePostings(orgId: number) {
    return [...this.postings.get(orgId)!.values()]
      .filter((p) => p.removedAt === null)
      .map((p) => ({ externalId: p.externalId, contentHash: p.contentHash }))
  }

  async applyDiff(orgId: number, diff: PostingDiff, meta: ApplyDiffMeta): Promise<void> {
    const map = this.postings.get(orgId)!
    for (const raw of diff.added) {
      const pf = meta.prefilter(raw)
      map.set(raw.externalId, {
        externalId: raw.externalId, contentHash: contentHash(raw.title, raw.description),
        title: raw.title, isBaseline: meta.baseline, prefilterPass: pf.pass, prefilterMatches: pf.matches,
        firstSeen: meta.now, lastSeen: meta.now, removedAt: null, raw,
      })
    }
    for (const raw of diff.changed) {
      const row = this.mustGet(map, orgId, raw.externalId)
      const pf = meta.prefilter(raw)
      Object.assign(row, {
        contentHash: contentHash(raw.title, raw.description), title: raw.title,
        prefilterPass: pf.pass, prefilterMatches: pf.matches, lastSeen: meta.now, raw,
      })
    }
    for (const id of diff.unchangedExternalIds) this.mustGet(map, orgId, id).lastSeen = meta.now
    for (const id of diff.removedExternalIds) this.mustGet(map, orgId, id).removedAt = meta.now
    this.scannedOnce.add(orgId)
  }

  private mustGet(map: Map<string, MemPosting>, orgId: number, id: string): MemPosting {
    const row = map.get(id)
    if (!row) throw new Error(`applyDiff: unknown externalId "${id}" for org ${orgId}`)
    return row
  }

  async recordRun(run: ScanRunResult) { this.runs.push(run) }
  async close() {}

  /** Test helper — not part of the Store interface. */
  dumpPostings(orgId: number): MemPosting[] { return [...this.postings.get(orgId)!.values()] }
}
