import { readFileSync } from 'node:fs'
import { parse } from 'yaml'
import { ZodError } from 'zod'
import { Watchlist, type WatchlistT } from './types.ts'

export function loadWatchlist(path: string): WatchlistT {
  let wl: WatchlistT
  try {
    wl = Watchlist.parse(parse(readFileSync(path, 'utf8')))
  } catch (e) {
    const detail = e instanceof ZodError
      ? e.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
      : e instanceof Error ? e.message : String(e)
    throw new Error(`Invalid watchlist ${path}: ${detail}`, { cause: e })
  }
  const seen = new Set<string>()
  for (const org of wl.orgs) {
    if (seen.has(org.slug)) throw new Error(`Invalid watchlist ${path}: duplicate slug "${org.slug}"`)
    seen.add(org.slug)
  }
  return wl
}
