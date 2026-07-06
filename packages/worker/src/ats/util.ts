const NAMED: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“',
  mdash: '—', ndash: '–', hellip: '…',
}

function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&([a-zA-Z]+);/g, (m, name) => NAMED[name] ?? m)
}

/** Strip HTML to readable plain text. Handles double-escaped HTML (decode first, then strip). */
export function stripHtml(html: string): string {
  const decoded = decodeEntities(html)
  return decodeEntities(decoded)              // second pass for double-escaped content
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6])[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter((l) => l !== '')
    .join('\n')
}

/** Normalize any date-ish value (ISO w/ offset, epoch ms, date-only) to strict ISO, else null. */
export function toIso(v: string | number | null | undefined): string | null {
  if (v === null || v === undefined || v === '') return null
  let s: string | number = v
  if (typeof s === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) s = `${s}T00:00:00.000Z`
    // datetime with no Z/offset → force UTC so parsing is machine-independent
    else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(s)) s = `${s}Z`
  }
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}
