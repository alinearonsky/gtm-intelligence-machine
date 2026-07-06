import Anthropic from '@anthropic-ai/sdk'
import { PostgresStore } from './store/postgres.ts'
import { anthropicExtractor, EXTRACTION_MODEL, EXTRACTION_PROMPT_VERSION } from './extract/extractor.ts'
import { runExtraction } from './extract/run.ts'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) { console.error('DATABASE_URL not set'); process.exit(1) }
if (!process.env.ANTHROPIC_API_KEY) { console.error('ANTHROPIC_API_KEY not set'); process.exit(1) }

const store = new PostgresStore(databaseUrl)
const summary = await runExtraction({
  store,
  extractor: anthropicExtractor(new Anthropic()),
  promptVersion: EXTRACTION_PROMPT_VERSION,
  model: EXTRACTION_MODEL,
  concurrency: 4,
  now: () => new Date().toISOString(),
  log: (m) => console.log(m),
})
await store.close()
console.log(JSON.stringify(summary, null, 2))
