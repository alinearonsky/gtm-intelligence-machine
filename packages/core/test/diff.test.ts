import { describe, it, expect } from 'vitest'
import { diffPostings, contentHash } from '../src/index.ts'
import type { RawPostingT } from '../src/index.ts'

function p(id: string, title: string, description = 'd'): RawPostingT {
  return { externalId: id, title, url: `https://x.example/${id}`, location: null, department: null, description, publishedAt: null }
}
const stored = (x: RawPostingT) => ({ externalId: x.externalId, contentHash: contentHash(x.title, x.description) })

describe('diffPostings', () => {
  it('classifies added, changed, removed, unchanged', () => {
    const kept = p('1', 'Terminologist')
    const willChange = p('2', 'FHIR Architect')
    const gone = p('3', 'Interface Analyst')
    const existing = [stored(kept), stored(willChange), stored(gone)]
    const fetched = [kept, { ...willChange, description: 'now senior' }, p('4', 'CMIO')]

    const d = diffPostings(existing, fetched)
    expect(d.added.map((x) => x.externalId)).toEqual(['4'])
    expect(d.changed.map((x) => x.externalId)).toEqual(['2'])
    expect(d.removedExternalIds).toEqual(['3'])
    expect(d.unchangedExternalIds).toEqual(['1'])
  })

  it('everything is added on an empty store', () => {
    const d = diffPostings([], [p('1', 'A'), p('2', 'B')])
    expect(d.added).toHaveLength(2)
    expect(d.removedExternalIds).toEqual([])
  })

  it('everything is removed on an empty fetch', () => {
    const d = diffPostings([stored(p('1', 'A'))], [])
    expect(d.removedExternalIds).toEqual(['1'])
  })

  it('dedupes duplicate externalIds in fetched, last wins', () => {
    const stale = p('1', 'Terminologist', 'old text')
    const fresh = p('1', 'Terminologist', 'new text')
    const d = diffPostings([stored(stale)], [stale, fresh])
    expect(d.changed.map((x) => x.externalId)).toEqual(['1'])
    expect(d.unchangedExternalIds).toEqual([])
    const d2 = diffPostings([], [stale, fresh, p('2', 'CMIO')])
    expect(d2.added.map((x) => x.externalId)).toEqual(['1', '2'])
    expect(d2.added[0]!.description).toBe('new text')
  })
})
