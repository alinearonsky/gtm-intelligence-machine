import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadWatchlist, loadRoleHints, prefilter as corePrefilter } from '@gtm/core'
import { adapters } from './ats/index.ts'
import { PostgresStore } from './store/postgres.ts'
import { runScan } from './scan.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const watchlistPath = process.env.WATCHLIST ?? join(root, 'watchlists', 'demo.yaml')
const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) { console.error('DATABASE_URL not set'); process.exit(1) }

const watchlist = loadWatchlist(watchlistPath)
const roleHints = loadRoleHints(join(root, 'ontology', 'roles.yaml'))
const store = new PostgresStore(databaseUrl)

const summary = await runScan(watchlist, {
  store, adapters,
  prefilter: (p) => corePrefilter(p, roleHints),
  now: () => new Date().toISOString(),
})
await store.close()

console.log(JSON.stringify(summary, null, 2))
const allFailed = summary.orgsScanned > 0 && summary.orgsFailed === summary.orgsScanned
if (allFailed) { console.error('ALL orgs failed — treating run as failed'); process.exit(1) }
