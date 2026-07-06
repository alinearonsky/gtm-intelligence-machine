import { readFileSync } from 'node:fs'
import { parse } from 'yaml'
import { z, ZodError } from 'zod'
import type { RawPostingT } from './types.ts'

const RolesFile = z.object({
  version: z.number(),
  roles: z.array(z.object({ id: z.string(), label: z.string(), hints: z.array(z.string().min(2)) })),
})

export type RoleHints = { id: string; hints: string[] }[]

export function loadRoleHints(path: string): RoleHints {
  let f: z.infer<typeof RolesFile>
  try {
    f = RolesFile.parse(parse(readFileSync(path, 'utf8')))
  } catch (e) {
    const detail = e instanceof ZodError
      ? e.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
      : e instanceof Error ? e.message : String(e)
    throw new Error(`Invalid roles file ${path}: ${detail}`, { cause: e })
  }
  const seen = new Set<string>()
  for (const r of f.roles) {
    if (seen.has(r.id)) throw new Error(`Invalid roles file ${path}: duplicate role id "${r.id}"`)
    seen.add(r.id)
  }
  return f.roles.map((r) => ({ id: r.id, hints: r.hints.map((h) => h.toLowerCase()) }))
}

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function hintMatches(text: string, hint: string): boolean {
  const trimmed = hint.trim()
  if (trimmed !== hint) return new RegExp(`\\b${escapeRegex(trimmed)}\\b`).test(text)
  return text.includes(hint)
}

export function prefilter(p: RawPostingT, roles: RoleHints): { pass: boolean; matches: string[] } {
  const text = `${p.title}\n${p.description}`.toLowerCase()
  const matches = roles.filter((r) => r.hints.some((h) => hintMatches(text, h))).map((r) => r.id)
  return { pass: matches.length > 0, matches }
}
