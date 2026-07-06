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
await sql.end()
