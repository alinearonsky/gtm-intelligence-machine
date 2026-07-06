import type { AtsTypeT } from '@gtm/core'
import type { AtsAdapter } from './types.ts'
import { greenhouse } from './greenhouse.ts'
import { lever } from './lever.ts'
import { ashby } from './ashby.ts'
import { smartrecruiters } from './smartrecruiters.ts'
import { workable } from './workable.ts'

export const adapters: Record<AtsTypeT, AtsAdapter> = {
  greenhouse, lever, ashby, smartrecruiters, workable,
}

/** Probe each ATS with the org's slug; first success wins. Order: cheapest/most common first. */
export async function detectAts(slug: string): Promise<AtsTypeT | null> {
  const order: AtsTypeT[] = ['greenhouse', 'lever', 'ashby', 'workable', 'smartrecruiters']
  for (const type of order) {
    if (await adapters[type].probe(slug)) return type
  }
  return null
}

export { AtsError, parsePosting } from './types.ts'
export type { AtsAdapter } from './types.ts'
