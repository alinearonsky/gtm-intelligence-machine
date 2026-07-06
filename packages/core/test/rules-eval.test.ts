import { describe, it, expect } from 'vitest'
import { runRulesOverContext, type OrgContext, type OrgPostingFacts, type RulesFileT } from '../src/index.ts'

function fact(p: Partial<OrgPostingFacts> & { externalId: string; firstSeen: string }): OrgPostingFacts {
  return { url: `https://x/${p.externalId}`, evidenceQuote: 'q', roleCategory: 'terminologist', seniority: 'senior',
    standardsMentioned: [], functionType: 'unknown', confidence: 0.9, isBaseline: false, removedAt: null, ...p }
}
const ctx = (postings: OrgPostingFacts[]): OrgContext => ({ orgId: 7, postings })

const RULES: RulesFileT = { version: 3, rules: [
  { id: 'first-hire', title: 'x', signal_type: 'entering-adoption', stage: 'early', strength: 4, baseline_safe: false, dedupe: 'per-posting', rationale: 'r',
    when: [ { type: 'role-is', roles: ['terminologist'] }, { type: 'not-baseline' }, { type: 'prior-role-count', role: 'terminologist', op: 'eq', value: 0 } ] },
  { id: 'cluster', title: 'x', signal_type: 'mid-implementation', stage: 'mid', strength: 5, baseline_safe: false, dedupe: 'per-org', rationale: 'r',
    when: [ { type: 'role-is', roles: ['terminologist', 'clinical-content'] }, { type: 'not-baseline' }, { type: 'cluster-within-days', roles: ['terminologist', 'clinical-content'], count: 2, days: 60 } ] },
  { id: 'filled', title: 'x', signal_type: 'implementation-staffed', stage: 'mid', strength: 3, baseline_safe: false, dedupe: 'per-posting', rationale: 'r',
    when: [ { type: 'role-is', roles: ['terminologist'] }, { type: 'not-baseline' }, { type: 'trigger-removed', maxLifetimeDays: 90 } ] },
  { id: 'std-drift', title: 'x', signal_type: 'standards-adoption', stage: 'early', strength: 2, baseline_safe: false, dedupe: 'per-posting', rationale: 'r',
    when: [ { type: 'standards-new', standards: ['FHIR'] }, { type: 'not-baseline' } ] },
  { id: 'baseline-presence', title: 'x', signal_type: 'stage-assessment', stage: 'mid', strength: 2, baseline_safe: true, dedupe: 'per-org', rationale: 'r',
    when: [ { type: 'is-baseline' }, { type: 'role-is', roles: ['terminologist'] } ] },
] }

describe('runRulesOverContext', () => {
  it('fires first-hire only when there is no prior terminology posting', () => {
    const single = runRulesOverContext(ctx([fact({ externalId: '1', firstSeen: '2026-07-01T00:00:00Z' })]), RULES)
    expect(single.map((s) => s.ruleId)).toContain('first-hire')
    const withPrior = runRulesOverContext(ctx([
      fact({ externalId: '0', firstSeen: '2026-06-01T00:00:00Z' }),
      fact({ externalId: '1', firstSeen: '2026-07-01T00:00:00Z' }),
    ]), RULES)
    expect(withPrior.filter((s) => s.ruleId === 'first-hire')).toHaveLength(0)
  })

  it('collapses a cluster into ONE per-org signal citing every trigger, keyed on the rule id', () => {
    const out = runRulesOverContext(ctx([
      fact({ externalId: 'a', roleCategory: 'terminologist', firstSeen: '2026-07-01T00:00:00Z' }),
      fact({ externalId: 'b', roleCategory: 'clinical-content', firstSeen: '2026-07-20T00:00:00Z' }),
    ]), RULES)
    const cluster = out.filter((s) => s.ruleId === 'cluster')
    expect(cluster).toHaveLength(1)
    expect(cluster[0]!.evidence.map((e) => e.externalId).sort()).toEqual(['a', 'b'])
    // per-org evidenceKey is membership-independent (the rule id) so a growing
    // cluster updates one signal rather than minting a duplicate each scan.
    expect(cluster[0]!.evidenceKey).toBe('cluster')
  })

  it('per-org signal keeps a STABLE evidenceKey as cluster membership grows', () => {
    const two = runRulesOverContext(ctx([
      fact({ externalId: 'a', roleCategory: 'terminologist', firstSeen: '2026-07-01T00:00:00Z' }),
      fact({ externalId: 'b', roleCategory: 'clinical-content', firstSeen: '2026-07-20T00:00:00Z' }),
    ]), RULES).find((s) => s.ruleId === 'cluster')!
    const three = runRulesOverContext(ctx([
      fact({ externalId: 'a', roleCategory: 'terminologist', firstSeen: '2026-07-01T00:00:00Z' }),
      fact({ externalId: 'b', roleCategory: 'clinical-content', firstSeen: '2026-07-20T00:00:00Z' }),
      fact({ externalId: 'c', roleCategory: 'clinical-content', firstSeen: '2026-07-25T00:00:00Z' }),
    ]), RULES).find((s) => s.ruleId === 'cluster')!
    expect(three.evidenceKey).toBe(two.evidenceKey)   // same key → upsert updates the same row, not a new one
    expect(three.evidence).toHaveLength(3)            // evidence grows to include the new member
  })

  it('fires role-filled on a removed short-lived posting', () => {
    const out = runRulesOverContext(ctx([
      fact({ externalId: '1', firstSeen: '2026-04-01T00:00:00Z', removedAt: '2026-05-15T00:00:00Z' }),
    ]), RULES)
    expect(out.map((s) => s.ruleId)).toContain('filled')
  })

  it('fires standards-drift only when the standard is new to the org', () => {
    const drift = runRulesOverContext(ctx([
      fact({ externalId: '1', standardsMentioned: [], firstSeen: '2026-06-01T00:00:00Z' }),
      fact({ externalId: '2', standardsMentioned: ['FHIR'], firstSeen: '2026-07-01T00:00:00Z' }),
    ]), RULES).filter((s) => s.ruleId === 'std-drift')
    expect(drift).toHaveLength(1)
    expect(drift[0]!.evidence[0]!.externalId).toBe('2')

    const noDrift = runRulesOverContext(ctx([
      fact({ externalId: '1', standardsMentioned: ['FHIR'], firstSeen: '2026-06-01T00:00:00Z' }),
      fact({ externalId: '2', standardsMentioned: ['FHIR'], firstSeen: '2026-07-01T00:00:00Z' }),
    ]), RULES).filter((s) => s.ruleId === 'std-drift' && s.evidence[0]!.externalId === '2')
    expect(noDrift).toHaveLength(0)
  })

  it('marks baseline signals as assessments and reduces their confidence', () => {
    const out = runRulesOverContext(ctx([
      fact({ externalId: '1', isBaseline: true, confidence: 1, firstSeen: '2026-07-01T00:00:00Z' }),
    ]), RULES)
    const b = out.find((s) => s.ruleId === 'baseline-presence')!
    expect(b.isBaselineAssessment).toBe(true)
    expect(b.confidence).toBeLessThan(1)
    expect(out.some((s) => s.ruleId === 'first-hire')).toBe(false)
  })
})
