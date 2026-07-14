import postgres from 'postgres'
import { contentHash, type PostingDiff, type WatchlistOrgT, type AtsTypeT, type ExtractionT, type OrgPostingFacts } from '@gtm/core'
import type { ApplyDiffMeta, ExtractionMeta, LensScoreRecord, OrgNarrativeRecord, OrgRow, ScanRunResult, SignalRecord, SignalRow, Store } from './types.ts'
import type { OrgNarrativeInput } from '../narrate/signature.ts'

export class PostgresStore implements Store {
  private sql: postgres.Sql
  constructor(databaseUrl: string) { this.sql = postgres(databaseUrl, { max: 4 }) }

  async upsertOrg(org: WatchlistOrgT): Promise<number> {
    const rows = await this.sql`
      insert into orgs (slug, name, domain, segment, products, ats)
      values (${org.slug}, ${org.name}, ${org.domain}, ${org.segment}, ${org.products}, ${org.ats ?? null})
      on conflict (slug) do update set
        name = excluded.name, domain = excluded.domain, segment = excluded.segment,
        products = excluded.products, ats = excluded.ats,
        status = 'active'
      returning id`
    return rows[0]!.id as number
  }

  async getOrg(id: number): Promise<OrgRow | null> {
    const r = (await this.sql`select * from orgs where id = ${id}`)[0]
    if (!r) return null
    return {
      id: r.id, slug: r.slug, name: r.name, domain: r.domain, segment: r.segment,
      products: r.products, ats: r.ats ?? undefined,
      atsDetected: (r.ats_detected as AtsTypeT | null), consecutiveFailures: r.consecutive_failures,
      status: r.status,
    }
  }

  async retireAbsentOrgs(activeSlugs: string[]): Promise<number> {
    const rows = await this.sql`
      update orgs set status = 'retired'
      where status = 'active' and not (slug = any(${activeSlugs}::text[]))
      returning id`
    return rows.length
  }

  async setOrgAts(id: number, ats: AtsTypeT) { await this.sql`update orgs set ats_detected = ${ats} where id = ${id}` }
  async setOrgFailures(id: number, n: number) { await this.sql`update orgs set consecutive_failures = ${n} where id = ${id}` }

  async orgHasHistory(orgId: number): Promise<boolean> {
    // Contract: "completed at least one scan", NOT "has posting rows" —
    // an org whose first scan found an empty board must still leave baseline.
    const r = await this.sql`select first_scanned_at from orgs where id = ${orgId}`
    return r[0]?.first_scanned_at != null
  }

  async listActivePostings(orgId: number) {
    const rows = await this.sql`
      select external_id, content_hash from postings where org_id = ${orgId} and removed_at is null`
    return rows.map((r) => ({ externalId: r.external_id as string, contentHash: r.content_hash as string }))
  }

  async applyDiff(orgId: number, diff: PostingDiff, meta: ApplyDiffMeta): Promise<void> {
    await this.sql.begin(async (sql) => {
      for (const p of diff.added) {
        const pf = meta.prefilter(p)
        await sql`
          insert into postings (org_id, external_id, title, url, location, department, description,
            content_hash, published_at, is_baseline, prefilter_pass, prefilter_matches, first_seen, last_seen)
          values (${orgId}, ${p.externalId}, ${p.title}, ${p.url}, ${p.location}, ${p.department}, ${p.description},
            ${contentHash(p.title, p.description)}, ${p.publishedAt}, ${meta.baseline}, ${pf.pass}, ${pf.matches},
            ${meta.now}, ${meta.now})
          on conflict (org_id, external_id) do update set
            title = excluded.title, url = excluded.url, location = excluded.location,
            department = excluded.department, description = excluded.description,
            content_hash = excluded.content_hash, published_at = excluded.published_at,
            is_baseline = excluded.is_baseline, prefilter_pass = excluded.prefilter_pass,
            prefilter_matches = excluded.prefilter_matches,
            first_seen = excluded.first_seen, last_seen = excluded.last_seen,
            removed_at = null`
      }
      for (const p of diff.changed) {
        const pf = meta.prefilter(p)
        const res = await sql`
          update postings set title = ${p.title}, url = ${p.url}, location = ${p.location},
            department = ${p.department}, description = ${p.description},
            content_hash = ${contentHash(p.title, p.description)}, published_at = ${p.publishedAt},
            prefilter_pass = ${pf.pass}, prefilter_matches = ${pf.matches}, last_seen = ${meta.now}
          where org_id = ${orgId} and external_id = ${p.externalId}`
        // Contract: unknown externalId must throw, never silently no-op.
        if (res.count === 0) throw new Error(`applyDiff: unknown externalId "${p.externalId}" for org ${orgId}`)
      }
      if (diff.unchangedExternalIds.length > 0) {
        const res = await sql`update postings set last_seen = ${meta.now}
          where org_id = ${orgId} and external_id = any(${diff.unchangedExternalIds})`
        if (res.count !== diff.unchangedExternalIds.length)
          throw new Error(`applyDiff: unknown externalId in unchanged set for org ${orgId}`)
      }
      if (diff.removedExternalIds.length > 0) {
        const res = await sql`update postings set removed_at = ${meta.now}
          where org_id = ${orgId} and external_id = any(${diff.removedExternalIds}) and removed_at is null`
        if (res.count !== diff.removedExternalIds.length)
          throw new Error(`applyDiff: unknown or already-removed externalId in removed set for org ${orgId}`)
      }
      // Marks scan completion — backs orgHasHistory (even for empty boards).
      await sql`update orgs set first_scanned_at = coalesce(first_scanned_at, ${meta.now}) where id = ${orgId}`
    })
  }

