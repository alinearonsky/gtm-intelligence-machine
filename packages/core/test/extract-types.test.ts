import { describe, it, expect } from 'vitest'
import { Extraction, RoleCategory, Standard } from '../src/index.ts'

describe('Extraction schema', () => {
  it('accepts a valid extraction', () => {
    const e = Extraction.parse({
      roleCategory: 'terminologist',
      seniority: 'senior',
      standardsMentioned: ['SNOMED', 'LOINC'],
      clinicalDomain: 'oncology',
      teamContext: 'joining a new clinical data platform team',
      functionType: 'new-function',
      confidence: 0.9,
    })
    expect(e.roleCategory).toBe('terminologist')
    expect(e.standardsMentioned).toEqual(['SNOMED', 'LOINC'])
  })

  it('accepts nulls for optional free-text and an empty standards list', () => {
    const e = Extraction.parse({
      roleCategory: 'none', seniority: 'unknown', standardsMentioned: [],
      clinicalDomain: null, teamContext: null, functionType: 'unknown', confidence: 0.2,
    })
    expect(e.clinicalDomain).toBeNull()
  })

  it('rejects an unknown role category, a bad standard, and out-of-range confidence', () => {
    const base = { roleCategory: 'terminologist', seniority: 'ic', standardsMentioned: [],
      clinicalDomain: null, teamContext: null, functionType: 'backfill', confidence: 0.5 }
    expect(() => Extraction.parse({ ...base, roleCategory: 'chef' })).toThrow()
    expect(() => Extraction.parse({ ...base, standardsMentioned: ['NONSENSE'] })).toThrow()
    expect(() => Extraction.parse({ ...base, confidence: 1.4 })).toThrow()
  })

  it('exposes the role-category and standard enums for reuse', () => {
    expect(RoleCategory.options).toContain('quality-measures')
    expect(Standard.options).toContain('FHIR')
  })
})
