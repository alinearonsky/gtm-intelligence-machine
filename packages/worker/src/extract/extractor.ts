import Anthropic from '@anthropic-ai/sdk'
import { Extraction, type ExtractionT, type RawPostingT } from '@gtm/core'

export const EXTRACTION_PROMPT_VERSION = 'ext-v1'
export const EXTRACTION_MODEL = 'claude-haiku-4-5'

// JSON-Schema mirror of @gtm/core's Extraction, used as the forced tool's
// input_schema. Strict-tool rules: additionalProperties:false, every field
// required, no numeric min/max. Authoritative validator is Extraction.parse().
const EXTRACTION_SCHEMA: Anthropic.Messages.Tool.InputSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    roleCategory: { type: 'string', enum: ['terminologist', 'interoperability', 'informatics-leadership', 'clinical-content', 'data-quality', 'quality-measures', 'none'] },
    seniority: { type: 'string', enum: ['ic', 'senior', 'lead', 'manager', 'director', 'exec', 'unknown'] },
    standardsMentioned: { type: 'array', items: { type: 'string', enum: ['SNOMED', 'LOINC', 'FHIR', 'ICD-10', 'ICD-11', 'RxNorm', 'CPT', 'HL7v2', 'CDA', 'eCQM', 'HEDIS', 'OMOP', 'NCPDP', 'UCUM', 'other'] } },
    clinicalDomain: { type: ['string', 'null'] },
    teamContext: { type: ['string', 'null'] },
    functionType: { type: 'string', enum: ['new-function', 'backfill', 'unknown'] },
    confidence: { type: 'number' },
  },
  required: ['roleCategory', 'seniority', 'standardsMentioned', 'clinicalDomain', 'teamContext', 'functionType', 'confidence'],
}

const SYSTEM = `You extract structured facts from healthtech job postings. You are a PARSER, not an analyst.

Rules:
- Report ONLY what the posting text states or plainly implies about the ROLE. Do not infer the company's buying intent, strategy, or maturity — that is decided elsewhere.
- roleCategory: pick the single best-fit category, or "none" if the posting is not about clinical terminology, interoperability, clinical informatics leadership, clinical content/knowledge, clinical data quality/governance, or quality measures. The posting reached you through an over-inclusive keyword screen, so "none" is common and correct for unrelated roles.
- seniority: infer from title/scope (ic, senior, lead, manager, director, exec) or "unknown".
- standardsMentioned: only standards explicitly named in the text (SNOMED, LOINC, FHIR, ICD-10, ICD-11, RxNorm, CPT, HL7v2, CDA, eCQM, HEDIS, OMOP, NCPDP, UCUM). Use "other" for a named standard not in this list. Empty array if none are named.
- clinicalDomain: a clinical specialty named in the posting (e.g. "oncology"), else null.
- teamContext: one short phrase quoting/paraphrasing any team or mission context, else null.
- functionType: "new-function" if the text signals a newly created role/team/capability; "backfill" if replacing/expanding an existing one; else "unknown".
- confidence: your confidence in roleCategory, 0..1.`

function renderPosting(p: RawPostingT): string {
  return [
    `TITLE: ${p.title}`,
    p.department ? `DEPARTMENT: ${p.department}` : null,
    p.location ? `LOCATION: ${p.location}` : null,
    '',
    'DESCRIPTION:',
    p.description || '(no description provided)',
  ].filter((l) => l !== null).join('\n')
}

export interface Extractor {
  /** Extract structured facts for one posting. Throws on API error or invalid output. */
  extract(posting: RawPostingT): Promise<ExtractionT>
}

export function anthropicExtractor(client: Anthropic = new Anthropic()): Extractor {
  return {
    async extract(posting: RawPostingT): Promise<ExtractionT> {
      const res = await client.messages.create({
        model: EXTRACTION_MODEL,
        max_tokens: 1024,
        system: SYSTEM,
        messages: [{ role: 'user', content: renderPosting(posting) }],
        tools: [{
          name: 'record_extraction',
          description: 'Record the structured facts extracted from the posting.',
          input_schema: EXTRACTION_SCHEMA,
          strict: true,
        }],
        tool_choice: { type: 'tool', name: 'record_extraction' },
      })
      const block = res.content.find((b) => b.type === 'tool_use')
      if (!block || block.type !== 'tool_use') throw new Error('extraction returned no tool_use output')
      return Extraction.parse(block.input)
    },
  }
}
