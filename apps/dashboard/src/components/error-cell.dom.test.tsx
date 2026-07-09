import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ErrorCell } from './error-cell.tsx'

const errors = [
  { orgSlug: 'org-a', message: 'timeout after 30s' },
  { orgSlug: 'org-b', message: 'HTTP 503' },
]

describe('ErrorCell', () => {
  it('renders a dash when there are no errors', () => {
    render(<ErrorCell errors={[]} />)
    expect(screen.getByText('—')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('renders joined slug: message text', () => {
    render(<ErrorCell errors={errors} />)
    expect(screen.getByRole('button')).toHaveTextContent('org-a: timeout after 30s; org-b: HTTP 503')
  })

  it('click toggles aria-expanded and switches truncation to wrapping', () => {
    render(<ErrorCell errors={errors} />)
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(button.className).toContain('truncate')
    fireEvent.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'true')
    expect(button.className).not.toContain('truncate')
    expect(button.className).toContain('whitespace-pre-wrap')
    expect(button.className).toContain('break-words')
  })
})
