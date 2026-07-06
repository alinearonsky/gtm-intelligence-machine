import { describe, it, expect } from 'vitest'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadRoleHints, prefilter } from '../src/index.ts'
import type { RawPostingT } from '../src/index.ts'

const hints = loadRoleHints(fileURLToPath(new URL('../../../ontology/roles.yaml', import.meta.url)))

function posting(title: string, description = ''): RawPostingT {
  return { externalId: '1', title, url: 'https://x.example/1', location: null, department: null, description, publishedAt: null }
}

describe('prefilter', () => {
  it('passes a SNOMED title and reports the matched role', () => {
    const r = prefilter(posting('SNOMED CT Terminologist'), hints)
    expect(r.pass).toBe(true)
    expect(r.matches).toContain('terminologist')
  })

  it('matches in the description too, case-insensitively', () => {
    const r = prefilter(posting('Data Engineer', 'Experience with FHIR APIs required'), hints)
    expect(r.pass).toBe(true)
    expect(r.matches).toContain('interoperability')
  })

  it('rejects an unrelated posting', () => {
    const r = prefilter(posting('Staff Nurse, ICU', 'Provide bedside care'), hints)
    expect(r).toEqual({ pass: false, matches: [] })
  })

  it('collects multiple matched roles without duplicates', () => {
    const r = prefilter(posting('Clinical Terminologist', 'SNOMED and FHIR and LOINC'), hints)
    expect(r.matches).toEqual(expect.arrayContaining(['terminologist', 'interoperability']))
    expect(new Set(r.matches).size).toBe(r.matches.length)
  })

  it('matches whole-word hints at title boundaries and punctuation', () => {
    expect(prefilter(posting('CDS Analyst'), hints).matches).toContain('clinical-content')
    expect(prefilter(posting('Analyst (CDS)'), hints).matches).toContain('clinical-content')
    expect(prefilter(posting('Clinical Integration CDA'), hints).matches).toContain('interoperability')
  })

  it('whole-word hints do not match inside longer words', () => {
    expect(prefilter(posting('Cdax Platform Engineer'), hints).pass).toBe(false)
  })

  it('matches ICD without hyphen', () => {
    expect(prefilter(posting('ICD10 Coding Specialist'), hints).matches).toContain('terminologist')
  })
})

describe('loadRoleHints', () => {
  it('rejects duplicate role ids', () => {
    const dir = mkdtempSync(join(tmpdir(), 'roles-'))
    const file = join(dir, 'dup.yaml')
    writeFileSync(
      file,
      `version: 1
roles:
  - id: terminologist
    label: One
    hints: [snomed]
  - id: terminologist
    label: Two
    hints: [loinc]
`,
    )
    expect(() => loadRoleHints(file)).toThrow(/duplicate role id/i)
  })
})
