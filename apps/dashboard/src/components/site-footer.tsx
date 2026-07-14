// Primary nav now lives in the left rail (app-sidebar). The footer is a quiet
// signature line only.
export function SiteFooter() {
  return (
    <footer className="mt-8 border-t">
      <div className="flex flex-wrap items-center gap-3 px-8 py-4 text-xs text-muted-foreground">
        <span>GTM Intelligence — hiring-signal timing for healthtech go-to-market.</span>
      </div>
    </footer>
  )
}
