import type { Sql } from 'postgres'

const ALLOWED = new Set(['new', 'reviewed', 'acted', 'dismissed'])

/** The dashboard's ONLY write. Status is user-owned; the worker's signal
 *  upsert must never overwrite it (see packages/worker/src/store/postgres.ts). */
export async function setSignalStatus(sql: Sql, signalId: number, status: string): Promise<void> {
  if (!ALLOWED.has(status)) throw new Error(`invalid status: ${status}`)
  const res = await sql`update signals set status = ${status} where id = ${signalId}`
  if (res.count === 0) throw new Error(`no signal with id ${signalId}`)
}
