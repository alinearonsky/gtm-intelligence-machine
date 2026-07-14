import type { Store } from '../store/types.ts'
import type { Narrator } from './narrator.ts'
import { NARRATIVE_MODEL, NARRATIVE_PROMPT_VERSION } from './narrator.ts'
import { computeSignature } from './signature.ts'

export interface NarrateDeps {
  store: Store
  narrator: Narrator
  lenses: string[]
  log?: (m: string) => void
}

export interface NarrateSummary {
  orgsProcessed: number
  generated: number
  skipped: number
  failed: number
}

export async function runNarrate(deps: NarrateDeps): Promise<NarrateSummary> {
  const summary: NarrateSummary = { orgsProcessed: 0, generated: 0, skipped: 0, failed: 0 }
  for (const orgId of await deps.store.listOrgIds()) {
    const org = await deps.store.getOrg(orgId)
    if (!org || org.status !== 'active') continue
    summary.orgsProcessed++
    for (const lens of deps.lenses) {
      const input = await deps.store.getOrgNarrativeInput(orgId, lens)
      if (!input) { summary.skipped++; continue }
      const signature = computeSignature(input)
      if (await deps.store.getStoredNarrativeSignature(orgId, lens) === signature) { summary.skipped++; continue }
      try {
        const narrative = await deps.narrator.narrate(input)
        await deps.store.upsertOrgNarrative({
          orgId, lens, narrative, model: NARRATIVE_MODEL,
          promptVersion: NARRATIVE_PROMPT_VERSION, sourceSignature: signature,
        })
        summary.generated++
      } catch (err) {
        summary.failed++
        deps.log?.(`narrate: org ${orgId} lens ${lens} failed — ${(err as Error).message}`)
      }
    }
  }
  deps.log?.(`narrate: ${summary.generated} generated, ${summary.skipped} skipped, ${summary.failed} failed across ${summary.orgsProcessed} orgs`)
  return summary
}
