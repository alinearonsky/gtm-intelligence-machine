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

  it("a re-fire resurrects a 'stale' signal to 'new' (the one machine-owned transition)", async () => {
    const rec: SignalRecord = {
      orgId: 1, signalType: 'entering-adoption', stage: 'early', strength: 4,
      ruleId: 'first-terminology-hire', evidenceKey: 'k2',
      evidence: [{ externalId: 'x2', url: 'https://a.example/x2', quote: 'q' }],
      confidence: 0.9, isBaselineAssessment: false, rulesVersion: 1,
    }
    const id = await store.upsertSignal(rec)
    await db.query(`update signals set status = 'stale' where id = $1`, [id])
    await store.upsertSignal(rec)
    const res = await db.query<{ status: string }>(`select status from signals where id = $1`, [id])
    expect(res.rows[0]!.status).toBe('new')
  })

  it('retireStaleSignals stales only new signals absent from activeKeys', async () => {
    const rec = (evidenceKey: string): SignalRecord => ({
      orgId: 1, signalType: 'entering-adoption', stage: 'early', strength: 4,
      ruleId: 'first-terminology-hire', evidenceKey,
      evidence: [{ externalId: 'x', url: 'https://a.example/x', quote: 'q' }],
      confidence: 0.9, isBaselineAssessment: false, rulesVersion: 1,
    })
    const keep = await store.upsertSignal(rec('keep'))
    const drop = await store.upsertSignal(rec('drop'))
    const curated = await store.upsertSignal(rec('curated'))
    await db.query(`update signals set status = 'new' where id = any($1)`, [[keep, drop]])
    await db.query(`update signals set status = 'reviewed' where id = $1`, [curated])

    // 'k2' from the resurrect test above is also status 'new' for org 1 — keep
    // it active here so this test only retires 'drop'.
    const retired = await store.retireStaleSignals(1, [
      { ruleId: 'first-terminology-hire', evidenceKey: 'keep' },
      { ruleId: 'first-terminology-hire', evidenceKey: 'k2' },
    ])
    expect(retired).toBe(1)
    const res = await db.query<{ id: number; status: string }>(`select id, status from signals where id = any($1) order by id`, [[keep, drop, curated]])
    const byId = new Map(res.rows.map((r) => [r.id, r.status]))
    expect(byId.get(keep)).toBe('new')
    expect(byId.get(drop)).toBe('stale')
    expect(byId.get(curated)).toBe('reviewed')
  })

  it('empty activeKeys retires every new signal of the org (all rules stopped firing)', async () => {
    // state from the tests above: k2 + keep are 'new'; k1 dismissed, curated reviewed, drop stale
    const retired = await store.retireStaleSignals(1, [])
    expect(retired).toBe(2)
    const res = await db.query<{ status: string; n: string }>(
      `select status, count(*) as n from signals where org_id = 1 group by status`)
    const byStatus = new Map(res.rows.map((r) => [r.status, Number(r.n)]))
    expect(byStatus.get('new') ?? 0).toBe(0)
    expect(byStatus.get('stale')).toBe(3)
    expect(byStatus.get('dismissed')).toBe(1)
    expect(byStatus.get('reviewed')).toBe(1)
  })
})
