import { PostgresStore } from './store/postgres.ts'
import { anthropicNarrator } from './narrate/narrator.ts'
import { runNarrate } from './narrate/run.ts'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) { console.error('DATABASE_URL not set'); process.exit(1) }
if (!process.env.ANTHROPIC_API_KEY) { console.error('ANTHROPIC_API_KEY not set'); process.exit(1) }

const store = new PostgresStore(databaseUrl)
const summary = await runNarrate({ store, narrator: anthropicNarrator(), lenses: ['tt'], log: (m) => console.log(m) })
await store.close()
console.log(JSON.stringify(summary, null, 2))
