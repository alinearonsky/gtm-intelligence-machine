import type { OrgProfile } from '../db/types.ts'

type Priority = 'act-now' | 'watch' | 'ignore'
const RANK: Record<Priority, number> = { 'act-now': 3, watch: 2, ignore: 1 }

export function standardsFootprint(p: OrgProfile): string[] {
  return [...new Set(p.postings.flatMap((x) => x.standards))].sort()
}

export function newFunctionCount(p: OrgProfile): number {
  return p.postings.filter((x) => x.functionType === 'new-function').length
}

export function topPriority(p: OrgProfile): Priority | null {
  const ranked = p.signals
    .map((s) => s.priority as Priority)
    .filter((pr): pr is Priority => pr in RANK)
    .sort((a, b) => RANK[b] - RANK[a])
  return ranked[0] ?? null
}

export function lastSignalDate(p: OrgProfile): string | null {
  if (p.signals.length === 0) return null
  return p.signals.map((s) => s.createdAt).sort().at(-1) ?? null
}

// Deterministic string assembly over already-computed facts — no LLM. Kept as a
// pure function so it is unit-tested and identical on both instances.
export function rollupOneLiner(p: OrgProfile): string {
  const priority = topPriority(p)
  if (!priority) return 'Baseline snapshot — no active signals yet.'
  const n = newFunctionCount(p)
  const stds = standardsFootprint(p)
  const rolePart = n > 0 ? `${n} new-function role${n === 1 ? '' : 's'}` : 'active hiring'
  const stdPart = stds.length > 0 ? ` naming ${stds.join(' + ')}` : ''
  return `${rolePart}${stdPart}; priority: ${priority}.`
}
