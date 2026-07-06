import { describe, it, expect } from 'vitest'
import Anthropic from '@anthropic-ai/sdk'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { RawPostingT } from '@gtm/core'
import { anthropicExtractor } from '../src/extract/extractor.ts'

const golden = JSON.parse(readFileSync(fileURLToPath(new URL('./golden/postings.json', import.meta.url)), 'utf8')) as
  { title: string; description: string; expectRole: string; expectStandards: string[] }[]

const run = process.env.ANTHROPIC_API_KEY ? describe : describe.skip

run('extraction golden set (live API)', () => {
  const ext = anthropicExtractor(new Anthropic())
  for (const g of golden) {
    it(`classifies "${g.title}" as ${g.expectRole}`, async () => {
      const posting: RawPostingT = { externalId: 'g', title: g.title, url: 'https://x.example/g',
        location: null, department: null, description: g.description, publishedAt: null }
      const out = await ext.extract(posting)
      expect(out.roleCategory).toBe(g.expectRole)
      for (const s of g.expectStandards) expect(out.standardsMentioned).toContain(s)
    }, 30_000)
  }
})
