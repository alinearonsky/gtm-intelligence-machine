import type { Sql } from 'postgres'
import type { FeedSignal, FeedFilters, OrgProfile, RunHealthRow, OrgAdminRow, FilterOptions } from './types.ts'

function toFeedSignal(r: Record<string, unknown>): FeedSignal {
  return {
    id: r.id as number,
    orgId: r.org_id as number,
    orgSlug: r.org_slug as string,
    orgName: r.org_name as string,
    segment: r.segment as string,
    signalType: r.signal_type as string,
    stage: r.stage as string,
    strength: r.strength as number,
    confidence: r.confidence as number,
    isBaselineAssessment: r.is_baseline_assessment as boolean,
    status: r.status as string,
    createdAt: new Date(r.created_at as string).toISOString(),
    priority: r.priority as FeedSignal['priority'],
    rationale: r.rationale as string,
    evidence: r.evidence as FeedSignal['evidence'],
  }
}

export async function getSignalFeed(sql: Sql, lens: string, f: FeedFilters): Promise<FeedSignal[]> {
  const rows = await sql`
    select s.id, s.org_id, o.slug as org_slug, o.name as org_name, o.segment,
           s.signal_type, s.stage, s.strength, s.confidence, s.is_baseline_assessment,
           s.status, s.created_at, s.evidence, ls.priority, ls.rationale
    from signals s
    join orgs o on o.id = s.org_id
    join lens_scores ls on ls.signal_id = s.id and ls.lens = ${lens}
    where o.status = 'active'
      and (${f.segment ?? null}::text is null or o.segment = ${f.segment ?? null})
      and (${f.signalType ?? null}::text is null or s.signal_type = ${f.signalType ?? null})
      and (${f.minStrength ?? null}::int is null or s.strength >= ${f.minStrength ?? null})
      and (${f.status ?? null}::text is null or s.status = ${f.status ?? null})
      -- soft-retired signals stay out of the default feed; selecting the
      -- 'stale' status filter surfaces them explicitly
      and (${f.status ?? null}::text is not null or s.status <> 'stale')
    order by s.created_at desc, s.id desc`
  return rows.map(toFeedSignal)
}

export async function getOrgProfile(sql: Sql, slug: string, lens: string): Promise<OrgProfile | null> {
  const orgRows = await sql`select * from orgs where slug = ${slug}`
  const o = orgRows[0]
  if (!o) return null

  const signalRows = await sql`
    select s.id, s.org_id, o.slug as org_slug, o.name as org_name, o.segment,
           s.signal_type, s.stage, s.strength, s.confidence, s.is_baseline_assessment,
           s.status, s.created_at, s.evidence, ls.priority, ls.rationale
    from signals s
    join orgs o on o.id = s.org_id
    join lens_scores ls on ls.signal_id = s.id and ls.lens = ${lens}
    where o.slug = ${slug}
    order by s.created_at desc, s.id desc`

  const postingRows = await sql`
    select external_id, title, url, location, department, is_baseline, first_seen, removed_at
    from postings where org_id = ${o.id as number}
    order by first_seen desc`

  return {
    id: o.id as number, slug: o.slug as string, name: o.name as string, domain: o.domain as string,
    segment: o.segment as string, products: o.products as string[], status: o.status as string,
    signals: signalRows.map(toFeedSignal),
    postings: postingRows.map((p) => ({
      externalId: p.external_id as string, title: p.title as string, url: p.url as string,
      location: (p.location as string | null), department: (p.department as string | null),
      isBaseline: p.is_baseline as boolean,
      firstSeen: new Date(p.first_seen as string).toISOString(),
      removedAt: p.removed_at ? new Date(p.removed_at as string).toISOString() : null,
    })),
  }
}

export async function getRunHealth(sql: Sql, limit = 30): Promise<RunHealthRow[]> {
  const rows = await sql`
    select id, started_at, finished_at, orgs_scanned, orgs_failed,
           postings_found, postings_new, postings_removed, errors
    from scan_runs order by started_at desc limit ${limit}`
  return rows.map((r) => ({
    id: r.id as number,
    startedAt: new Date(r.started_at as string).toISOString(),
    finishedAt: new Date(r.finished_at as string).toISOString(),
    orgsScanned: r.orgs_scanned as number, orgsFailed: r.orgs_failed as number,
    postingsFound: r.postings_found as number, postingsNew: r.postings_new as number,
    postingsRemoved: r.postings_removed as number,
    errors: (r.errors as { orgSlug: string; message: string }[]) ?? [],
  }))
}

export async function getFilterOptions(sql: Sql, lens: string): Promise<FilterOptions> {
  const rows = await sql`
    select distinct o.segment, s.signal_type, s.status
    from signals s
    join orgs o on o.id = s.org_id
    join lens_scores ls on ls.signal_id = s.id and ls.lens = ${lens}
    where o.status = 'active'`
  const uniq = (key: 'segment' | 'signal_type' | 'status') =>
    [...new Set(rows.map((r) => r[key] as string))].sort()
  return { segments: uniq('segment'), signalTypes: uniq('signal_type'), statuses: uniq('status') }
}

export async function listOrgsAdmin(sql: Sql): Promise<OrgAdminRow[]> {
  const rows = await sql`
    select o.id, o.slug, o.name, o.domain, o.segment, o.ats, o.ats_detected, o.status,
           o.consecutive_failures, o.first_scanned_at,
           (select count(*) from postings p where p.org_id = o.id and p.removed_at is null) as active_postings
    from orgs o order by o.consecutive_failures desc, o.name asc`
  return rows.map((r) => ({
    id: r.id as number, slug: r.slug as string, name: r.name as string, domain: r.domain as string,
    segment: r.segment as string, ats: (r.ats as string | null), atsDetected: (r.ats_detected as string | null),
    status: r.status as string, consecutiveFailures: r.consecutive_failures as number,
    firstScannedAt: r.first_scanned_at ? new Date(r.first_scanned_at as string).toISOString() : null,
    activePostings: Number(r.active_postings),
  }))
}