  async recordRun(run: ScanRunResult): Promise<void> {
    await this.sql`
      insert into scan_runs (started_at, finished_at, orgs_scanned, orgs_failed,
        postings_found, postings_new, postings_removed, errors)
      values (${run.startedAt}, ${run.finishedAt}, ${run.orgsScanned}, ${run.orgsFailed},
        ${run.postingsFound}, ${run.postingsNew}, ${run.postingsRemoved}, ${this.sql.json(run.errors)})`
  }

  async close() { await this.sql.end() }

  async listOrgIds(): Promise<number[]> {
    return (await this.sql`select id from orgs order by id`).map((r) => r.id as number)
  }

  async listPostingsNeedingExtraction(orgId: number, promptVersion: string) {
    const rows = await this.sql`
      select p.id, p.external_id, p.title, p.url, p.location, p.department, p.description, p.published_at
      from postings p
      where p.org_id = ${orgId} and p.prefilter_pass = true
        and not exists (
          select 1 from extractions e
          where e.posting_id = p.id and e.prompt_version = ${promptVersion})`
    return rows.map((r) => ({
      postingId: r.id as number,
      posting: {
        externalId: r.external_id as string, title: r.title as string, url: r.url as string,
        location: (r.location as string | null), department: (r.department as string | null),
        description: r.description as string,
        publishedAt: r.published_at ? new Date(r.published_at as string).toISOString() : null,
      },
    }))
  }

  async upsertExtraction(postingId: number, ext: ExtractionT, meta: ExtractionMeta) {
    await this.sql`
      insert into extractions (posting_id, role_category, seniority, standards_mentioned,
        clinical_domain, team_context, function_type, confidence, model, prompt_version, status)
      values (${postingId}, ${ext.roleCategory}, ${ext.seniority}, ${ext.standardsMentioned},
        ${ext.clinicalDomain}, ${ext.teamContext}, ${ext.functionType}, ${ext.confidence},
        ${meta.model}, ${meta.promptVersion}, 'ok')
      on conflict (posting_id, prompt_version) do update set
        role_category = excluded.role_category, seniority = excluded.seniority,
        standards_mentioned = excluded.standards_mentioned, clinical_domain = excluded.clinical_domain,
        team_context = excluded.team_context, function_type = excluded.function_type,
        confidence = excluded.confidence, model = excluded.model, status = 'ok'`
  }

  async markExtractionFailed(postingId: number, meta: ExtractionMeta) {
    await this.sql`
      insert into extractions (posting_id, role_category, seniority, function_type, confidence, model, prompt_version, status)
      values (${postingId}, 'none', 'unknown', 'unknown', 0, ${meta.model}, ${meta.promptVersion}, 'failed')
      on conflict (posting_id, prompt_version) do update set status = 'failed', model = excluded.model`
  }

  async getOrgExtractionFacts(orgId: number): Promise<OrgPostingFacts[]> {
    const rows = await this.sql`
      select distinct on (p.id)
        p.external_id, p.url, p.title, p.description, p.is_baseline, p.first_seen, p.removed_at,
        e.role_category, e.seniority, e.standards_mentioned, e.function_type, e.confidence
      from postings p
      join extractions e on e.posting_id = p.id and e.status = 'ok'
      where p.org_id = ${orgId}
      order by p.id, e.created_at desc`
    return rows.map((r) => ({
      externalId: r.external_id as string, url: r.url as string,
      evidenceQuote: `${r.title} — ${r.description}`.slice(0, 240),
      roleCategory: r.role_category, seniority: r.seniority, standardsMentioned: r.standards_mentioned,
      functionType: r.function_type, confidence: r.confidence,
      isBaseline: r.is_baseline as boolean,
      firstSeen: new Date(r.first_seen as string).toISOString(),
      removedAt: r.removed_at ? new Date(r.removed_at as string).toISOString() : null,
    }))
  }

