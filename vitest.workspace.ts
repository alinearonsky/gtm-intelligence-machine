import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'

const dirname = path.dirname(fileURLToPath(import.meta.url))

export default [
  {
    // Fast unit tests (node): core, worker, dashboard lib/db unit tests.
    test: {
      name: 'unit',
      environment: 'node',
      include: ['packages/**/*.test.ts', 'apps/dashboard/src/**/*.test.ts'],
      exclude: ['**/node_modules/**', '**/*.dom.test.tsx', '**/*.db.test.ts'],
    },
  },
  {
    // Component tests (jsdom + React Testing Library).
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(dirname, 'apps/dashboard/src'),
      },
    },
    test: {
      name: 'dom',
      environment: 'jsdom',
      include: ['apps/dashboard/**/*.dom.test.tsx'],
      setupFiles: ['apps/dashboard/vitest.setup.ts'],
    },
  },
  {
    // On-demand Postgres integration tests (in-process pglite, no Docker). Run via `npm run test:db`.
    test: {
      name: 'db',
      environment: 'node',
      include: ['apps/dashboard/**/*.db.test.ts', 'packages/**/*.db.test.ts'],
      testTimeout: 120_000,
      hookTimeout: 120_000,
    },
  },
]
