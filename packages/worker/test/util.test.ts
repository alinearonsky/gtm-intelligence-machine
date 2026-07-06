import { describe, it, expect, vi } from 'vitest'
import { stripHtml, toIso } from '../src/ats/util.ts'

describe('stripHtml', () => {
  it('strips tags and decodes common entities', () => {
    expect(stripHtml('<p>SNOMED &amp; LOINC<br/>required</p>')).toBe('SNOMED & LOINC\nrequired')
  })
  it('handles escaped HTML (Greenhouse style)', () => {
    expect(stripHtml('&lt;p&gt;Value sets&lt;/p&gt;')).toBe('Value sets')
  })
  it('collapses whitespace runs', () => {
    expect(stripHtml('<div>  a  </div>\n\n\n<div>b</div>')).toBe('a\nb')
  })
  it('decodes smart quotes, dashes and numeric entities', () => {
    expect(stripHtml('it&rsquo;s FHIR &ndash; and SNOMED&#8482;')).toBe('it’s FHIR – and SNOMED™')
  })
})

describe('toIso', () => {
  it('normalizes offset dates', () => {
    expect(toIso('2026-06-01T00:00:00-05:00')).toBe('2026-06-01T05:00:00.000Z')
  })
  it('normalizes epoch millis', () => {
    expect(toIso(1750000000000)).toBe(new Date(1750000000000).toISOString())
  })
  it('normalizes date-only strings', () => {
    expect(toIso('2026-06-01')).toBe('2026-06-01T00:00:00.000Z')
  })
  it('returns null for garbage and nullish', () => {
    expect(toIso('not a date')).toBeNull()
    expect(toIso(null)).toBeNull()
    expect(toIso(undefined)).toBeNull()
  })
  it('treats timezone-less datetimes as UTC (deterministic across machines)', () => {
    expect(toIso('2026-06-01T12:00:00')).toBe('2026-06-01T12:00:00.000Z')
    expect(toIso('2026-06-01T12:00')).toBe('2026-06-01T12:00:00.000Z')
  })
})

describe('getJson', () => {
  it('attaches an abort signal so hung endpoints cannot stall the scan', async () => {
    let seenSignal: unknown
    vi.stubGlobal('fetch', vi.fn(async (_url: unknown, init?: RequestInit) => {
      seenSignal = init?.signal
      return new Response('{}')
    }))
    const { getJson } = await import('../src/ats/types.ts')
    await getJson('https://x.example', 'test', 'slug')
    expect(seenSignal).toBeInstanceOf(AbortSignal)
    vi.unstubAllGlobals()
  })
})
