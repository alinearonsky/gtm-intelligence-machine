import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import net from 'node:net'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'
import { PGLiteSocketServer } from '@electric-sql/pglite-socket'
import postgres from 'postgres'

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
let sql: postgres.Sql

beforeAll(async () => {
  db = await PGlite.create()
  for (const f of readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort()) {
    await db.exec(readFileSync(join(MIGRATIONS, f), 'utf8'))
  }
  const port = await freePort()
  server = new PGLiteSocketServer({ db, port, host: '127.0.0.1' })
  await server.start()
  sql = postgres(`postgres://postgres:postgres@127.0.0.1:${port}/postgres`, { max: 4 })
})

afterAll(async () => { await sql?.end(); await server?.stop(); await db?.close() })

describe('migrations', () => {
  it('creates org_narratives with a composite PK', async () => {
    await sql`insert into orgs (slug, name, domain, segment, products) values ('acme','Acme','acme.com','payer','{tt}')`
    const [{ id }] = await sql`select id from orgs where slug='acme'`
    await sql`insert into org_narratives (org_id, lens, narrative, model, prompt_version, source_signature)
              values (${id}, 'tt', 'n', 'm', 'narr-v1', 'sig1')`
    await expect(
      sql`insert into org_narratives (org_id, lens, narrative, model, prompt_version, source_signature)
          values (${id}, 'tt', 'n2', 'm', 'narr-v1', 'sig2')`
    ).rejects.toThrow()
  })
})
