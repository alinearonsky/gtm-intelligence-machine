import { getRules, getLens, getRoles } from '@/lib/ontology'
import { Badge } from '@/components/ui/badge'

export default function OntologyPage() {
  const rules = getRules()
  const lens = getLens('tt')
  const roles = getRoles()

  return (
    <main className="mx-auto max-w-3xl space-y-8 p-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Ontology</h1>
        <p className="text-sm text-muted-foreground">
          The {rules.rules.length} deterministic domain rules this machine reasons with (v{rules.version}).
        </p>
      </div>

      <section className="space-y-4">
        {rules.rules.map((r) => (
          <div key={r.id} className="rounded-lg border bg-card p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-baseline gap-2">
                <h3 className="font-semibold">{r.title}</h3>
                <span className="font-mono text-[11px] text-muted-foreground">{r.id}</span>
              </div>
              <div className="flex gap-2 text-xs">
                <Badge variant="secondary">{r.signal_type}</Badge>
                <Badge variant="outline">{r.stage}</Badge>
                <Badge variant="outline">strength {r.strength}</Badge>
              </div>
            </div>
            <p className="text-sm">{r.rationale}</p>
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground">condition DSL</summary>
              <pre className="mt-2 overflow-x-auto rounded bg-muted p-2 font-mono text-[11px]">{JSON.stringify(r.when, null, 2)}</pre>
            </details>
          </div>
        ))}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Product lens — {lens.label}</h2>
        <ul className="space-y-1 text-sm">
          {lens.rules.map((lr, i) => (
            <li key={i}>
              <span className="font-medium">{lr.priority}</span> ← {lr.signal_types.join(', ')} (min strength {lr.min_strength})
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Role ontology</h2>
        <ul className="space-y-1 text-sm">
          {roles.roles.map((r) => <li key={r.id}><span className="font-medium">{r.label}</span></li>)}
        </ul>
      </section>
    </main>
  )
}
