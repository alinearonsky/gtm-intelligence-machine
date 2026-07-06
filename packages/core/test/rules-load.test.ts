import { describe, it, expect } from 'vitest'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { loadRules } from '../src/index.ts'

function writeYaml(body: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'rules-'))
  const file = join(dir, 'signal-rules.yaml')
  writeFileSync(file, body)
  return file
}

const VALID = `
version: 1
rules:
  - id: first-terminology-hire
    title: First terminology hire
    signal_type: entering-adoption
    stage: early
    strength: 4
    baseline_safe: false
    rationale: No prior terminology postings, now opening one.
    when:
      - { type: role-is, roles: [terminologist] }
      - { type: not-baseline }
      - { type: prior-role-count, role: terminologist, op: eq, value: 0 }
`

describe('loadRules', () => {
  it('parses a valid ontology', () => {
    const f = loadRules(writeYaml(VALID))
    expect(f.version).toBe(1)
    expect(f.rules[0]!.id).toBe('first-terminology-hire')
    expect(f.rules[0]!.dedupe).toBe('per-posting')
  })

  it('rejects duplicate rule ids', () => {
    // Append a SECOND rule item (same id) under the existing `rules:` array —
    // valid YAML, so it reaches the dup-id check rather than a YAML map-key error.
    const dup = VALID + `  - id: first-terminology-hire
    title: Duplicate id
    signal_type: entering-adoption
    stage: early
    strength: 3
    baseline_safe: false
    rationale: Second rule reusing the same id.
    when:
      - { type: role-is, roles: [interoperability] }
      - { type: not-baseline }
`
    expect(() => loadRules(writeYaml(dup))).toThrow(/duplicate rule id/i)
  })

  it('rejects a time-based rule missing a not-baseline guard', () => {
    const bad = VALID.replace('      - { type: not-baseline }\n', '')
    expect(() => loadRules(writeYaml(bad))).toThrow(/baseline_safe: false.*not-baseline/is)
  })

  it('rejects a baseline_safe rule without an is-baseline condition', () => {
    const bad = `
version: 1
rules:
  - id: bad-baseline
    title: Bad
    signal_type: stage-assessment
    stage: mid
    strength: 2
    baseline_safe: true
    rationale: x
    when:
      - { type: role-is, roles: [terminologist] }
`
    expect(() => loadRules(writeYaml(bad))).toThrow(/baseline_safe: true.*is-baseline/is)
  })

  it('reports a readable error (with path) on a schema violation', () => {
    const bad = VALID.replace('strength: 4', 'strength: 9')
    expect(() => loadRules(writeYaml(bad))).toThrow(/signal-rules\.yaml/)
  })
})
