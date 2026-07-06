import { runRulesOverContext, scoreSignal, type RulesFileT, type LensFileT } from '@gtm/core'
import type { Store } from '../store/types.ts'

export interface InterpretDeps {
  store: Store
  rules: RulesFileT
  lenses?: LensFileT[]        // optional — omit to (re)generate signals only
  log?: (msg: string) => void
}

export interface InterpretSummary {
  orgsProcessed: number
  signalsWritten: number
  lensScoresWritten: number
}

export async function runInterpret(deps: InterpretDeps): Promise<InterpretSummary> {
  const summary: InterpretSummary = { orgsProcessed: 0, signalsWritten: 0, lensScoresWritten: 0 }
  for (const orgId of await deps.store.listOrgIds()) {
    const org = await deps.store.getOrg(orgId)
    if (!org) continue
    summary.orgsProcessed++
    const postings = await deps.store.getOrgExtractionFacts(orgId)
    if (postings.length === 0) continue
    const drafts = runRulesOverContext({ orgId, postings }, deps.rules)
    for (const d of drafts) {
      const signalId = await deps.store.upsertSignal({ ...d, rulesVersion: deps.rules.version })
      summary.signalsWritten++
      for (const lens of deps.lenses ?? []) {
        const score = scoreSignal({
          signalType: d.signalType, stage: d.stage, strength: d.strength,
          isBaselineAssessment: d.isBaselineAssessment, segment: org.segment, orgName: org.name,
        }, lens)
        await deps.store.upsertLensScore({ signalId, ...score })
        summary.lensScoresWritten++
      }
    }
  }
  deps.log?.(`interpret: ${summary.signalsWritten} signals, ${summary.lensScoresWritten} lens scores across ${summary.orgsProcessed} orgs`)
  return summary
}
