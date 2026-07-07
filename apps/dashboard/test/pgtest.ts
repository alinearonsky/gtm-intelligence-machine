import net from 'node:net'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import postgres, { type Sql } from 'postgres'
import { PGlite } from '@electric-sql/pglite'
import { PGLiteSocketServer } from '@electric-sql/pglite-socket'

// this file: apps/dashboard/test/pgtest.ts  →  three levels up = repo root
const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..', '..')
const MIGRATIONS = join(ROOT, 'packages', 'worker', 'migrations')

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const s = net.createServer()
    s.on('error', reject)
    s.listen(0, '127.0.0.1', () => {
      const port = (s.address() as net.AddressInfo).port
      s.close(() => resolve(port))
    })
  })
}

export interface TestDb { sql: Sql; stop: () => Promise<void> }

export async function startTestDb(): Promise<TestDb> {
  const db = await PGlite.create()
  const port = await freePort()
  const server = new PGLiteSocketServer({ db, port, host: '127.0.0.1' })
  await server.start()
  const sql = postgres({
    host: '127.0.0.1', port, database: 'postgres', username: 'postgres', password: 'postgres',
    prepare: false, max: 1,
  })
  for (const f of readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort()) {
    await sql.unsafe(readFileSync(join(MIGRATIONS, f), 'utf8'))
  }
  return { sql, stop: async () => { await sql.end(); await server.stop(); await db.close() } }
}

/** Two invented orgs, each with a signal + tt lens score. Org B's signal has
 *  two-posting evidence — the fan-out case a bad join would cross-wire. */
export async function seedFixture(sql: Sql): Promise<void> {
  const [a] = await sql<{ id: number }[]>`
    insert into orgs (slug, name, domain, segment, products)
    values ('acme-health', 'Acme Health', 'acme.example', 'digital-health-startup', ${sql.array(['tt'])})
    returning id`
  const [b] = await sql<{ id: number }[]>`
    insert into orgs (slug, name, domain, segment, products)
    values ('beta-labs', 'Beta Labs', 'beta.example', 'ehr-vendor', ${sql.array(['tt'])})
    returning id`

  const [sa] = await sql<{ id: number }[]>`
    insert into signals (org_id, signal_type, stage, strength, rule_id, evidence_key, evidence, confidence, is_baseline_assessment, rules_version, status)
    values (${a!.id}, 'stage-assessment', 'early', 2, 'baseline-stage', 'k-a',
      ${sql.json([{ externalId: 'a1', url: 'https://acme.example/a1', quote: 'Acme quote' }])},
      0.8, true, 1, 'new')
    returning id`
  const [sb] = await sql<{ id: number }[]>`
    insert into signals (org_id, signal_type, stage, strength, rule_id, evidence_key, evidence, confidence, is_baseline_assessment, rules_version, status)
    values (${b!.id}, 'entering-adoption', 'early', 4, 'first-terminology-hire', 'k-b',
      ${sql.json([
        { externalId: 'b1', url: 'https://beta.example/b1', quote: 'Beta quote 1' },
        { externalId: 'b2', url: 'https://beta.example/b2', quote: 'Beta quote 2' },
      ])},
      0.9, false, 1, 'new')
    returning id`

  await sql`insert into lens_scores (signal_id, lens, priority, rationale, rubric_version)
    values (${sa!.id}, 'tt', 'watch', 'Acme: baseline early-stage assessment.', 1)`
  await sql`insert into lens_scores (signal_id, lens, priority, rationale, rubric_version)
    values (${sb!.id}, 'tt', 'act-now', 'Beta Labs: entering-adoption — prime trial window.', 1)`
}
