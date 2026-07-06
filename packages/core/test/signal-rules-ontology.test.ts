import { describe, it, expect } from 'vitest'
import { fileURLToPath } from 'node:url'
import { loadRules, runRulesOverContext, type OrgContext, type OrgPostingFacts } from '../src/index.ts'

const rules = loadRules(fileURLToPath(new URL('../../../ontology/signal-rules.yaml', import.meta.url)))

function fact(p: Partial<OrgPostingFacts> & { externalId: string; firstSeen: string }): OrgPostingFacts {
  return { url: `https://x/${p.externalId}`, evidenceQuote: 'q', roleCategory: 'terminologist', seniority: 'senior',
    standardsMentioned: [], functionType: 'unknown', confidence: 0.9, isBaseline: false, removedAt: null, ...p }
}
const fire = (postings: OrgPostingFacts[]) => new Set(runRulesOverContext({ orgId: 1, postings }, rules).map((s) => s.ruleId))

describe('shipped signal-rules.yaml', () => {
  it('loads with the baseline invariants satisfied', () => {
    expect(rules.rules).toHaveLength(10)
  })

  it('first-terminology-hire fires on a lone post-baseline terminology role', () => {
    expect(fire([fact({ externalId: '1', firstSeen: '2026-07-01T00:00:00Z' })])).toContain('first-terminology-hire')
  })

  it('implementation-cluster fires on two impl roles within 60 days, once', () => {
    const out = runRulesOverContext({ orgId: 1, postings: [
      fact({ externalId: 'a', roleCategory: 'terminologist', firstSeen: '2026-07-01T00:00:00Z' }),
      fact({ externalId: 'b', roleCategory: 'data-quality', firstSeen: '2026-07-25T00:00:00Z' }),
    ] }, rules).filter((s) => s.ruleId === 'implementation-cluster')
    expect(out).toHaveLength(1)
  })

  it('terminology-leadership-hire needs director+ seniority', () => {
    expect(fire([fact({ externalId: '1', roleCategory: 'informatics-leadership', seniority: 'director', firstSeen: '2026-07-01T00:00:00Z' })])).toContain('terminology-leadership-hire')
    expect(fire([fact({ externalId: '1', roleCategory: 'informatics-leadership', seniority: 'ic', firstSeen: '2026-07-01T00:00:00Z' })])).not.toContain('terminology-leadership-hire')
  })

  it('role-filled fires on a short-lived removed posting; not on a long-open one', () => {
    expect(fire([fact({ externalId: '1', firstSeen: '2026-04-01T00:00:00Z', removedAt: '2026-05-01T00:00:00Z' })])).toContain('role-filled')
    expect(fire([fact({ externalId: '1', firstSeen: '2026-01-01T00:00:00Z', removedAt: '2026-07-01T00:00:00Z' })])).not.toContain('role-filled')
  })

  it('baseline postings yield ONLY stage-assessment rules, never timed ones', () => {
    const fired = fire([
      fact({ externalId: '1', roleCategory: 'terminologist', isBaseline: true, firstSeen: '2026-07-01T00:00:00Z' }),
      fact({ externalId: '2', roleCategory: 'interoperability', isBaseline: true, firstSeen: '2026-07-01T00:00:00Z' }),
    ])
    expect(fired).toEqual(new Set(['baseline-terminology-presence', 'baseline-interoperability-presence']))
  })
})
