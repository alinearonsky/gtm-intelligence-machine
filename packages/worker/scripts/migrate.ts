import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import postgres from 'postgres'

const url = process.env.DATABASE_URL
if (!url) { console.error('DATABASE_URL not set'); process.exit(1) }
const sql = postgres(url, { max: 1 })
const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations')
// all migrations must stay idempotent — no ledger table yet; add one before non-idempotent DDL
for (const f of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
  console.log(`applying ${f}`)
  await sql.unsafe(readFileSync(join(dir, f), 'utf8'))
}
await sql.end()
console.log('migrations complete')
