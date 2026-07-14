import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import net from 'node:net'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'
import { PGLiteSocketServer } from '@electric-sql/pglite-socket'
import postgres from 'postgres'
import { PostgresStore } from '../src/store/postgres.ts'

// this file: packages/worker/test/ → one level up = packages/worker → migrations
const MIGRATIONS = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'migrations')

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

let db: InstanceType<typeof PGlite>
let server: PGLiteSocketServer
let store: PostgresStore
let sql: postgres.Sql

beforeAll(async () => {
  db = await PGlite.create()
  for (const f of readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort()) {
    await db.exec(readFileSync(join(MIGRATIONS, f), 'utf8'))
  }
  const port = await freePort()
  // Two separate postgres-js clients connect concurrently in this file (the
  // PostgresStore under test, plus a raw `sql` client for seeding fixtures) —
  // the socket server's maxConnections defaults to 1, so it must be raised.
  server = new PGLiteSocketServer({ db, port, host: '127.0.0.1', maxConnections: 5 })
  await server.start()
  const url = `postgres://postgres:postgres@127.0.0.1:${port}/postgres`
  store = new PostgresStore(url)
  sql = postgres(url, { max: 1 })
})

afterAll(async () => { await store?.close(); await sql?.end(); await server?.stop(); await db?.close() })

describe('narrative store', () => {
  it('builds input from signals + extraction facts and round-trips signature', async () => {
    const orgId = await store.upsertOrg({ slug: 'acme', name: 'Acme', domain: 'acme.com', segment: 'payer', products: ['tt'] })
    // seed a posting + ok extraction with a new-function role naming FHIR
    await sql`insert into postings (org_id, external_id, content_hash, title, url, description, is_baseline, prefilter_pass, first_seen, last_seen)
              values (${orgId}, 'p1', 'h', 'Terminologist', 'https://acme.com/p1', 'FHIR work', false, true, now(), now())`
    const [{ id: pid }] = await sql`select id from postings where external_id='p1'`
    await sql`insert into extractions (posting_id, role_category, seniority, standards_mentioned, function_type, confidence, model, prompt_version)
              values (${pid}, 'data-quality', 'senior', '{FHIR}', 'new-function', 0.9, 'm', 'ext-v1')`
    // seed a signal + lens score
    await sql`insert into signals (org_id, signal_type, stage, strength, rule_id, evidence_key, evidence, confidence, is_baseline_assessment, rules_version)
              values (${orgId}, 'standards-adoption', 'mid', 4, 'r1', 'k1', '[]'::jsonb, 0.9, false, 1)`
    const [{ id: sid }] = await sql`select id from signals where org_id=${orgId}`
    await sql`insert into lens_scores (signal_id, lens, priority, rationale, rubric_version) values (${sid}, 'tt', 'act-now', 'why', 2)`

    const input = await store.getOrgNarrativeInput(orgId, 'tt')
    expect(input).not.toBeNull()
    expect(input!.standards).toContain('FHIR')
    expect(input!.newFunctionCount).toBe(1)
    expect(input!.signals[0]!.priority).toBe('act-now')
    expect(input!.baselineOnly).toBe(false)

    expect(await store.getStoredNarrativeSignature(orgId, 'tt')).toBeNull()
    await store.upsertOrgNarrative({ orgId, lens: 'tt', narrative: 'n', model: 'm', promptVersion: 'narr-v1', sourceSignature: 'sig1' })
    expect(await store.getStoredNarrativeSignature(orgId, 'tt')).toBe('sig1')
    await store.upsertOrgNarrative({ orgId, lens: 'tt', narrative: 'n2', model: 'm', promptVersion: 'narr-v1', sourceSignature: 'sig2' })
    expect(await store.getStoredNarrativeSignature(orgId, 'tt')).toBe('sig2')
  })

  it('returns null input when no scored signal exists for the lens', async () => {
    const orgId = await store.upsertOrg({ slug: 'empty', name: 'Empty', domain: 'e.com', segment: 'payer', products: ['tt'] })
    expect(await store.getOrgNarrativeInput(orgId, 'tt')).toBeNull()
  })
})
