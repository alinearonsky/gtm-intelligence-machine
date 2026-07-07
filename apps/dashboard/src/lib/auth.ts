export type AuthDecision = { kind: 'allow' } | { kind: 'unauthorized' } | { kind: 'misconfigured' }

/** Pure basic-auth decision for the dashboard.
 *  - Explicit 'public' mode → always allow (open read-only demo instance).
 *  - 'private' mode WITHOUT both creds → misconfigured (fail closed): the private
 *    instance must never serve its confidential DB unauthenticated.
 *  - 'private' mode WITH creds → allow only on a correct Basic credential.
 *  - Anything else (unset, typo, wrong case) → misconfigured (fail closed): a
 *    private deploy with a mistyped INSTANCE_MODE must never fall open.
 *  A password may contain ':' — only the FIRST ':' splits user from pass. */
export function authDecision(
  mode: string | undefined,
  user: string | undefined,
  pass: string | undefined,
  authHeader: string | null,
): AuthDecision {
  // Fail closed for privacy: ONLY an explicit 'public' serves data without auth.
  // 'private' requires creds. Anything else (unset / typo / wrong case) is a
  // misconfiguration and must NOT fall open — a private deploy with a mistyped
  // INSTANCE_MODE would otherwise serve its confidential DB unauthenticated.
  if (mode === 'public') return { kind: 'allow' }
  if (mode !== 'private') return { kind: 'misconfigured' }
  if (!user || !pass) return { kind: 'misconfigured' }
  if (authHeader && authHeader.startsWith('Basic ')) {
    let decoded: string
    try {
      decoded = atob(authHeader.slice('Basic '.length))
    } catch {
      return { kind: 'unauthorized' }
    }
    const idx = decoded.indexOf(':')
    if (idx !== -1 && decoded.slice(0, idx) === user && decoded.slice(idx + 1) === pass) {
      return { kind: 'allow' }
    }
  }
  return { kind: 'unauthorized' }
}
