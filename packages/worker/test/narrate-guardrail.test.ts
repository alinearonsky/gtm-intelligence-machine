import { describe, it, expect } from 'vitest'
import { assertFactsOnly } from '../src/narrate/guardrail.ts'
import type { OrgNarrativeInput } from '../src/narrate/signature.ts'

const input: OrgNarrativeInput = {
  orgId: 1, lens: 'tt', orgName: 'Acme', segment: 'payer',
  signals: [{ signalType: 'standards-adoption', stage: 'mid', strength: 4, priority: 'act-now', status: 'new', rationale: 'r', isBaselineAssessment: false }],
  standards: ['FHIR'], newFunctionCount: 1, roleCategories: ['data-quality'], baselineOnly: false,
}

describe('assertFactsOnly', () => {
  it('passes when only allowed standards are named', () => {
    expect(() => assertFactsOnly('Acme is adopting FHIR in a new data-quality role.', input)).not.toThrow()
  })
  it('throws on a standard not in the input', () => {
    expect(() => assertFactsOnly('Acme is adopting SNOMED and LOINC.', input)).toThrow(/SNOMED/)
  })
  it('throws on act-now framing for a baseline-only org', () => {
    const baseline = { ...input, baselineOnly: true }
    expect(() => assertFactsOnly('This is a company to act now on.', baseline)).toThrow(/act.now/i)
  })
})
