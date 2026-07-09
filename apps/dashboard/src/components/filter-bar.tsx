'use client'

import { useRef, useEffect } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import type { FilterOptions } from '@/db/types'

const FILTER_KEYS = ['segment', 'signalType', 'status', 'minStrength'] as const

function Select({ label, param, value, children, onChange }: {
  label: string; param: string; value: string
  children: React.ReactNode; onChange: (param: string, value: string) => void
}) {
  return (
    <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
      {label}
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(param, e.target.value)}
        className="h-7 rounded-md border bg-card px-1.5 font-mono text-xs text-foreground"
      >
        {children}
      </select>
    </label>
  )
}

export function FilterBar({ options }: { options: FilterOptions }) {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()

  // Successive changes before the URL commits build on the pending params,
  // not the stale snapshot — otherwise the second change loses the first.
  const pending = useRef<URLSearchParams | null>(null)
  useEffect(() => { pending.current = null }, [sp])

  const write = (next: URLSearchParams) => {
    pending.current = next
    const qs = next.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  const set = (param: string, value: string) => {
    const next = new URLSearchParams(pending.current ?? sp)
    if (value) next.set(param, value)
    else next.delete(param)
    write(next)
  }

  const clearAll = () => {
    const next = new URLSearchParams(pending.current ?? sp)
    for (const k of FILTER_KEYS) next.delete(k)
    write(next)
  }

  const activeCount = FILTER_KEYS.filter((k) => sp.get(k)).length

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card px-3 py-2">
      <Select label="Segment" param="segment" value={sp.get('segment') ?? ''} onChange={set}>
        <option value="">All</option>
        {options.segments.map((s) => <option key={s} value={s}>{s}</option>)}
      </Select>
      <Select label="Signal type" param="signalType" value={sp.get('signalType') ?? ''} onChange={set}>
        <option value="">All</option>
        {options.signalTypes.map((s) => <option key={s} value={s}>{s}</option>)}
      </Select>
      <Select label="Status" param="status" value={sp.get('status') ?? ''} onChange={set}>
        <option value="">All</option>
        {options.statuses.map((s) => <option key={s} value={s}>{s}</option>)}
      </Select>
      <Select label="Min strength" param="minStrength" value={sp.get('minStrength') ?? ''} onChange={set}>
        <option value="">Any</option>
        <option value="2">2+</option>
        <option value="3">3+</option>
        <option value="4">4+</option>
        <option value="5">5</option>
      </Select>
      {activeCount > 0 && (
        <span className="ml-auto flex items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground">{activeCount} active</span>
          <button type="button" onClick={clearAll}
            className="rounded-md px-2 py-1 text-xs text-primary hover:bg-accent">
            Clear
          </button>
        </span>
      )}
    </div>
  )
}
