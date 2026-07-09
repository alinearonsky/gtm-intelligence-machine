import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Nav } from './nav.tsx'

const usePathname = vi.fn()
vi.mock('next/navigation', () => ({ usePathname: () => usePathname() }))
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}))

describe('Nav', () => {
  it('marks the current route active via aria-current', () => {
    usePathname.mockReturnValue('/watchlist')
    render(<Nav />)
    expect(screen.getByText('Watchlist')).toHaveAttribute('aria-current', 'page')
    expect(screen.getByText('Signals')).not.toHaveAttribute('aria-current')
  })

  it('treats org profile pages as belonging to Signals', () => {
    usePathname.mockReturnValue('/orgs/cloverhealth')
    render(<Nav />)
    expect(screen.getByText('Signals')).toHaveAttribute('aria-current', 'page')
  })
})
