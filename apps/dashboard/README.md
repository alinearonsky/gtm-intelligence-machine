# GTM Intelligence Dashboard

Next.js App Router dashboard over the GTM signals DB. Deployed twice from this
one codebase.

## Local dev
- Copy `.env.example` -> `.env.local`, set `DASHBOARD_DATABASE_URL` (Supabase transaction-pooler URL, port 6543).
- `npm run dev:dashboard`

## Deploy (Vercel)
- Project root: `apps/dashboard`. Install runs at the repo root (npm workspaces).
- **Public demo:** `DASHBOARD_DATABASE_URL` = demo DB pooler URL; `INSTANCE_MODE=public`.
- **Private instance:** separate Vercel project; `DASHBOARD_DATABASE_URL` = private DB
  pooler URL; `INSTANCE_MODE=private`; `DASHBOARD_BASIC_AUTH_USER` / `DASHBOARD_BASIC_AUTH_PASS` set.
  Do not link this URL anywhere; it is `noindex`. A private instance without both
  creds refuses to boot (503) by design.
- The `/ontology` page reads `ontology/*.yaml` at BUILD time (it's static). Those repo
  files must be present in the build context (they are, in this monorepo).

## Tests
- `npm test` — unit + component (jsdom) + pglite-backed DB integration tests (no Docker needed).
- `npm run test:db` — just the pglite DB integration tests.
