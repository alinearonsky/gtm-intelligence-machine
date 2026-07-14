import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PostingRow } from './posting-row.tsx'
import { Table, TableBody } from '@/components/ui/table'
import type { OrgProfile } from '@/db/types'

const posting: OrgProfile['postings'][number] = {
  externalId: 'p1', title: 'Senior Terminologist', url: 'https://x/p1', location: 'Remote', department: null,
  isBaseline: false, firstSeen: '2026-07-01T00:00:00Z', removedAt: null, seniority: 'senior',
  clinicalDomain: 'oncology', teamContext: 'terminology team', standards: ['FHIR', 'SNOMED'],
  functionType: 'new-function', confidence: 0.9,
}
const renderRow = (evidenceQuote?: string) =>
  render(<Table><TableBody><PostingRow posting={posting} evidenceQuote={evidenceQuote} /></TableBody></Table>)

describe('PostingRow', () => {
  it('shows title, standards chips and the new-function tag collapsed', () => {
    renderRow()
    expect(screen.getByText('Senior Terminologist')).toBeInTheDocument()
    expect(screen.getByText('FHIR')).toBeInTheDocument()
    expect(screen.getByText(/new.function/i)).toBeInTheDocument()
  })
  it('reveals seniority, domain and evidence quote on expand', () => {
    renderRow('We are standardizing on FHIR.')
    expect(screen.queryByText('oncology')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /details/i }))
    expect(screen.getByText('oncology')).toBeInTheDocument()
    expect(screen.getByText(/standardizing on FHIR/)).toBeInTheDocument()
  })
})
