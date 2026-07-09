'use client'

import { useState } from 'react'

export function ErrorCell({ errors }: { errors: { orgSlug: string; message: string }[] }) {
  const [open, setOpen] = useState(false)
  if (errors.length === 0) return <span className="text-muted-foreground">—</span>
  const text = errors.map((e) => `${e.orgSlug}: ${e.message}`).join('; ')
  return (
    <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} title={open ? 'collapse' : 'expand'}
      className={`block max-w-md text-left font-mono text-xs text-priority-act-now ${open ? 'whitespace-pre-wrap break-words' : 'truncate'}`}>
      {text}
    </button>
  )
}
