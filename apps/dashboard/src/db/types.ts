import type { PriorityT } from '@gtm/core'

export interface EvidenceItem { externalId: string; url: string; quote: string }

export interface FeedSignal {
  id: number
  orgId: number
  orgSlug: string
  orgName: string
  domain: string
  segment: string
  signalType: string
  stage: string
  strength: number
  confidence: number
  isBaselineAssessment: boolean
  status: string
  createdAt: string
  priority: PriorityT
  rationale: string
  evidence: EvidenceItem[]
}

export interface FeedFilters {
  segment?: string
  signalType?: string
  minStrength?: number
  status?: string
  priority?: string
}

export interface OrgProfile {
  id: number
  slug: string
  name: string
  domain: string
  segment: string
  products: string[]
  status: string
  narrative: string | null
  signals: FeedSignal[]
  postings: {
    externalId: string; title: string; url: string; location: string | null
    department: string | null; isBaseline: boolean; firstSeen: string; removedAt: string | null
    seniority: string | null; clinicalDomain: string | null; teamContext: string | null
    standards: string[]; functionType: string | null; confidence: number | null
  }[]
}

export interface RunHealthRow {
  id: number
  startedAt: string; finishedAt: string
  orgsScanned: number; orgsFailed: number
  postingsFound: number; postingsNew: number; postingsRemoved: number
  errors: { orgSlug: string; message: string }[]
}

export interface OrgAdminRow {
  id: number; slug: string; name: string; domain: string; segment: string
  ats: string | null; atsDetected: string | null; status: string
  consecutiveFailures: number; firstScannedAt: string | null; activePostings: number
}

export interface FilterOptions {
  segments: string[]
  signalTypes: string[]
  statuses: string[]
}
