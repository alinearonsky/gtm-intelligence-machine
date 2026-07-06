# GTM Intelligence Machine

Timing intelligence for healthtech GTM. Watches healthtech organizations' hiring
activity, classifies postings into domain-interpreted buying signals via a codified
clinical-terminology ontology, and surfaces "who to target now, and why."

**Status:** Plan 1 complete — daily scan worker live. Signal engine (Plan 2) and dashboard (Plan 3) in progress.

## How it works
1. `watchlists/demo.yaml` lists watched orgs (ATS board slug + segment + product tags).
2. A GitHub Actions cron runs the worker daily: fetch postings (Greenhouse / Lever /
   Ashby / SmartRecruiters / Workable public JSON APIs) → keyword pre-filter from
   `ontology/roles.yaml` → diff vs. history → persist to Postgres.
3. An org's first scan is a **baseline** (stage snapshot, never an "act now" signal) —
   timing rules only fire on post-baseline changes.

## Setup
```bash
npm install
export DATABASE_URL='postgres://...'   # Supabase free tier works
npm run migrate
npm run scan
```
CI: add `DATABASE_URL` as a repo Actions secret; the `daily-scan` workflow does the rest.

## Tests
```bash
npm test
```
