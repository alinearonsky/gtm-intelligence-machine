'use server'

import { revalidateTag } from 'next/cache'
import { getSql } from '@/db/connection'
import { setSignalStatus } from '@/db/mutations'
import { assertWritable } from '@/lib/instance'

export async function updateSignalStatus(signalId: number, status: string): Promise<void> {
  assertWritable() // throws on the public (read-only) instance
  await setSignalStatus(getSql(), signalId, status)
  revalidateTag('signals')
}
