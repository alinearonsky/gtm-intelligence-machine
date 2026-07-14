// Compact "3 hours ago" formatting via the platform Intl API — no dependency.
// Used server-side on force-dynamic pages, so the value is stamped per request
// and there's no client/server hydration drift.
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 31536000],
  ['month', 2592000],
  ['week', 604800],
  ['day', 86400],
  ['hour', 3600],
  ['minute', 60],
  ['second', 1],
]

export function relativeTime(iso: string, now = Date.now()): string {
  const diffSec = Math.round((now - new Date(iso).getTime()) / 1000)
  const abs = Math.abs(diffSec)
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  for (const [unit, secs] of UNITS) {
    if (abs >= secs || unit === 'second') {
      return rtf.format(-Math.round(diffSec / secs), unit)
    }
  }
  return 'just now'
}
