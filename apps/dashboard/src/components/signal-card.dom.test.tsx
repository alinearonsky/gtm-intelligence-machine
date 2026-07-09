import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SignalCard } from './signal-card.tsx'
import type { FeedSignal } from '@/db/types'

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

const base: FeedSignal = {
  id: 1,
  orgId: 10,
  orgSlug: 'beta-labs',
  orgName: 'Beta Labs',
  segment: 'ehr-vendor',
  signalType: 'entering-adoption',
  stage: 'early',
  strength: 4,
  confidence: 0.9,
  isBaselineAssessment: false,
  status: 'new',
  createdAt: '2026-07-01T00:00:00.000Z',
  priority: 'act-now',
  rationale: 'Beta Labs: prime trial window.',
  evidence: [{ externalId: 'b1', url: 'https://beta.example/b1', quote: 'Beta quote' }],
}

describe('SignalCard', () => {
  it('renders org, signal type, strength, rationale, and priority', () => {
    render(<SignalCard signal={base} />)
    expect(screen.getByText('Beta Labs')).toBeInTheDocument()
    expect(screen.getByText('entering-adoption')).toBeInTheDocument()
    expect(screen.getByLabelText('strength 4 of 5')).toBeInTheDocument()
    expect(screen.getByText(/Beta Labs: prime trial window\./)).toBeInTheDocument()
    expect(screen.getByText('act-now')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /1 evidence/i })).toBeInTheDocument()
  })

  it('displays a baseline assessment with its (non-act-now) priority + a baseline badge', () => {
    render(<SignalCard signal={{ ...base, isBaselineAssessment: true, priority: 'watch' }} />)
    expect(screen.queryByText('act-now')).not.toBeInTheDocument()
    expect(screen.getByText('watch')).toBeInTheDocument()
    expect(screen.getByText(/baseline/i)).toBeInTheDocument()
  })

  it('renders an in-card footer when provided', () => {
    render(<SignalCard signal={base} footer={<button>Copy outreach brief</button>} />)
    expect(screen.getByRole('button', { name: 'Copy outreach brief' })).toBeInTheDocument()
  })
})
