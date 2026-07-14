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
