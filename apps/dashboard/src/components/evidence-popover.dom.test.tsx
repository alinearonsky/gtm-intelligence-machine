import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EvidenceList, EvidencePopover } from './evidence-popover.tsx'

const evidence = [
  { externalId: 'b1', url: 'https://beta.example/b1', quote: 'Beta quote 1' },
  { externalId: 'b2', url: 'https://beta.example/b2', quote: 'Beta quote 2' },
]

describe('EvidenceList', () => {
  it('renders each quote and a link per evidence item', () => {
    render(<EvidenceList evidence={evidence} />)
    expect(screen.getByText('Beta quote 1')).toBeInTheDocument()
    expect(screen.getByText('Beta quote 2')).toBeInTheDocument()
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(2)
    expect(links[0]).toHaveAttribute('href', 'https://beta.example/b1')
  })
})

describe('EvidencePopover', () => {
  it('shows a trigger labelled with the evidence count', () => {
    render(<EvidencePopover evidence={evidence} />)
    expect(screen.getByRole('button', { name: /2 evidence/i })).toBeInTheDocument()
  })
})
