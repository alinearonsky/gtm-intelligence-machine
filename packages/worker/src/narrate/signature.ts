import { createHash } from 'node:crypto'

export interface OrgNarrativeSignalInput {
  signalType: string
  stage: string
  strength: number
  priority: string
  status: string
  rationale: string
  isBaselineAssessment: boolean
}

export interface OrgNarrativeInput {
  orgId: number
  lens: string
  orgName: string
  segment: string
  signals: OrgNarrativeSignalInput[]
  standards: string[]
  newFunctionCount: number
  roleCategories: string[]
  baselineOnly: boolean
}

// Signature covers exactly the fields the narrative is derived from, so it
// regenerates only when the *meaning* changes. orgName is display-only and is
// deliberately excluded. Arrays are sorted and signals canonically ordered so
// row/scan order never churns the hash.
export function computeSignature(input: OrgNarrativeInput): string {
  const signals = [...input.signals]
    .map((s) => ({
      signalType: s.signalType, stage: s.stage, strength: s.strength,
      priority: s.priority, status: s.status, rationale: s.rationale,
      isBaselineAssessment: s.isBaselineAssessment,
    }))
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))
  const canonical = {
    lens: input.lens,
    segment: input.segment,
    signals,
    standards: [...input.standards].sort(),
    newFunctionCount: input.newFunctionCount,
    roleCategories: [...input.roleCategories].sort(),
    baselineOnly: input.baselineOnly,
  }
  return createHash('sha256').update(JSON.stringify(canonical)).digest('hex')
}
