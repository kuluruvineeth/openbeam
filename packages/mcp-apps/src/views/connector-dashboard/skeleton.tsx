function SkeletonRow() {
  return (
    <div className="grid grid-cols-[1fr_80px_100px_80px] items-center gap-2 border-border/50 border-b px-3 py-2.5 last:border-b-0">
      <div className="flex items-center gap-2.5">
        <div className="h-6 w-6 shrink-0 animate-pulse rounded-sm bg-muted" />
        <div className="h-3.5 w-28 animate-pulse rounded-sm bg-muted" />
      </div>
      <div className="flex items-center gap-1.5">
        <div className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-muted" />
        <div className="h-3 w-10 animate-pulse rounded-sm bg-muted" />
      </div>
      <div className="h-3 w-14 animate-pulse rounded-sm bg-muted" />
      <div className="ml-auto h-3 w-8 animate-pulse rounded-sm bg-muted" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div>
      <div className="flex items-center gap-2 pb-3">
        <div className="h-4 w-20 animate-pulse rounded-sm bg-muted" />
        <div className="h-4 w-6 animate-pulse rounded-sm bg-muted" />
      </div>
      <div className="rounded-md border border-border/50">
        <div className="grid grid-cols-[1fr_80px_100px_80px] gap-2 border-border/50 border-b px-3 py-1.5">
          <div className="h-3 w-12 animate-pulse rounded-sm bg-muted" />
          <div className="h-3 w-10 animate-pulse rounded-sm bg-muted" />
          <div className="h-3 w-14 animate-pulse rounded-sm bg-muted" />
          <div className="ml-auto h-3 w-8 animate-pulse rounded-sm bg-muted" />
        </div>
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
      </div>
    </div>
  );
}
