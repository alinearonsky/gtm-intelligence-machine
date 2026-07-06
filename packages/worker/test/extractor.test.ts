import { describe, it, expect, vi } from 'vitest'
import type { RawPostingT } from '@gtm/core'
import { anthropicExtractor, EXTRACTION_MODEL, EXTRACTION_PROMPT_VERSION } from '../src/extract/extractor.ts'

function posting(title: string, description = ''): RawPostingT {
  return { externalId: '1', title, url: 'https://x.example/1', location: null, department: null, description, publishedAt: null }
}

const okExtraction = {
  roleCategory: 'terminologist', seniority: 'senior', standardsMentioned: ['SNOMED'],
  clinicalDomain: null, teamContext: null, functionType: 'new-function', confidence: 0.8,
}

describe('anthropicExtractor', () => {
  it('forces the extraction tool, passes the pinned model, and returns the validated input', async () => {
    const create = vi.fn(async (_params: any) => ({ content: [{ type: 'tool_use', id: 't1', name: 'record_extraction', input: okExtraction }] }))
    const fakeClient = { messages: { create } } as any
    const ext = anthropicExtractor(fakeClient)
    const out = await ext.extract(posting('Clinical Terminologist', 'Maintain SNOMED value sets.'))
    expect(out.roleCategory).toBe('terminologist')
    const args = create.mock.calls[0]![0]
    expect(args.model).toBe(EXTRACTION_MODEL)
    expect(String(args.messages[0].content)).toContain('Clinical Terminologist')
    expect(args.tool_choice).toMatchObject({ type: 'tool', name: 'record_extraction' })
  })

  it('throws when the model returns no tool_use output', async () => {
    const fakeClient = { messages: { create: vi.fn(async () => ({ content: [{ type: 'text', text: 'nope' }] })) } } as any
    await expect(anthropicExtractor(fakeClient).extract(posting('x'))).rejects.toThrow(/no tool_use output/i)
  })

  it('throws when the tool input fails schema validation', async () => {
    const fakeClient = { messages: { create: vi.fn(async () => ({ content: [{ type: 'tool_use', id: 't1', name: 'record_extraction', input: { ...okExtraction, roleCategory: 'chef' } }] })) } } as any
    await expect(anthropicExtractor(fakeClient).extract(posting('x'))).rejects.toThrow()
  })

  it('pins a prompt version string', () => {
    expect(EXTRACTION_PROMPT_VERSION).toMatch(/^ext-/)
  })
})
