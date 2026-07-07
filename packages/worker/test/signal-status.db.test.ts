import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import net from 'node:net'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'
import { PGLiteSocketServer } from '@electric-sql/pglite-socket'
import { PostgresStore } from '../src/store/postgres.ts'
import type { SignalRecord } from '../src/store/types.ts'

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

beforeAll(async () => {
  db = await PGlite.create()
  for (const f of readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort()) {
    await db.exec(readFileSync(join(MIGRATIONS, f), 'utf8'))
  }
  await db.exec(`insert into orgs (slug, name, domain, segment, products)
                 values ('acme','Acme','a.example','ehr-vendor', array['tt'])`)
  const port = await freePort()
  server = new PGLiteSocketServer({ db, port, host: '127.0.0.1' })
  await server.start()
  store = new PostgresStore(`postgres://postgres:postgres@127.0.0.1:${port}/postgres`)
})

afterAll(async () => { await store?.close(); await server?.stop(); await db?.close() })

describe('signal upsert preserves user-owned status', () => {
  it('a re-fire does NOT reset a dismissed signal to new', async () => {
    const rec: SignalRecord = {
      orgId: 1, signalType: 'entering-adoption', stage: 'early', strength: 4,
      ruleId: 'first-terminology-hire', evidenceKey: 'k1',
      evidence: [{ externalId: 'x1', url: 'https://a.example/x1', quote: 'q' }],
      confidence: 0.9, isBaselineAssessment: false, rulesVersion: 1,
    }
    const id = await store.upsertSignal(rec)
    await db.query(`update signals set status = 'dismissed' where id = $1`, [id])
    // Same (org_id, rule_id, evidence_key) — the nightly re-fire path.
    await store.upsertSignal({ ...rec, strength: 5 })
    const res = await db.query<{ status: string; strength: number }>(
      `select status, strength from signals where id = $1`, [id])
    expect(res.rows[0]!.status).toBe('dismissed') // user's curation survives
    expect(res.rows[0]!.strength).toBe(5)          // rule fields still refresh
  })
})
