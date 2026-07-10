import { contentHash, type PostingDiff, type RawPostingT, type WatchlistOrgT, type AtsTypeT, type ExtractionT, type OrgPostingFacts } from '@gtm/core'
import type { ApplyDiffMeta, ExtractionMeta, LensScoreRecord, OrgRow, ScanRunResult, SignalRecord, SignalRow, Store, StoredPostingRow } from './types.ts'

interface MemExtraction { ext: ExtractionT; status: 'ok' | 'failed'; promptVersion: string; model: string; createdAt: string }
interface MemPosting extends StoredPostingRow {
  raw: RawPostingT
  prefilterMatches: string[]
  id: number
  extractions: MemExtraction[]
}

export class MemoryStore implements Store {
  private orgs = new Map<number, OrgRow>()
  private bySlug = new Map<string, number>()
  private postings = new Map<number, Map<string, MemPosting>>()
  private scannedOnce = new Set<number>()
  runs: ScanRunResult[] = []
  private nextId = 1
  private nextPostingId = 1
  private signals: SignalRow[] = []
  private nextSignalId = 1
  private lensScores: LensScoreRecord[] = []

  async upsertOrg(org: WatchlistOrgT): Promise<number> {
    const existing = this.bySlug.get(org.slug)
    if (existing !== undefined) {
      this.orgs.set(existing, { ...this.orgs.get(existing)!, ...org, ats: org.ats, status: 'active' })
      return existing
    }
    const id = this.nextId++
    this.orgs.set(id, { ...org, id, atsDetected: null, consecutiveFailures: 0, status: 'active' })
    this.bySlug.set(org.slug, id)
    this.postings.set(id, new Map())
    return id
  }

  async retireAbsentOrgs(activeSlugs: string[]): Promise<number> {
    const active = new Set(activeSlugs)
    let retired = 0
    for (const o of this.orgs.values()) {
      if (o.status === 'active' && !active.has(o.slug)) { o.status = 'retired'; retired++ }
    }
    return retired
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
        id: this.nextPostingId++, extractions: [],
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

  async listOrgIds(): Promise<number[]> { return [...this.orgs.keys()] }

  async listPostingsNeedingExtraction(orgId: number, promptVersion: string) {
    return [...this.postings.get(orgId)!.values()]
      .filter((p) => p.prefilterPass && !p.extractions.some((e) => e.promptVersion === promptVersion))
      .map((p) => ({ postingId: p.id, posting: p.raw }))
  }

  async upsertExtraction(postingId: number, ext: ExtractionT, meta: ExtractionMeta) {
    const p = this.findPosting(postingId)
    p.extractions = p.extractions.filter((e) => e.promptVersion !== meta.promptVersion)
    p.extractions.push({ ext, status: 'ok', promptVersion: meta.promptVersion, model: meta.model, createdAt: meta.now })
  }

  async markExtractionFailed(postingId: number, meta: ExtractionMeta) {
    const p = this.findPosting(postingId)
    p.extractions = p.extractions.filter((e) => e.promptVersion !== meta.promptVersion)
    p.extractions.push({ ext: null as unknown as ExtractionT, status: 'failed', promptVersion: meta.promptVersion, model: meta.model, createdAt: meta.now })
  }

  private findPosting(postingId: number): MemPosting {
    for (const map of this.postings.values())
      for (const p of map.values()) if (p.id === postingId) return p
    throw new Error(`unknown postingId ${postingId}`)
  }

  async getOrgExtractionFacts(orgId: number): Promise<OrgPostingFacts[]> {
    const out: OrgPostingFacts[] = []
    for (const p of this.postings.get(orgId)!.values()) {
      const ok = p.extractions.filter((e) => e.status === 'ok')
      if (ok.length === 0) continue
      const latest = ok.reduce((a, b) => (a.createdAt >= b.createdAt ? a : b))
      const e = latest.ext
      out.push({
        externalId: p.externalId, url: p.raw.url,
        evidenceQuote: `${p.raw.title} — ${p.raw.description}`.slice(0, 240),
        roleCategory: e.roleCategory, seniority: e.seniority, standardsMentioned: e.standardsMentioned,
        functionType: e.functionType, confidence: e.confidence,
        isBaseline: p.isBaseline, firstSeen: p.firstSeen, removedAt: p.removedAt,
      })
    }
    return out
  }

  async upsertSignal(rec: SignalRecord): Promise<number> {
    const existing = this.signals.find((s) => s.orgId === rec.orgId && s.ruleId === rec.ruleId && s.evidenceKey === rec.evidenceKey)
    if (existing) {
      Object.assign(existing, rec)
      // mirror postgres: 'stale' is the one machine-owned status a re-fire resurrects
      if (existing.status === 'stale') existing.status = 'new'
      return existing.id
    }
    const id = this.nextSignalId++
    this.signals.push({ ...rec, id, status: 'new' })
    return id
  }

  async retireStaleSignals(orgId: number, activeKeys: Array<{ ruleId: string; evidenceKey: string }>): Promise<number> {
    // NUL separator: evidence keys derive from ATS external ids and may
    // contain spaces — a printable join could collide across the tuple boundary
    const active = new Set(activeKeys.map((k) => `${k.ruleId}\u0000${k.evidenceKey}`))
    let retired = 0
    for (const s of this.signals) {
      if (s.orgId === orgId && s.status === 'new' && !active.has(`${s.ruleId}\u0000${s.evidenceKey}`)) {
        s.status = 'stale'; retired++
      }
    }
    return retired
  }

  async listSignals(orgId: number): Promise<SignalRow[]> {
    return this.signals.filter((s) => s.orgId === orgId).map((s) => ({ ...s }))
  }

  /** Test helper — not part of the Store interface. */
  setSignalStatusForTest(id: number, status: string): void {
    this.signals.find((s) => s.id === id)!.status = status
  }

  /** Test helper — not part of the Store interface. */
  dumpPostings(orgId: number): MemPosting[] { return [...this.postings.get(orgId)!.values()] }

  async upsertLensScore(l: LensScoreRecord): Promise<void> {
    const existing = this.lensScores.find((s) => s.signalId === l.signalId && s.lens === l.lens)
    if (existing) Object.assign(existing, l)
    else this.lensScores.push({ ...l })
  }

  /** Test helper — not part of the Store interface. */
  dumpLensScores(): LensScoreRecord[] { return this.lensScores.map((s) => ({ ...s })) }
}
