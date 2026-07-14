import { describe, it, expect } from 'vitest'
import { anthropicNarrator, NARRATIVE_MODEL } from '../src/narrate/narrator.ts'
import type { OrgNarrativeInput } from '../src/narrate/signature.ts'

const input: OrgNarrativeInput = {
  orgId: 1, lens: 'tt', orgName: 'Acme', segment: 'payer',
  signals: [{ signalType: 'standards-adoption', stage: 'mid', strength: 4, priority: 'act-now', status: 'new', rationale: 'r', isBaselineAssessment: false }],
  standards: ['FHIR'], newFunctionCount: 1, roleCategories: ['data-quality'], baselineOnly: false,
}

function fakeClient(text: string) {
  return { messages: { create: async () => ({ content: [{ type: 'tool_use', name: 'record_narrative', input: { narrative: text } }] }) } } as never
}

describe('anthropicNarrator', () => {
  it('returns the tool_use narrative text', async () => {
    const n = anthropicNarrator(fakeClient('Acme is adopting FHIR.'))
    expect(await n.narrate(input)).toBe('Acme is adopting FHIR.')
  })
  it('throws when the guardrail rejects invented specifics', async () => {
    const n = anthropicNarrator(fakeClient('Acme is adopting SNOMED.'))
    await expect(n.narrate(input)).rejects.toThrow(/SNOMED/)
  })
  it('pins the Haiku model constant', () => {
    expect(NARRATIVE_MODEL).toBe('claude-haiku-4-5')
  })
})
