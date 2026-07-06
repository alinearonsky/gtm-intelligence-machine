import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadRules, loadLens } from '@gtm/core'
import { PostgresStore } from './store/postgres.ts'
import { runInterpret } from './interpret/run.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) { console.error('DATABASE_URL not set'); process.exit(1) }

const rules = loadRules(join(root, 'ontology', 'signal-rules.yaml'))
const tt = loadLens(join(root, 'ontology', 'lenses', 'tt.yaml'))
const store = new PostgresStore(databaseUrl)

const summary = await runInterpret({ store, rules, lenses: [tt], log: (m) => console.log(m) })
await store.close()
console.log(JSON.stringify(summary, null, 2))
