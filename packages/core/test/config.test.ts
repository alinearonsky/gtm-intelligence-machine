import { describe, it, expect } from 'vitest'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { loadWatchlist } from '../src/index.ts'

const VALID = `
orgs:
  - name: Fixture Health
    domain: fixturehealth.example
    segment: digital-health-startup
    products: [tt]
    slug: fixturehealth
    ats: greenhouse
`

describe('loadWatchlist', () => {
  it('parses a valid watchlist file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'wl-'))
    const file = join(dir, 'demo.yaml')
    writeFileSync(file, VALID)
    const wl = loadWatchlist(file)
    expect(wl.orgs).toHaveLength(1)
    expect(wl.orgs[0]!.ats).toBe('greenhouse')
  })

  it('throws a readable error on an invalid file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'wl-'))
    const file = join(dir, 'bad.yaml')
    writeFileSync(file, 'orgs:\n  - name: NoSlug\n')
    expect(() => loadWatchlist(file)).toThrow(/bad\.yaml.*orgs\.0\./s)
  })

  it('rejects duplicate slugs', () => {
    const dir = mkdtempSync(join(tmpdir(), 'wl-'))
    const file = join(dir, 'dup.yaml')
    writeFileSync(file, VALID + VALID.replace('Fixture Health', 'Fixture Two').slice(6))
    expect(() => loadWatchlist(file)).toThrow(/duplicate slug/i)
  })
})
