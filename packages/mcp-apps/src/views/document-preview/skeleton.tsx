export function PreviewSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="h-6 w-6 shrink-0 animate-pulse rounded-sm bg-muted" />
        <div className="h-5 w-12 animate-pulse rounded-sm bg-muted" />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="h-4.5 w-3/4 animate-pulse rounded-sm bg-muted" />
        <div className="h-3 w-2/5 animate-pulse rounded-sm bg-muted" />
      </div>

      <div className="flex flex-col gap-2 rounded-sm bg-muted/30 p-3">
        <div className="h-3.5 w-full animate-pulse rounded-sm bg-muted" />
        <div className="h-3.5 w-[95%] animate-pulse rounded-sm bg-muted" />
        <div className="h-3.5 w-[88%] animate-pulse rounded-sm bg-muted" />
        <div className="h-3.5 w-[92%] animate-pulse rounded-sm bg-muted" />
        <div className="h-3.5 w-3/5 animate-pulse rounded-sm bg-muted" />
      </div>

      <div className="grid grid-cols-2 gap-x-6 border-border/50 border-t pt-2">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between py-1">
            <div className="h-3 w-14 animate-pulse rounded-sm bg-muted" />
            <div className="h-3 w-20 animate-pulse rounded-sm bg-muted" />
          </div>
          <div className="flex items-center justify-between py-1">
            <div className="h-3 w-14 animate-pulse rounded-sm bg-muted" />
            <div className="h-3 w-20 animate-pulse rounded-sm bg-muted" />
          </div>
          <div className="flex items-center justify-between py-1">
            <div className="h-3 w-14 animate-pulse rounded-sm bg-muted" />
            <div className="h-3 w-20 animate-pulse rounded-sm bg-muted" />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between py-1">
            <div className="h-3 w-14 animate-pulse rounded-sm bg-muted" />
            <div className="h-3 w-20 animate-pulse rounded-sm bg-muted" />
          </div>
          <div className="flex items-center justify-between py-1">
            <div className="h-3 w-14 animate-pulse rounded-sm bg-muted" />
            <div className="h-3 w-20 animate-pulse rounded-sm bg-muted" />
          </div>
        </div>
      </div>

      <div className="h-8 w-full animate-pulse rounded-sm bg-muted" />
    </div>
  );
}
