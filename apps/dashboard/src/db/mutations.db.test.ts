import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { TestDb } from '../../test/pgtest.ts'
import { startTestDb, seedFixture } from '../../test/pgtest.ts'
import { setSignalStatus } from './mutations.ts'

let tdb: TestDb

beforeAll(async () => { tdb = await startTestDb(); await seedFixture(tdb.sql) })
afterAll(async () => { await tdb?.stop() })

describe('setSignalStatus', () => {
  it('updates status and rejects invalid values', async () => {
    const id = (await tdb.sql<{ id: number }[]>`select id from signals order by id limit 1`)[0]!.id
    await setSignalStatus(tdb.sql, id, 'dismissed')
    const after = (await tdb.sql<{ status: string }[]>`select status from signals where id = ${id}`)[0]!
    expect(after.status).toBe('dismissed')
    await expect(setSignalStatus(tdb.sql, id, 'bogus')).rejects.toThrow(/invalid status/i)
  })
})
