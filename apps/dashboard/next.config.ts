import type { NextConfig } from 'next'
import { join } from 'node:path'

const config: NextConfig = {
  // @gtm/core ships raw TS (main: src/index.ts); Next must transpile it.
  transpilePackages: ['@gtm/core'],
  eslint: { ignoreDuringBuilds: true },
  // Repo root (two levels up from apps/dashboard) — silences the multi-lockfile
  // warning and makes file tracing deterministic in the monorepo.
  outputFileTracingRoot: join(import.meta.dirname, '..', '..'),
}

export default config
