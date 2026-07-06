import postgres from 'postgres'
import { contentHash, type PostingDiff, type WatchlistOrgT, type AtsTypeT } from '@gtm/core'
import type { ApplyDiffMeta, OrgRow, ScanRunResult, Store } from './types.ts'

export class PostgresStore implements Store {
  private sql: postgres.Sql
  constructor(databaseUrl: string) { this.sql = postgres(databaseUrl, { max: 4 }) }

  async upsertOrg(org: WatchlistOrgT): Promise<number> {
    const rows = await this.sql`
      insert into orgs (slug, name, domain, segment, products, ats)
      values (${org.slug}, ${org.name}, ${org.domain}, ${org.segment}, ${org.products}, ${org.ats ?? null})
      on conflict (slug) do update set
        name = excluded.name, domain = excluded.domain, segment = excluded.segment,
        products = excluded.products, ats = excluded.ats
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
    }
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
}
