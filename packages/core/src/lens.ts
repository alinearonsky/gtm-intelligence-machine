import { readFileSync } from 'node:fs'
import { parse } from 'yaml'
import { z } from 'zod'

const Priority = z.enum(['act-now', 'watch', 'ignore'])
export type PriorityT = z.infer<typeof Priority>

const LensRule = z.object({
  signal_types: z.array(z.string()).min(1),
  segments: z.array(z.string()).optional(),          // undefined ⇒ any segment
  min_strength: z.number().int().min(1).max(5).default(1),
  priority: Priority,
  rationale: z.string().min(1),
})

const LensFile = z.object({
  version: z.number().int(),
  lens: z.string().min(1),
  label: z.string().min(1),
  default_priority: Priority,
  rules: z.array(LensRule),
})
export type LensFileT = z.infer<typeof LensFile>

export function loadLens(path: string): LensFileT {
  try {
    return LensFile.parse(parse(readFileSync(path, 'utf8')))
  } catch (e) {
    throw new Error(`Invalid lens ${path}: ${e instanceof Error ? e.message : String(e)}`)
  }
}

export interface ScoreInput {
  signalType: string
  stage: string
  strength: number
  isBaselineAssessment: boolean
  segment: string
  orgName: string
}
export interface LensScoreDraft {
  lens: string
  priority: PriorityT
  rationale: string
  rubricVersion: number
}

function render(tpl: string, i: ScoreInput): string {
  return tpl
    .replaceAll('{org}', i.orgName).replaceAll('{signalType}', i.signalType)
    .replaceAll('{strength}', String(i.strength)).replaceAll('{stage}', i.stage)
}

export function scoreSignal(input: ScoreInput, lens: LensFileT): LensScoreDraft {
  let priority: PriorityT = lens.default_priority
  let rationale = `${input.orgName}: ${input.signalType} — no lens rule matched (default ${priority}).`
  for (const r of lens.rules) {
    if (!r.signal_types.includes(input.signalType)) continue
    if (r.segments && !r.segments.includes(input.segment)) continue
    if (input.strength < r.min_strength) continue
    priority = r.priority
    rationale = render(r.rationale, input)
    break
  }
  // Hard rule (spec §Cold-start + project CLAUDE.md): baseline assessments are
  // never act-now urgency, whatever the rubric says.
  if (input.isBaselineAssessment && priority === 'act-now') priority = 'watch'
  return { lens: lens.lens, priority, rationale, rubricVersion: lens.version }
}
