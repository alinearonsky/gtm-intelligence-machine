export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">
      {message}
    </div>
  )
}