  async upsertSignal(rec: SignalRecord): Promise<number> {
    // INVARIANT: curated `status` values (reviewed/dismissed/acted — set from
    // the dashboard) are user-owned and MUST NOT be overwritten here. The one
    // machine-owned transition is 'stale' → 'new': a rule firing again
    // resurrects a signal that reconciliation had soft-retired.
    // Regression-guarded by packages/worker/test/signal-status.db.test.ts.
    const rows = await this.sql`
      insert into signals (org_id, signal_type, stage, strength, rule_id, evidence_key, evidence,
        confidence, is_baseline_assessment, rules_version)
      values (${rec.orgId}, ${rec.signalType}, ${rec.stage}, ${rec.strength}, ${rec.ruleId}, ${rec.evidenceKey},
        ${this.sql.json(rec.evidence)}, ${rec.confidence}, ${rec.isBaselineAssessment}, ${rec.rulesVersion})
      on conflict (org_id, rule_id, evidence_key) do update set
        signal_type = excluded.signal_type, stage = excluded.stage, strength = excluded.strength,
        evidence = excluded.evidence, confidence = excluded.confidence,
        is_baseline_assessment = excluded.is_baseline_assessment, rules_version = excluded.rules_version,
        status = case when signals.status = 'stale' then 'new' else signals.status end
      returning id`
    return rows[0]!.id as number
  }

  async listSignals(orgId: number): Promise<SignalRow[]> {
    const rows = await this.sql`select * from signals where org_id = ${orgId} order by id`
    return rows.map((r) => ({
      id: r.id as number, orgId: r.org_id as number, signalType: r.signal_type as string, stage: r.stage as string,
      strength: r.strength as number, ruleId: r.rule_id as string, evidenceKey: r.evidence_key as string,
      evidence: r.evidence, confidence: r.confidence as number,
      isBaselineAssessment: r.is_baseline_assessment as boolean, rulesVersion: r.rules_version as number,
      status: r.status as string,
    }))
  }

  async retireStaleSignals(orgId: number, activeKeys: Array<{ ruleId: string; evidenceKey: string }>): Promise<number> {
    const ruleIds = activeKeys.map((k) => k.ruleId)
    const evidenceKeys = activeKeys.map((k) => k.evidenceKey)
    const rows = await this.sql`
      update signals set status = 'stale'
      where org_id = ${orgId} and status = 'new'
        and not exists (
          select 1 from unnest(${ruleIds}::text[], ${evidenceKeys}::text[]) as k(rule_id, evidence_key)
          where k.rule_id = signals.rule_id and k.evidence_key = signals.evidence_key
        )
      returning id`
    return rows.length
  }

  async upsertLensScore(l: LensScoreRecord): Promise<void> {
    await this.sql`
      insert into lens_scores (signal_id, lens, priority, rationale, rubric_version)
      values (${l.signalId}, ${l.lens}, ${l.priority}, ${l.rationale}, ${l.rubricVersion})
      on conflict (signal_id, lens) do update set
        priority = excluded.priority, rationale = excluded.rationale, rubric_version = excluded.rubric_version`
  }

  async getOrgNarrativeInput(orgId: number, lens: string): Promise<OrgNarrativeInput | null> {
    const org = await this.getOrg(orgId)
    if (!org) return null
    const signalRows = await this.sql`
      select s.signal_type, s.stage, s.strength, s.status, s.is_baseline_assessment,
             ls.priority, ls.rationale
      from signals s
      join lens_scores ls on ls.signal_id = s.id and ls.lens = ${lens}
      where s.org_id = ${orgId} and s.status not in ('stale', 'dismissed')
      order by s.id`
    if (signalRows.length === 0) return null

    const factRows = await this.sql`
      select distinct on (p.id) e.standards_mentioned, e.function_type, e.role_category
      from postings p
      join extractions e on e.posting_id = p.id and e.status = 'ok'
      where p.org_id = ${orgId}
      order by p.id, e.created_at desc`

    const standards = [...new Set(factRows.flatMap((r) => (r.standards_mentioned as string[])))].sort()
    const roleCategories = [...new Set(factRows.map((r) => r.role_category as string).filter((r) => r !== 'none'))].sort()
    const newFunctionCount = factRows.filter((r) => r.function_type === 'new-function').length

    const signals = signalRows.map((r) => ({
      signalType: r.signal_type as string, stage: r.stage as string, strength: r.strength as number,
      priority: r.priority as string, status: r.status as string, rationale: r.rationale as string,
      isBaselineAssessment: r.is_baseline_assessment as boolean,
    }))
    return {
      orgId, lens, orgName: org.name, segment: org.segment,
      signals, standards, newFunctionCount, roleCategories,
      baselineOnly: signals.every((s) => s.isBaselineAssessment),
    }
  }

  async getStoredNarrativeSignature(orgId: number, lens: string): Promise<string | null> {
    const r = (await this.sql`select source_signature from org_narratives where org_id = ${orgId} and lens = ${lens}`)[0]
    return r ? (r.source_signature as string) : null
  }

  async upsertOrgNarrative(rec: OrgNarrativeRecord): Promise<void> {
    await this.sql`
      insert into org_narratives (org_id, lens, narrative, model, prompt_version, source_signature, generated_at)
      values (${rec.orgId}, ${rec.lens}, ${rec.narrative}, ${rec.model}, ${rec.promptVersion}, ${rec.sourceSignature}, now())
      on conflict (org_id, lens) do update set
        narrative = excluded.narrative, model = excluded.model,
        prompt_version = excluded.prompt_version, source_signature = excluded.source_signature,
        generated_at = now()`
  }
}
