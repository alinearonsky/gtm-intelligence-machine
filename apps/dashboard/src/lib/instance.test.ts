import { describe, it, expect, afterEach, vi } from 'vitest'
import { instanceMode, isPrivate, assertWritable } from './instance.ts'

afterEach(() => { vi.unstubAllEnvs() })

describe('instance mode', () => {
  it('defaults to public when INSTANCE_MODE is unset', () => {
    vi.stubEnv('INSTANCE_MODE', '')
    expect(instanceMode()).toBe('public')
    expect(isPrivate()).toBe(false)
  })

  it('treats unknown values as public (fail safe for mutations)', () => {
    vi.stubEnv('INSTANCE_MODE', 'stagingg')
    expect(instanceMode()).toBe('public')
  })

  it('recognizes private', () => {
    vi.stubEnv('INSTANCE_MODE', 'private')
    expect(instanceMode()).toBe('private')
    expect(isPrivate()).toBe(true)
  })

  it('assertWritable throws in public mode', () => {
    vi.stubEnv('INSTANCE_MODE', 'public')
    expect(() => assertWritable()).toThrow(/read-only/i)
  })

  it('assertWritable passes in private mode', () => {
    vi.stubEnv('INSTANCE_MODE', 'private')
    expect(() => assertWritable()).not.toThrow()
  })
})
