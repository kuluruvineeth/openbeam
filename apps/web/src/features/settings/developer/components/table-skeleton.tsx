export function TableSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      <div className="h-4 w-48 animate-pulse rounded-sm bg-muted" />
      <div className="rounded-sm border border-border/50">
        <div className="flex items-center gap-4 border-border/50 border-b px-4 py-3">
          <div className="h-3 w-24 animate-pulse rounded-sm bg-muted" />
          <div className="h-3 w-20 animate-pulse rounded-sm bg-muted" />
          <div className="h-3 w-16 animate-pulse rounded-sm bg-muted" />
        </div>
        {Array.from({ length: rows }, (_, i) => (
          <div
            className="flex items-center gap-4 border-border/50 border-b px-4 py-3 last:border-b-0"
            key={i}
          >
            <div className="h-3 w-32 animate-pulse rounded-sm bg-muted" />
            <div className="h-3 w-24 animate-pulse rounded-sm bg-muted" />
            <div className="h-3 w-16 animate-pulse rounded-sm bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
