import { describe, it, expect } from 'vitest'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { loadLens, scoreSignal } from '../src/index.ts'

const LENS = `
version: 2
lens: tt
label: Terminology Tool
default_priority: ignore
rules:
  - signal_types: [entering-adoption, mid-implementation]
    segments: [digital-health-startup, ehr-vendor]
    min_strength: 3
    priority: act-now
    rationale: "{org}: {signalType} (strength {strength}) — prime Terminology Tool window."
  - signal_types: [stage-assessment]
    priority: watch
    rationale: "{org}: baseline {stage}-stage assessment."
`
function lens() {
  const dir = mkdtempSync(join(tmpdir(), 'lens-'))
  const f = join(dir, 'tt.yaml'); writeFileSync(f, LENS); return loadLens(f)
}
const input = (o: Partial<Parameters<typeof scoreSignal>[0]>) =>
  ({ signalType: 'entering-adoption', stage: 'early', strength: 4, isBaselineAssessment: false,
     segment: 'digital-health-startup', orgName: 'Fixture Health', ...o })

describe('scoreSignal', () => {
  it('act-now for a strong entering-adoption signal in a matching segment', () => {
    const r = scoreSignal(input({}), lens())
    expect(r.priority).toBe('act-now')
    expect(r.rationale).toContain('Fixture Health')
    expect(r.rationale).toContain('strength 4')
    expect(r.rubricVersion).toBe(2)
  })

  it('falls through to default when segment does not match', () => {
    expect(scoreSignal(input({ segment: 'payer' }), lens()).priority).toBe('ignore')
  })

  it('respects min_strength', () => {
    expect(scoreSignal(input({ strength: 2 }), lens()).priority).toBe('ignore')
  })

  it('NEVER emits act-now for a baseline assessment (capped to watch)', () => {
    const r = scoreSignal(input({ isBaselineAssessment: true }), lens())
    expect(r.priority).toBe('watch')
  })

  it('matches a rule with no segments filter against any segment', () => {
    const r = scoreSignal(input({ signalType: 'stage-assessment', segment: 'payer', isBaselineAssessment: true }), lens())
    expect(r.priority).toBe('watch')
    expect(r.rationale).toContain('baseline')
  })
})
