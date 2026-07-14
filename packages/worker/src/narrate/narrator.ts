import Anthropic from '@anthropic-ai/sdk'
import type { OrgNarrativeInput } from './signature.ts'
import { assertFactsOnly } from './guardrail.ts'

export const NARRATIVE_MODEL = 'claude-haiku-4-5'
export const NARRATIVE_PROMPT_VERSION = 'narr-v1'

const SCHEMA: Anthropic.Messages.Tool.InputSchema = {
  type: 'object',
  additionalProperties: false,
  properties: { narrative: { type: 'string' } },
  required: ['narrative'],
}

const SYSTEM = `You write a 2–3 sentence plain-English summary of why an automated system flagged a healthtech organization for a sales team.

You are a SUMMARIZER, not an analyst. Hard rules:
- Use ONLY the facts in the JSON input: the named terminology standards, the role categories, the new-function role count, and the already-computed signals (with their stage, strength, priority, and rationale). Do not name any standard, product, or fact not present in the input.
- Do NOT invent or upgrade a priority, stage, or buying intent. Restate the priority the input already carries; never assert "act now" unless a signal's priority is literally "act-now".
- If the input says this is a baseline snapshot (baselineOnly=true), describe it as an early-stage snapshot. Never imply urgency or "act now".
- No preamble, no bullet points. Two or three sentences of prose.`

export interface Narrator {
  /** Generate the org's narrative. Throws if the guardrail rejects the output. */
  narrate(input: OrgNarrativeInput): Promise<string>
}

export function anthropicNarrator(client: Anthropic = new Anthropic()): Narrator {
  return {
    async narrate(input: OrgNarrativeInput): Promise<string> {
      const res = await client.messages.create({
        model: NARRATIVE_MODEL,
        max_tokens: 512,
        system: SYSTEM,
        messages: [{ role: 'user', content: JSON.stringify({
          orgName: input.orgName, segment: input.segment, lens: input.lens,
          baselineOnly: input.baselineOnly, standards: input.standards,
          newFunctionCount: input.newFunctionCount, roleCategories: input.roleCategories,
          signals: input.signals,
        }) }],
        tools: [{ name: 'record_narrative', description: 'Record the org narrative.', input_schema: SCHEMA, strict: true }],
        tool_choice: { type: 'tool', name: 'record_narrative' },
      })
      const block = res.content.find((b) => b.type === 'tool_use')
      if (!block || block.type !== 'tool_use') throw new Error('narrator returned no tool_use output')
      const narrative = (block.input as { narrative: string }).narrative
      assertFactsOnly(narrative, input)
      return narrative
    },
  }
}
