import { describe, it, expect } from 'vitest'
import { fileURLToPath } from 'node:url'
import type { WatchlistOrgT, RawPostingT, ExtractionT } from '@gtm/core'
import { diffPostings, loadRules, loadLens } from '@gtm/core'
import { MemoryStore } from '../src/store/memory.ts'
import { runExtraction } from '../src/extract/run.ts'
import { runInterpret } from '../src/interpret/run.ts'
import type { Extractor } from '../src/extract/extractor.ts'

const rules = loadRules(fileURLToPath(new URL('../../../ontology/signal-rules.yaml', import.meta.url)))
const tt = loadLens(fileURLToPath(new URL('../../../ontology/lenses/tt.yaml', import.meta.url)))

const ORG: WatchlistOrgT = { name: 'Fixture Health', domain: 'fixturehealth.example',
  segment: 'digital-health-startup', products: ['tt'], slug: 'fixturehealth', ats: 'greenhouse' }

// Fake extractor: classify by title keyword — no network, deterministic.
const fakeExtractor: Extractor = {
  async extract(p: RawPostingT): Promise<ExtractionT> {
    const t = p.title.toLowerCase()
    const roleCategory = t.includes('terminolog') ? 'terminologist'
      : t.includes('data steward') || t.includes('data quality') ? 'data-quality'
      : 'none'
    return { roleCategory, seniority: 'senior', standardsMentioned: t.includes('snomed') ? ['SNOMED'] : [],
      clinicalDomain: null, teamContext: null, functionType: 'new-function', confidence: 0.9 }
  },
}
const post = (id: string, title: string): RawPostingT =>
  ({ externalId: id, title, url: `https://x.example/${id}`, location: null, department: null, description: 'SNOMED value sets', publishedAt: null })

describe('scan → extract → interpret pipeline', () => {
  it('carries two clustered impl roles all the way to an act-now TT signal with full evidence', async () => {
    const s = new MemoryStore()
    const orgId = await s.upsertOrg(ORG)

    // Scan #1 (baseline) — one unrelated posting so the org leaves baseline WITHOUT impl history.
    await s.applyDiff(orgId, diffPostings([], [post('0', 'Office Manager')]),
      { baseline: true, now: '2026-06-01T00:00:00.000Z', prefilter: () => ({ pass: false, matches: [] }) })

    // Scan #2 (post-baseline) — two impl roles within 60 days.
    const existing = await s.listActivePostings(orgId)
    await s.applyDiff(orgId, diffPostings(existing, [
      post('0', 'Office Manager'),
      post('1', 'Clinical Terminologist'),
      post('2', 'Clinical Data Steward'),
    ]), { baseline: false, now: '2026-07-01T00:00:00.000Z', prefilter: (p) => ({ pass: /terminolog|data steward/i.test(p.title), matches: ['x'] }) })

    const ext = await runExtraction({ store: s, extractor: fakeExtractor, promptVersion: 'ext-v1',
      model: 'fake', concurrency: 2, now: () => '2026-07-01T00:00:00.000Z' })
    expect(ext.postingsExtracted).toBe(2)

    const interp = await runInterpret({ store: s, rules, lenses: [tt] })
    expect(interp.signalsWritten).toBeGreaterThan(0)

    const signals = await s.listSignals(orgId)
    const cluster = signals.find((x) => x.ruleId === 'implementation-cluster')
    expect(cluster, 'implementation-cluster should fire').toBeTruthy()
    expect(cluster!.evidence.map((e) => e.externalId).sort()).toEqual(['1', '2'])
    expect(cluster!.isBaselineAssessment).toBe(false)

    const scores = s.dumpLensScores().filter((x) => x.signalId === cluster!.id)
    expect(scores[0]!.priority).toBe('act-now')
    expect(scores[0]!.rationale).toContain('Fixture Health')
  })
})
