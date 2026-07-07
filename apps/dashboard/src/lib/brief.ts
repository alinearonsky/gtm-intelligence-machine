import type { FeedSignal } from '../db/types.ts'

/** Markdown brief pasted into a terminology-tool-prospecting run as timing
 *  context. Manual handoff — no cross-repo integration. */
export function buildOutreachBrief(s: FeedSignal): string {
  const evidence = s.evidence
    .map((e) => `> ${e.quote}\n> — ${e.url}`)
    .join('\n\n')
  return [
    `# ${s.orgName} — ${s.signalType}`,
    ``,
    `- Segment: ${s.segment}`,
    `- Stage: ${s.stage} · Strength: ${s.strength} · Priority: ${s.priority}`,
    ``,
    `## Why now`,
    s.rationale,
    ``,
    `## Evidence`,
    evidence,
  ].join('\n')
}
