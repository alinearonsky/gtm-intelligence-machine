import { describe, it, expect } from 'vitest'
import { authDecision } from './auth.ts'

const authHeader = (u: string, p: string) => 'Basic ' + btoa(`${u}:${p}`)

describe('authDecision', () => {
  it('explicit public allows (open read-only demo)', () => {
    expect(authDecision('public', undefined, undefined, null).kind).toBe('allow')
  })

  it('unset or unknown mode fails CLOSED (misconfigured), never open', () => {
    expect(authDecision(undefined, undefined, undefined, null).kind).toBe('misconfigured')
    expect(authDecision('', undefined, undefined, null).kind).toBe('misconfigured')
    expect(authDecision('staging-typo', 'u', 'p', authHeader('u', 'p')).kind).toBe('misconfigured')
    expect(authDecision('Private', 'u', 'p', authHeader('u', 'p')).kind).toBe('misconfigured')
  })

  it('private WITHOUT both creds is misconfigured — fail closed (503)', () => {
    expect(authDecision('private', undefined, undefined, authHeader('u', 'p')).kind).toBe('misconfigured')
    expect(authDecision('private', 'u', '', authHeader('u', 'p')).kind).toBe('misconfigured')
    expect(authDecision('private', '', 'p', authHeader('u', 'p')).kind).toBe('misconfigured')
  })

  it('private WITH creds but missing/wrong/malformed auth is unauthorized (401)', () => {
    expect(authDecision('private', 'u', 'p', null).kind).toBe('unauthorized')
    expect(authDecision('private', 'u', 'p', 'Bearer xyz').kind).toBe('unauthorized')
    expect(authDecision('private', 'u', 'p', authHeader('u', 'wrong')).kind).toBe('unauthorized')
    expect(authDecision('private', 'u', 'p', authHeader('wrong', 'p')).kind).toBe('unauthorized')
    expect(authDecision('private', 'u', 'p', 'Basic @@@notbase64@@@').kind).toBe('unauthorized')
  })

  it('private WITH correct auth allows', () => {
    expect(authDecision('private', 'u', 'p', authHeader('u', 'p')).kind).toBe('allow')
  })

  it('handles a password containing a colon correctly', () => {
    expect(authDecision('private', 'u', 'p:with:colons', authHeader('u', 'p:with:colons')).kind).toBe('allow')
  })
})
