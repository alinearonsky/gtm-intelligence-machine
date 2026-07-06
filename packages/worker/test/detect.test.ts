import { describe, it, expect, vi, afterEach } from 'vitest'
import { adapters, detectAts } from '../src/ats/index.ts'

afterEach(() => vi.unstubAllGlobals())

describe('adapter registry', () => {
  it('exposes all five adapters by type', () => {
    expect(Object.keys(adapters).sort()).toEqual(['ashby', 'greenhouse', 'lever', 'smartrecruiters', 'workable'])
  })
})

describe('detectAts', () => {
  it('returns the first ATS whose probe confirms the board', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string | URL) => {
      if (String(url).includes('lever.co')) return new Response(JSON.stringify([]))
      return new Response('not found', { status: 404 })
    }))
    expect(await detectAts('someorg')).toBe('lever')
  })

  it('returns null when nothing answers', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('x', { status: 404 })))
    expect(await detectAts('ghost')).toBeNull()
  })

  it('does NOT report smartrecruiters for its universal 200-empty response', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string | URL) => {
      if (String(url).includes('smartrecruiters.com'))
        return new Response(JSON.stringify({ offset: 0, limit: 1, totalFound: 0, content: [] }))
      return new Response('not found', { status: 404 })
    }))
    expect(await detectAts('ghost')).toBeNull()
  })

  it('reports smartrecruiters when the board has real postings', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string | URL) => {
      if (String(url).includes('smartrecruiters.com'))
        return new Response(JSON.stringify({ offset: 0, limit: 1, totalFound: 12, content: [{ id: '1', name: 'x' }] }))
      return new Response('not found', { status: 404 })
    }))
    expect(await detectAts('realorg')).toBe('smartrecruiters')
  })
})
