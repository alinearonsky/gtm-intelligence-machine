import { describe, it, expect } from 'vitest'
import { standardsFootprint, newFunctionCount, topPriority, lastSignalDate, rollupOneLiner } from './org-rollup.ts'
import type { OrgProfile } from '../db/types.ts'

const posting = (over: Partial<OrgProfile['postings'][number]>): OrgProfile['postings'][number] => ({
  externalId: 'p', title: 't', url: 'u', location: null, department: null, isBaseline: false,
  firstSeen: '2026-07-01T00:00:00Z', removedAt: null, seniority: null, clinicalDomain: null,
  teamContext: null, standards: [], functionType: null, confidence: null, ...over,
})
const signal = (over: Partial<OrgProfile['signals'][number]>): OrgProfile['signals'][number] => ({
  id: 1, orgId: 1, orgSlug: 'a', orgName: 'A', domain: 'a.com', segment: 'payer',
  signalType: 'standards-adoption', stage: 'mid', strength: 4, confidence: 0.9,
  isBaselineAssessment: false, status: 'new', createdAt: '2026-07-10T00:00:00Z',
  priority: 'watch', rationale: 'r', evidence: [], ...over,
})
const org = (over: Partial<OrgProfile>): OrgProfile => ({
  id: 1, slug: 'a', name: 'Acme', domain: 'a.com', segment: 'payer', products: ['tt'], status: 'active',
  narrative: null, signals: [], postings: [], ...over,
})

describe('org-rollup', () => {
  it('collects a sorted, de-duped standards footprint', () => {
    const p = org({ postings: [posting({ standards: ['SNOMED', 'FHIR'] }), posting({ standards: ['FHIR', 'LOINC'] })] })
    expect(standardsFootprint(p)).toEqual(['FHIR', 'LOINC', 'SNOMED'])
  })
  it('counts new-function postings', () => {
    const p = org({ postings: [posting({ functionType: 'new-function' }), posting({ functionType: 'backfill' })] })
    expect(newFunctionCount(p)).toBe(1)
  })
  it('picks the highest priority present', () => {
    const p = org({ signals: [signal({ priority: 'watch' }), signal({ priority: 'act-now' })] })
    expect(topPriority(p)).toBe('act-now')
  })
  it('returns null priority with no signals', () => {
    expect(topPriority(org({}))).toBeNull()
  })
  it('finds the most recent signal date', () => {
    const p = org({ signals: [signal({ createdAt: '2026-07-01T00:00:00Z' }), signal({ createdAt: '2026-07-12T00:00:00Z' })] })
    expect(lastSignalDate(p)).toBe('2026-07-12T00:00:00Z')
  })
  it('builds a one-liner from facts', () => {
    const p = org({ postings: [posting({ functionType: 'new-function', standards: ['FHIR', 'SNOMED'] })], signals: [signal({ priority: 'act-now' })] })
    expect(rollupOneLiner(p)).toBe('1 new-function role naming FHIR + SNOMED; priority: act-now.')
  })
  it('falls back cleanly with no signals or standards', () => {
    expect(rollupOneLiner(org({}))).toBe('Baseline snapshot — no active signals yet.')
  })
})
