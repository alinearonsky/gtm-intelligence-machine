import { getRules, getLens, getRoles } from '@/lib/ontology'
import { Badge } from '@/components/ui/badge'
import { signalTypeLabel, stageLabel, priorityLabel } from '@/lib/humanize'
import type { PriorityT } from '@gtm/core'

export default function HowMatchingWorksPage() {
  const rules = getRules()
  const lens = getLens('tt')
  const roles = getRoles()

  return (
    <main className="mx-auto max-w-3xl space-y-10 p-6">
      <div className="space-y-2">
        <h1 className="text-xl font-semibold tracking-tight">How matching works</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          This tool watches healthtech companies&apos; public job postings and flags the ones
          showing signs they may need {lens.label}. It doesn&apos;t guess — every company is
          scored by the fixed rules below, so you can always see exactly why something was flagged.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          What you&apos;re selling — {lens.label}
        </h2>
        <div className="space-y-3 rounded-lg border bg-card p-4">
          <p className="text-sm leading-relaxed">
            A company matters more to you the closer it is to actively building
            clinical-terminology capability. Here&apos;s how each kind of signal maps to what you
            should do:
          </p>
          <ul className="space-y-1.5 text-sm">
            {lens.rules.map((lr, i) => (
              <li key={i} className="flex flex-wrap items-baseline gap-2">
                <span className="font-medium">{priorityLabel(lr.priority as PriorityT)}</span>
                <span className="text-muted-foreground">
                  when a company shows{' '}
                  {lr.signal_types.map((t) => signalTypeLabel(t)).join(', ').toLowerCase()}
                  {lr.min_strength > 1 && ` (strength ${lr.min_strength}+)`}
                  {lr.segments?.length ? ' in a core segment' : ''}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
          Coming soon: point this at your own website and product docs to auto-tune what counts as
          a good-fit buyer, instead of the hand-written lens above.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          The {rules.rules.length} signals it looks for
        </h2>
        {rules.rules.map((r) => (
          <div key={r.id} className="space-y-2 rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold">{r.title}</h3>
              <div className="flex shrink-0 gap-2 text-xs">
                <Badge variant="secondary">{signalTypeLabel(r.signal_type)}</Badge>
                <Badge variant="outline">{stageLabel(r.stage)}</Badge>
                <Badge variant="outline">strength {r.strength}/5</Badge>
              </div>
            </div>
            <p className="text-sm leading-relaxed">{r.rationale}</p>
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground">
                See the exact condition (for engineers)
              </summary>
              <pre className="mt-2 overflow-x-auto rounded bg-muted p-2 font-mono text-[11px]">{JSON.stringify(r.when, null, 2)}</pre>
            </details>
          </div>
        ))}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Roles it recognizes
        </h2>
        <p className="text-sm text-muted-foreground">
          The job titles the scanner treats as clinical-terminology-relevant when it reads a posting.
        </p>
        <ul className="flex flex-wrap gap-2 pt-1">
          {roles.roles.map((r) => (
            <li key={r.id}>
              <Badge variant="outline" className="font-normal">{r.label}</Badge>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
