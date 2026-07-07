'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { buildOutreachBrief } from '@/lib/brief'
import type { FeedSignal } from '@/db/types'

export function CopyBriefButton({ signal }: { signal: FeedSignal }) {
  const [copied, setCopied] = useState(false)
  return (
    <Button variant="outline" size="sm" onClick={async () => {
      await navigator.clipboard.writeText(buildOutreachBrief(signal))
      setCopied(true); setTimeout(() => setCopied(false), 1500)
    }}>
      {copied ? 'Copied' : 'Copy outreach brief'}
    </Button>
  )
}
