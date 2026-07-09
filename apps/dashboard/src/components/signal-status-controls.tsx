'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { updateSignalStatus } from '@/app/actions'

export function SignalStatusControls({ signalId, status }: { signalId: number; status: string }) {
  const [pending, startTransition] = useTransition()
  const [failed, setFailed] = useState(false)

  const run = (next: string) =>
    startTransition(async () => {
      setFailed(false)
      try {
        await updateSignalStatus(signalId, next)
      } catch {
        setFailed(true)
      }
    })

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">status: {status}</span>
      <Button variant="ghost" size="sm" disabled={pending} onClick={() => run('reviewed')}>Reviewed</Button>
      <Button variant="ghost" size="sm" disabled={pending} onClick={() => run('dismissed')}>Dismiss</Button>
      {failed && <span className="text-xs text-destructive">failed</span>}
    </div>
  )
}
