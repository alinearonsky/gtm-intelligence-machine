import { NextResponse, type NextRequest } from 'next/server'
import { authDecision } from '@/lib/auth'

// Fail closed: a PRIVATE instance MUST carry basic-auth creds. Without them we
// refuse every request (503) rather than serve the private DB unauthenticated.
// A PUBLIC instance (read-only, demo DB) is open by design.
export function middleware(req: NextRequest) {
  const decision = authDecision(
    process.env.INSTANCE_MODE,
    process.env.DASHBOARD_BASIC_AUTH_USER,
    process.env.DASHBOARD_BASIC_AUTH_PASS,
    req.headers.get('authorization'),
  )
  if (decision.kind === 'allow') return NextResponse.next()
  if (decision.kind === 'misconfigured') {
    return new NextResponse('Private instance is misconfigured (no credentials set).', { status: 503 })
  }
  return new NextResponse('Authentication required.', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="GTM Intelligence (private)"' },
  })
}

// Guard everything except Next internals and static assets.
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] }
