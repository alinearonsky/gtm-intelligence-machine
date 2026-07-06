import type { PostingDiff, RawPostingT, WatchlistOrgT, AtsTypeT, ExtractionT, OrgPostingFacts } from '@gtm/core'

export interface OrgRow extends WatchlistOrgT {
  id: number
  atsDetected: AtsTypeT | null
  consecutiveFailures: number
}

export interface StoredPostingRow {
  externalId: string
  contentHash: string
  title: string
  isBaseline: boolean
  prefilterPass: boolean
  firstSeen: string
  lastSeen: string
  removedAt: string | null
}

export interface ScanRunResult {
  startedAt: string
  finishedAt: string
  orgsScanned: number
  orgsFailed: number
  postingsFound: number
  postingsNew: number
  postingsRemoved: number
  errors: { orgSlug: string; message: string }[]
}

export interface ApplyDiffMeta {
  baseline: boolean
  now: string
  prefilter: (p: RawPostingT) => { pass: boolean; matches: string[] }
}

export interface PostingForExtraction { postingId: number; posting: RawPostingT }
export interface ExtractionMeta { model: string; promptVersion: string; now: string }

export interface SignalRecord {
  orgId: number
  signalType: string
  stage: string
  strength: number
  ruleId: string
  evidenceKey: string
  evidence: { externalId: string; url: string; quote: string }[]
  confidence: number
  isBaselineAssessment: boolean
  rulesVersion: number
}
export interface SignalRow extends SignalRecord { id: number }

export interface LensScoreRecord {
  signalId: number
  lens: string
  priority: string
  rationale: string
  rubricVersion: number
}

export interface Store {
  /** Insert or update by slug. The watchlist is authoritative: an omitted
   *  `ats` clears any previously-configured value (detection then applies). */
  upsertOrg(org: WatchlistOrgT): Promise<number>
  getOrg(id: number): Promise<OrgRow | null>
  setOrgAts(id: number, ats: AtsTypeT): Promise<void>
  setOrgFailures(id: number, consecutiveFailures: number): Promise<void>
  /** True once the org has completed at least one scan — INCLUDING a scan
   *  that found zero postings. Implementations must track scan completion
   *  explicitly (e.g. a first_scanned_at column), never infer it from
   *  posting-row existence, or empty boards stay baseline forever. */
  orgHasHistory(orgId: number): Promise<boolean>
  listActivePostings(orgId: number): Promise<{ externalId: string; contentHash: string }[]>
  /** Apply a diff atomically. Referencing an externalId that is not stored
   *  for this org MUST throw (never a silent no-op) — SQL implementations
   *  must check affected row counts. */
  applyDiff(orgId: number, diff: PostingDiff, meta: ApplyDiffMeta): Promise<void>
  recordRun(run: ScanRunResult): Promise<void>
  close(): Promise<void>
  listOrgIds(): Promise<number[]>
  listPostingsNeedingExtraction(orgId: number, promptVersion: string): Promise<PostingForExtraction[]>
  upsertExtraction(postingId: number, ext: ExtractionT, meta: ExtractionMeta): Promise<void>
  markExtractionFailed(postingId: number, meta: ExtractionMeta): Promise<void>
  /** Every 'ok'-extracted posting for the org, joined to posting metadata, as
   *  the pure facts the rules engine reasons over. */
  getOrgExtractionFacts(orgId: number): Promise<OrgPostingFacts[]>
  /** Upsert a signal by (org_id, rule_id, evidence_key); returns its id. */
  upsertSignal(s: SignalRecord): Promise<number>
  listSignals(orgId: number): Promise<SignalRow[]>
  /** Upsert a lens score by (signal_id, lens). */
  upsertLensScore(l: LensScoreRecord): Promise<void>
}
