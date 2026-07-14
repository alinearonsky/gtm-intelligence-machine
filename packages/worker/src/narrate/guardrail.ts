import type { OrgNarrativeInput } from './signature.ts'

// Every terminology standard the extractor can name. If the narrative mentions
// one of these and it is NOT in the org's allowed set, the model invented a
// specific — reject.
const ALL_STANDARDS = ['SNOMED', 'LOINC', 'FHIR', 'ICD-10', 'ICD-11', 'RxNorm', 'CPT', 'HL7v2', 'CDA', 'eCQM', 'HEDIS', 'OMOP', 'NCPDP', 'UCUM']

export function assertFactsOnly(narrative: string, input: OrgNarrativeInput): void {
  const allowed = new Set(input.standards)
  for (const std of ALL_STANDARDS) {
    const named = new RegExp(`\\b${std.replace(/[-]/g, '\\-')}\\b`, 'i').test(narrative)
    if (named && !allowed.has(std)) {
      throw new Error(`narrative names standard "${std}" not present in org facts`)
    }
  }
  if (input.baselineOnly && /act[\s-]?now/i.test(narrative)) {
    throw new Error('narrative uses act-now framing for a baseline-only org')
  }
}
