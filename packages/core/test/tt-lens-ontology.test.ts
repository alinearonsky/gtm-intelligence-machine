import { describe, it, expect } from 'vitest'
import { fileURLToPath } from 'node:url'
import { loadLens, scoreSignal, type ScoreInput } from '../src/index.ts'

const tt = loadLens(fileURLToPath(new URL('../../../ontology/lenses/tt.yaml', import.meta.url)))
const base: ScoreInput = { signalType: 'entering-adoption', stage: 'early', strength: 4,
  isBaselineAssessment: false, segment: 'digital-health-startup', orgName: 'Fixture Health' }

describe('shipped tt.yaml', () => {
  it('act-now for a strong entering-adoption signal at a startup', () => {
    expect(scoreSignal(base, tt).priority).toBe('act-now')
  })
  it('mid-implementation at strength 5 is act-now', () => {
    expect(scoreSignal({ ...base, signalType: 'mid-implementation', strength: 5 }, tt).priority).toBe('act-now')
  })
  it('a payer segment is watch, not act-now, for strong adoption signals', () => {
    // payer isn't in the act-now segment list; the v2 fallback routes strong
    // out-of-segment adoption to watch (rubric decision 2026-07-09)
    expect(scoreSignal({ ...base, segment: 'payer' }, tt).priority).toBe('watch')
    expect(scoreSignal({ ...base, segment: 'other', signalType: 'mid-implementation', strength: 1 }, tt).priority).toBe('watch')
  })
  it('in-segment strong adoption still routes act-now ahead of the fallback', () => {
    expect(scoreSignal({ ...base, segment: 'ehr-vendor' }, tt).priority).toBe('act-now')
  })
  it('in-segment adoption below act-now strength lands on the watch fallback (v2 change)', () => {
    // v1 scored this ignore; v2 deliberately routes weak in-segment adoption to watch
    expect(scoreSignal({ ...base, strength: 2 }, tt).priority).toBe('watch')
  })
  it('every shipped signal_type resolves to a non-throwing score', () => {
    for (const st of ['entering-adoption', 'integration-starting', 'mid-implementation', 'strategic-commitment',
      'standards-adoption', 'implementation-staffed', 'measures-program-forming', 'governance-investment', 'stage-assessment']) {
      expect(() => scoreSignal({ ...base, signalType: st, strength: 3 }, tt)).not.toThrow()
    }
  })
  it('a baseline stage-assessment is watch, never act-now', () => {
    expect(scoreSignal({ ...base, signalType: 'stage-assessment', isBaselineAssessment: true }, tt).priority).toBe('watch')
  })
})
