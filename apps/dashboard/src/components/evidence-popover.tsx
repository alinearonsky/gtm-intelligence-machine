'use client'

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import type { EvidenceItem } from '@/db/types'

export function EvidenceList({ evidence }: { evidence: EvidenceItem[] }) {
  return (
    <div className="space-y-3">
      {evidence.map((e) => (
        <div key={e.externalId} className="space-y-1">
          <blockquote className="border-l-2 pl-2 text-sm italic">{e.quote}</blockquote>
          <a
            href={e.url}
            target="_blank"
            rel="noreferrer noopener"
            className="text-xs text-blue-600 hover:underline"
          >
            view posting →
          </a>
        </div>
      ))}
    </div>
  )
}

export function EvidencePopover({ evidence }: { evidence: EvidenceItem[] }) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="ghost" size="sm">
            {evidence.length} evidence
          </Button>
        }
      />
      <PopoverContent className="w-96">
        <EvidenceList evidence={evidence} />
      </PopoverContent>
    </Popover>
  )
}
