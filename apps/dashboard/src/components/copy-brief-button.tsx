'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { buildOutreachBrief } from '@/lib/brief'
import { cn } from '@/lib/utils'
import type { FeedSignal } from '@/db/types'

// The outreach brief is the artifact this whole product exists to produce, so the
// copy is the one interaction that earns real feedback: the icon swaps to a check
// that pops in (ease-out, no bounce) and the button settles to primary for ~1.5s.
// Everything is transform/opacity + color, and the reduced-motion guard in
// globals.css collapses the pop for users who opt out.
export function CopyBriefButton({ signal }: { signal: FeedSignal }) {
  const [copied, setCopied] = useState(false)
  return (
    <Button
      variant="outline"
      size="sm"
      aria-label={copied ? 'Outreach brief copied to clipboard' : 'Copy outreach brief'}
      // The button variant already carries `transition-all`, so the settle to
      // primary animates without an extra (narrowing) transition utility here.
      className={cn(copied && 'border-primary/40 text-primary')}
      onClick={async () => {
        await navigator.clipboard.writeText(buildOutreachBrief(signal))
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
    >
      {copied ? (
        <>
          <Check key="check" className="animate-check-in" aria-hidden />
          Copied
        </>
      ) : (
        <>
          <Copy aria-hidden />
          Copy outreach brief
        </>
      )}
      <span role="status" className="sr-only">
        {copied ? 'Outreach brief copied' : ''}
      </span>
    </Button>
  )
}
