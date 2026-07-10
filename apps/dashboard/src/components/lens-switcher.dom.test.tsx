import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LensSwitcher } from './lens-switcher.tsx'

let params = new URLSearchParams()
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useSearchParams: () => params,
}))
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}))

describe('LensSwitcher', () => {
  it('drops filter params when switching lens (they may be invalid under another lens)', () => {
    params = new URLSearchParams('lens=tt&segment=payer&minStrength=3')
    render(<LensSwitcher />)
    const href = screen.getByText('Terminology Tool').getAttribute('href')!
    expect(href).toContain('lens=tt')
    expect(href).not.toContain('segment=')
    expect(href).not.toContain('minStrength=')
  })

  it('marks the active lens with aria-current', () => {
    params = new URLSearchParams('lens=tt')
    render(<LensSwitcher />)
    expect(screen.getByText('Terminology Tool')).toHaveAttribute('aria-current', 'true')
  })
})
