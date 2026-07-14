import type { PriorityT } from '@gtm/core'

// The DB stores machine slugs (signal_type, stage, segment, priority). These
// maps turn them into plain English for the UI. Unknown values fall back to a
// title-cased slug so a new rule never renders a broken label.

const titleCase = (slug: string) =>
  slug.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

const SIGNAL_TYPE: Record<string, string> = {
  'entering-adoption': 'Entering adoption',
  'integration-starting': 'Integration starting',
  'mid-implementation': 'Actively building',
  'strategic-commitment': 'Strategic commitment',
  'standards-adoption': 'Standards adoption',
  'implementation-staffed': 'Role filled',
  'measures-program-forming': 'Measures program forming',
  'governance-investment': 'Governance investment',
  'stage-assessment': 'Current stage',
}

const STAGE: Record<string, string> = {
  early: 'Early-stage',
  mid: 'Building',
}

// One-line explanation of what a stage means, for tooltips.
const STAGE_HINT: Record<string, string> = {
  early: 'Just starting to explore clinical terminology',
  mid: 'Actively staffing a build — the highest-intent window',
}

const SEGMENT: Record<string, string> = {
  'digital-health-startup': 'Digital health startup',
  'ehr-vendor': 'EHR vendor',
  payer: 'Payer',
  'measure-developer': 'Measure developer',
  'health-system': 'Health system',
  other: 'Other',
}

const PRIORITY: Record<PriorityT, string> = {
  'act-now': 'Act now',
  watch: 'Watch',
  ignore: 'Low priority',
}

export const signalTypeLabel = (v: string) => SIGNAL_TYPE[v] ?? titleCase(v)
export const stageLabel = (v: string) => STAGE[v] ?? titleCase(v)
export const stageHint = (v: string) => STAGE_HINT[v] ?? ''
export const segmentLabel = (v: string) => SEGMENT[v] ?? titleCase(v)
export const priorityLabel = (v: PriorityT) => PRIORITY[v] ?? titleCase(v)

// "What it means" — the behavioral definition of each signal type, condensed
// from the rule rationales in ontology/signal-rules.yaml (source of truth).
const SIGNAL_MEANING: Record<string, string> = {
  'entering-adoption': 'The org opened its first clinical-terminology role — it is entering the clinical-vocabulary adoption journey.',
  'integration-starting': 'A first FHIR/HL7 interoperability role — the org is standing up data exchange, which often precedes a terminology-normalization need.',
  'mid-implementation': 'Two or more terminology, clinical-content, or data-quality roles opened within ~60 days — the org is actively staffing a build.',
  'strategic-commitment': 'A director- or exec-level clinical-informatics leader was hired — organizational commitment and budget authority behind the program.',
  'standards-adoption': 'Postings now name FHIR/SNOMED/LOINC where earlier ones did not — awareness of clinical standards is rising.',
  'implementation-staffed': 'A terminology or interoperability role was opened and then filled — implementation is now staffed.',
  'measures-program-forming': 'A first eCQM/HEDIS quality-measures role — a measures program is forming, and it depends on well-governed value sets.',
  'governance-investment': 'A clinical data-quality or governance role — investment in reference-data discipline, adjacent to a terminology-management need.',
  'stage-assessment': 'Existing terminology or interoperability openings seen at first observation — a snapshot of where the org already is, not a new timed event.',
}
export const signalMeaning = (v: string) => SIGNAL_MEANING[v] ?? ''

// "Implications" — the TT-lens take on what to do, mirroring ontology/lenses/tt.yaml.
// act-now/ignore are priority-driven; watch flavor varies by signal type.
const WATCH_IMPLICATION: Record<string, string> = {
  'entering-adoption': 'Strong terminology movement, but outside the act-now motion for now — monitor for segment and timing to line up.',
  'mid-implementation': 'Strong terminology movement, but outside the act-now motion for now — monitor for segment and timing to line up.',
  'integration-starting': 'Early interoperability/standards movement that often precedes a terminology need — monitor.',
  'standards-adoption': 'Early interoperability/standards movement that often precedes a terminology need — monitor.',
  'implementation-staffed': 'A role was filled — re-check for expansion or a tooling gap.',
  'strategic-commitment': 'Organizational investment adjacent to terminology — warm, but not yet timed.',
  'measures-program-forming': 'Organizational investment adjacent to terminology — warm, but not yet timed.',
  'governance-investment': 'Organizational investment adjacent to terminology — warm, but not yet timed.',
  'stage-assessment': 'Background on where the org stands — not a timed event to act on.',
}
export function signalImplication(signalType: string, priority: PriorityT): string {
  if (priority === 'act-now') return 'The buying window is open — a prime Terminology Tool trial-outreach moment.'
  if (priority === 'ignore') return 'No active buying signal right now.'
  return WATCH_IMPLICATION[signalType] ?? 'Worth monitoring — not yet timed.'
}
