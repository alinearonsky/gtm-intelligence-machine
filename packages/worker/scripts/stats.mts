// One-off inspection: prefilter hit-rate + top matched orgs. Run: npx tsx packages/worker/scripts/stats.mts
import postgres from 'postgres'

const sql = postgres(process.env.DATABASE_URL!, { max: 1 })
const totals = await sql<{ total: number; passed: number; baseline: number }[]>`
  select count(*)::int as total,
         count(*) filter (where prefilter_pass)::int as passed,
         count(*) filter (where is_baseline)::int as baseline
  from postings`
const t = totals[0]!
console.log(`postings: ${t.total} · prefilter-pass: ${t.passed} · baseline: ${t.baseline}`)
const rows = await sql`
  select o.name, count(*)::int as hits,
         array_agg(distinct m) as roles
  from postings p join orgs o on o.id = p.org_id, unnest(p.prefilter_matches) m
  where p.prefilter_pass
  group by o.name order by hits desc limit 12`
for (const r of rows) console.log(`${String(r.hits).padStart(3)}  ${r.name}  [${r.roles.join(', ')}]`)
const runs = await sql`select id, started_at, orgs_scanned, orgs_failed, postings_new from scan_runs order by id`
console.log('runs:', runs.map((r) => `#${r.id} scanned=${r.orgs_scanned} failed=${r.orgs_failed} new=${r.postings_new}`).join(' | '))

const ext = await sql<{ ok: number; failed: number }[]>`
  select count(*) filter (where status = 'ok')::int as ok,
         count(*) filter (where status = 'failed')::int as failed
  from extractions`
const e = ext[0]!
console.log(`extractions: ${e.ok} ok · ${e.failed} failed`)

const sig = await sql`
  select signal_type, count(*)::int as n from signals group by signal_type order by n desc`
console.log('signals:', sig.map((r) => `${r.signal_type}=${r.n}`).join(' · ') || '(none)')

const pri = await sql`
  select ls.lens, ls.priority, count(*)::int as n
  from lens_scores ls group by ls.lens, ls.priority order by ls.lens, ls.priority`
console.log('lens scores:', pri.map((r) => `${r.lens}/${r.priority}=${r.n}`).join(' · ') || '(none)')

await sql.end()
