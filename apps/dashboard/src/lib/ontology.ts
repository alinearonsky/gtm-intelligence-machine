import { join } from 'node:path'
import { readFileSync } from 'node:fs'
import { parse } from 'yaml'
import { loadRules, loadLens, type RuleT, type LensFileT } from '@gtm/core'

// Ontology YAML lives at the repo root, two levels up from apps/dashboard.
// Resolved at BUILD time only — the /ontology page is static, so this read
// happens during `next build` (cwd = apps/dashboard → two levels up = repo
// root). If a deploy runs `next build` from a different cwd or uses
// output:'standalone' file-tracing, this path must be revisited.
const ROOT = join(process.cwd(), '..', '..', 'ontology')

export interface RoleEntry { id: string; label: string; hints: string[] }

export function getRules(): { version: number; rules: RuleT[] } {
  return loadRules(join(ROOT, 'signal-rules.yaml'))
}
export function getLens(lens: string): LensFileT {
  return loadLens(join(ROOT, 'lenses', `${lens}.yaml`))
}
export function getRoles(): { version: number; roles: RoleEntry[] } {
  return parse(readFileSync(join(ROOT, 'roles.yaml'), 'utf8')) as { version: number; roles: RoleEntry[] }
}
