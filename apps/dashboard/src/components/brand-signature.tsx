'use client'

import { useEffect } from 'react'

// Quiet console signature — invisible to the interface, a small reward for anyone
// who opens devtools (this dashboard doubles as a public work sample). Module-level
// guard so React strict-mode's double-invoke logs it only once.
let logged = false

export function BrandSignature() {
  useEffect(() => {
    if (logged) return
    logged = true
    console.info(
      '%cGTM Intelligence',
      'font-weight:600;color:oklch(0.56 0.19 270)',
      '— hiring-signal timing for healthtech go-to-market.',
    )
  }, [])
  return null
}
