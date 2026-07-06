import { z } from 'zod'

// Role categories align 1:1 with ontology/roles.yaml ids, plus 'none' for
// postings the extractor judges irrelevant (the prefilter is over-inclusive).
export const RoleCategory = z.enum([
  'terminologist', 'interoperability', 'informatics-leadership',
  'clinical-content', 'data-quality', 'quality-measures', 'none',
])
export type RoleCategoryT = z.infer<typeof RoleCategory>

export const Seniority = z.enum(['ic', 'senior', 'lead', 'manager', 'director', 'exec', 'unknown'])
export type SeniorityT = z.infer<typeof Seniority>

export const Standard = z.enum([
  'SNOMED', 'LOINC', 'FHIR', 'ICD-10', 'ICD-11', 'RxNorm', 'CPT',
  'HL7v2', 'CDA', 'eCQM', 'HEDIS', 'OMOP', 'NCPDP', 'UCUM', 'other',
])
export type StandardT = z.infer<typeof Standard>

export const FunctionType = z.enum(['new-function', 'backfill', 'unknown'])
export type FunctionTypeT = z.infer<typeof FunctionType>

// The LLM's entire contract: structured facts read from the posting text.
// No interpretation, no buying-intent inference — that is the rules engine's job.
export const Extraction = z.object({
  roleCategory: RoleCategory,
  seniority: Seniority,
  standardsMentioned: z.array(Standard),
  clinicalDomain: z.string().nullable(),   // e.g. "oncology", "cardiology", or null
  teamContext: z.string().nullable(),      // short free-text team/mission clue, or null
  functionType: FunctionType,              // is this a NEW function or backfilling an existing one?
  confidence: z.number().min(0).max(1),
})
export type ExtractionT = z.infer<typeof Extraction>
