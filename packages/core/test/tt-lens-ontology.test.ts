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
  it('a payer segment is not act-now for the TT lens', () => {
    // payer isn't in the act-now segment list, and entering-adoption has no other rule → default ignore
    expect(scoreSignal({ ...base, segment: 'payer' }, tt).priority).toBe('ignore')
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
