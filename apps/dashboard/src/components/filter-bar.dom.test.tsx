import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FilterBar } from './filter-bar.tsx'

const replace = vi.fn()
let params = new URLSearchParams()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  usePathname: () => '/',
  useSearchParams: () => params,
}))

const options = {
  segments: ['payer', 'ehr-vendor'],
  signalTypes: ['stage-assessment', 'integration-starting'],
  statuses: ['new', 'reviewed'],
}

describe('FilterBar', () => {
  beforeEach(() => { replace.mockClear(); params = new URLSearchParams() })

  it('writes the chosen segment into the URL, preserving other params', () => {
    params = new URLSearchParams('lens=tt')
    render(<FilterBar options={options} />)
    fireEvent.change(screen.getByLabelText('Segment'), { target: { value: 'payer' } })
    expect(replace).toHaveBeenCalledWith('/?lens=tt&segment=payer', { scroll: false })
  })

  it('removes the param when reset to All', () => {
    params = new URLSearchParams('segment=payer')
    render(<FilterBar options={options} />)
    fireEvent.change(screen.getByLabelText('Segment'), { target: { value: '' } })
    expect(replace).toHaveBeenCalledWith('/', { scroll: false })
  })

  it('shows active count and clears all filter params but not lens', () => {
    params = new URLSearchParams('lens=tt&segment=payer&minStrength=3')
    render(<FilterBar options={options} />)
    expect(screen.getByText('2 active')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /clear/i }))
    expect(replace).toHaveBeenCalledWith('/?lens=tt', { scroll: false })
  })

  it('shows no clear button when nothing is filtered', () => {
    render(<FilterBar options={options} />)
    expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument()
  })

  it('chains rapid successive changes without losing the first', () => {
    render(<FilterBar options={options} />)
    fireEvent.change(screen.getByLabelText('Segment'), { target: { value: 'payer' } })
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'new' } })
    expect(replace).toHaveBeenCalledTimes(2)
    const url = String(replace.mock.lastCall?.[0])
    expect(url).toContain('segment=payer')
    expect(url).toContain('status=new')
  })

  it('offers min strength up to 5', () => {
    render(<FilterBar options={options} />)
    const select = screen.getByLabelText('Min strength') as HTMLSelectElement
    const values = Array.from(select.options).map((o) => o.value)
    expect(values).toContain('5')
  })
})
