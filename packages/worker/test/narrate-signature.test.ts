import { describe, it, expect } from 'vitest'
import { computeSignature, type OrgNarrativeInput } from '../src/narrate/signature.ts'

const base: OrgNarrativeInput = {
  orgId: 1, lens: 'tt', orgName: 'Acme', segment: 'payer',
  signals: [
    { signalType: 'standards-adoption', stage: 'mid', strength: 4, priority: 'act-now', status: 'new', rationale: 'r', isBaselineAssessment: false },
  ],
  standards: ['FHIR', 'SNOMED'], newFunctionCount: 2, roleCategories: ['data-quality'], baselineOnly: false,
}

describe('computeSignature', () => {
  it('is stable regardless of array order', () => {
    const a = computeSignature(base)
    const b = computeSignature({ ...base, standards: ['SNOMED', 'FHIR'] })
    expect(a).toBe(b)
  })
  it('changes when a signal priority changes', () => {
    const a = computeSignature(base)
    const b = computeSignature({ ...base, signals: [{ ...base.signals[0]!, priority: 'watch' }] })
    expect(a).not.toBe(b)
  })
  it('ignores orgName (display-only, not a driver)', () => {
    expect(computeSignature(base)).toBe(computeSignature({ ...base, orgName: 'Renamed' }))
  })
})
