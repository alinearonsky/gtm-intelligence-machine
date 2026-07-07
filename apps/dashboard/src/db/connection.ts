import postgres from 'postgres'

// Serverless (Vercel) shape — NOT the worker's long-lived direct connection.
// Uses the Supabase TRANSACTION POOLER (…pooler.supabase.com:6543), i.e.
// PgBouncer in transaction mode: prepared statements are unsupported there, so
// `prepare: false` is mandatory. Lazy singleton so this module can be imported
// during `next build` without a DB URL present; the client is created on first
// use at request time and cached on globalThis for warm-invocation reuse.
const g = globalThis as unknown as { __gtmSql?: postgres.Sql }

export function getSql(): postgres.Sql {
  if (g.__gtmSql) return g.__gtmSql
  const url = process.env.DASHBOARD_DATABASE_URL
  if (!url) throw new Error('DASHBOARD_DATABASE_URL not set (Supabase transaction-pooler URL, port 6543).')
  g.__gtmSql = postgres(url, { prepare: false, max: 3, idle_timeout: 20 })
  return g.__gtmSql
}
