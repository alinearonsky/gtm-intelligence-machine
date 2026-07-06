import { readFileSync } from 'node:fs'
import { parse } from 'yaml'
import { z } from 'zod'
import { RoleCategory, Seniority, Standard, FunctionType,
  type RoleCategoryT, type SeniorityT, type StandardT, type FunctionTypeT } from './extract-types.ts'

// --- Facts the engine reasons over (built by the store from stored extractions) ---
export interface OrgPostingFacts {
  externalId: string
  url: string
  evidenceQuote: string
  roleCategory: RoleCategoryT
  seniority: SeniorityT
  standardsMentioned: StandardT[]
  functionType: FunctionTypeT
  confidence: number
  isBaseline: boolean
  firstSeen: string          // ISO
  removedAt: string | null   // ISO or null
}
export interface OrgContext { orgId: number; postings: OrgPostingFacts[] }

// --- Pure output of the engine, before persistence ---
export interface SignalDraft {
  orgId: number
  ruleId: string
  signalType: string
  stage: string
  strength: number
  evidenceKey: string
  evidence: { externalId: string; url: string; quote: string }[]
  confidence: number
  isBaselineAssessment: boolean
}

// --- The condition DSL: a fixed, documented set of primitives ---
const Condition = z.discriminatedUnion('type', [
  z.object({ type: z.literal('role-is'), roles: z.array(RoleCategory).min(1) }),
  z.object({ type: z.literal('is-baseline') }),
  z.object({ type: z.literal('not-baseline') }),
  z.object({ type: z.literal('function-is'), functions: z.array(FunctionType).min(1) }),
  z.object({ type: z.literal('seniority-in'), seniorities: z.array(Seniority).min(1) }),
  z.object({ type: z.literal('prior-role-count'), role: RoleCategory, op: z.enum(['eq', 'gte', 'lte']), value: z.number().int().min(0) }),
  z.object({ type: z.literal('cluster-within-days'), roles: z.array(RoleCategory).min(1), count: z.number().int().min(2), days: z.number().int().min(1) }),
  z.object({ type: z.literal('trigger-removed'), maxLifetimeDays: z.number().int().min(1) }),
  z.object({ type: z.literal('standards-new'), standards: z.array(Standard).min(1) }),
])
export type ConditionT = z.infer<typeof Condition>

const Rule = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  signal_type: z.string().min(1),
  stage: z.enum(['pre-adoption', 'early', 'mid', 'late', 'unknown']),
  strength: z.number().int().min(1).max(5),
  baseline_safe: z.boolean(),
  dedupe: z.enum(['per-posting', 'per-org']).default('per-posting'),
  rationale: z.string().min(1),
  when: z.array(Condition).min(1),
})
export type RuleT = z.infer<typeof Rule>

const RulesFile = z.object({ version: z.number().int(), rules: z.array(Rule).min(1) })
export type RulesFileT = z.infer<typeof RulesFile>

export function loadRules(path: string): RulesFileT {
  let file: RulesFileT
  try {
    file = RulesFile.parse(parse(readFileSync(path, 'utf8')))
  } catch (e) {
    throw new Error(`Invalid signal-rules.yaml ${path}: ${e instanceof Error ? e.message : String(e)}`)
  }
  const seen = new Set<string>()
  for (const r of file.rules) {
    if (seen.has(r.id)) throw new Error(`Invalid signal-rules.yaml ${path}: duplicate rule id "${r.id}"`)
    seen.add(r.id)
    const hasNotBaseline = r.when.some((c) => c.type === 'not-baseline')
    const hasIsBaseline = r.when.some((c) => c.type === 'is-baseline')
    if (!r.baseline_safe && !hasNotBaseline)
      throw new Error(`Invalid signal-rules.yaml ${path}: rule "${r.id}" is baseline_safe: false but has no not-baseline condition`)
    if (r.baseline_safe && !hasIsBaseline)
      throw new Error(`Invalid signal-rules.yaml ${path}: rule "${r.id}" is baseline_safe: true but has no is-baseline condition`)
  }
  return file
}

const DAY_MS = 86_400_000

function evalCondition(c: ConditionT, trigger: OrgPostingFacts, ctx: OrgContext): boolean {
  switch (c.type) {
    case 'role-is': return c.roles.includes(trigger.roleCategory)
    case 'is-baseline': return trigger.isBaseline
    case 'not-baseline': return !trigger.isBaseline
    case 'function-is': return c.functions.includes(trigger.functionType)
    case 'seniority-in': return c.seniorities.includes(trigger.seniority)
    case 'prior-role-count': {
      // "Prior" = other postings of this role anywhere in the org's context,
      // not just earlier in time: this is a pure, replay-from-scratch
      // evaluator with no incremental state, so "first hire" only holds
      // while the trigger is the org's sole posting of that role.
      const n = ctx.postings.filter((p) => p.roleCategory === c.role && p.externalId !== trigger.externalId).length
      return c.op === 'eq' ? n === c.value : c.op === 'gte' ? n >= c.value : n <= c.value
    }
    case 'cluster-within-days': {
      const t = Date.parse(trigger.firstSeen)
      const n = ctx.postings.filter((p) =>
        c.roles.includes(p.roleCategory) && p.removedAt === null &&
        Math.abs(Date.parse(p.firstSeen) - t) <= c.days * DAY_MS).length
      return n >= c.count
    }
    case 'trigger-removed':
      return trigger.removedAt !== null &&
        Date.parse(trigger.removedAt) - Date.parse(trigger.firstSeen) <= c.maxLifetimeDays * DAY_MS
    case 'standards-new': {
      const prior = new Set(ctx.postings.filter((p) => p.firstSeen < trigger.firstSeen).flatMap((p) => p.standardsMentioned))
      return trigger.standardsMentioned.some((s) => c.standards.includes(s) && !prior.has(s))
    }
  }
}

function buildSignal(orgId: number, rule: RuleT, fires: OrgPostingFacts[], evidenceKey: string): SignalDraft {
  const sorted = [...fires].sort((a, b) => (a.externalId < b.externalId ? -1 : a.externalId > b.externalId ? 1 : 0))
  const baseline = sorted.some((f) => f.isBaseline)
  const minConf = Math.min(...sorted.map((f) => f.confidence))
  return {
    orgId, ruleId: rule.id, signalType: rule.signal_type, stage: rule.stage, strength: rule.strength,
    evidenceKey,
    evidence: sorted.map((f) => ({ externalId: f.externalId, url: f.url, quote: f.evidenceQuote })),
    confidence: Number((minConf * (baseline ? 0.6 : 1)).toFixed(3)),
    isBaselineAssessment: baseline,
  }
}

/** Pure: evaluate every rule over the org context. Replayable over stored
 *  extractions with no LLM call — improving the ontology retro-scores for free. */
export function runRulesOverContext(ctx: OrgContext, file: RulesFileT): SignalDraft[] {
  const out: SignalDraft[] = []
  for (const rule of file.rules) {
    const fires = ctx.postings.filter((t) => rule.when.every((c) => evalCondition(c, t, ctx)))
    if (fires.length === 0) continue
    // per-org: ONE signal keyed on the rule id (membership-independent), so a
    // growing/shrinking cluster UPDATES the single signal instead of minting a
    // new row (distinct evidence set) on every scan. per-posting: one signal
    // per firing posting, keyed on its external id.
    if (rule.dedupe === 'per-org') out.push(buildSignal(ctx.orgId, rule, fires, rule.id))
    else for (const t of fires) out.push(buildSignal(ctx.orgId, rule, [t], t.externalId))
  }
  return out
}
