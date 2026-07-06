import { ZodError } from 'zod'
import { RawPosting, type AtsTypeT, type RawPostingT } from '@gtm/core'

export interface AtsAdapter {
  type: AtsTypeT
  /** Fetch all currently open postings for a board slug. Throws AtsError on any failure. */
  fetchPostings(slug: string): Promise<RawPostingT[]>
  /** Cheap existence check: does this slug host a board on this ATS?
   *  Shape-checks the list response only — no job parsing, no detail calls.
   *  MUST return false (never throw) when the slug isn't hosted here. */
  probe(slug: string): Promise<boolean>
}

export class AtsError extends Error {
  constructor(public ats: string, public slug: string, message: string) {
    super(`[${ats}:${slug}] ${message}`)
    this.name = 'AtsError'
  }
}

/** Validate an adapter-mapped posting; failures carry ats/slug/job context. */
export function parsePosting(ats: string, slug: string, jobRef: string, data: unknown): RawPostingT {
  try {
    return RawPosting.parse(data)
  } catch (e) {
    const detail = e instanceof ZodError
      ? e.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
      : e instanceof Error ? e.message : String(e)
    throw new AtsError(ats, slug, `invalid job ${jobRef}: ${detail}`)
  }
}

export async function getJson(url: string, ats: string, slug: string, init?: RequestInit): Promise<unknown> {
  let res: Response
  try {
    res = await fetch(url, { ...init, signal: AbortSignal.timeout(15_000) })
  } catch (e) {
    throw new AtsError(ats, slug, `network error: ${e instanceof Error ? e.message : String(e)}`)
  }
  if (!res.ok) throw new AtsError(ats, slug, `HTTP ${res.status} for ${url}`)
  try {
    return await res.json()
  } catch {
    throw new AtsError(ats, slug, `non-JSON response for ${url}`)
  }
}
