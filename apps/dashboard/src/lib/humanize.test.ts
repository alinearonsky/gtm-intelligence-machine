import { describe, it, expect } from 'vitest'
import { signalTypeLabel, stageLabel, segmentLabel, priorityLabel } from './humanize.ts'

describe('humanize', () => {
  it('maps known machine slugs to plain English', () => {
    expect(signalTypeLabel('governance-investment')).toBe('Governance investment')
    expect(stageLabel('mid')).toBe('Building')
    expect(segmentLabel('ehr-vendor')).toBe('EHR vendor')
    expect(priorityLabel('act-now')).toBe('Act now')
  })

  it('falls back to a title-cased slug for unknown values', () => {
    expect(signalTypeLabel('some-new-signal')).toBe('Some New Signal')
    expect(segmentLabel('brand-new-segment')).toBe('Brand New Segment')
  })
})
