import { Skeleton } from "@/components/ui/skeleton";

export function DataSourcesHeaderSkeleton() {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-96" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        {[...new Array(4)].map((_, i) => (
          <div className="border border-border bg-background p-4" key={i}>
            <div className="flex items-center justify-between">
              <div>
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-2 h-8 w-16" />
              </div>
              <Skeleton className="size-10" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DataSourcesTableSkeleton() {
  return (
    <div className="border border-border bg-background">
      <div className="border-b border-b-border p-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="ml-auto h-4 w-24" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
      {[...new Array(5)].map((_, i) => (
        <div className="border-b border-b-border p-4 last:border-b-0" key={i}>
          <div className="flex items-center gap-4">
            <Skeleton className="h-4 w-4" />
            <div className="flex items-center gap-3">
              <Skeleton className="size-8 rounded" />
              <div>
                <Skeleton className="h-4 w-32" />
                <Skeleton className="mt-1 h-3 w-20" />
              </div>
            </div>
            <Skeleton className="ml-auto h-6 w-24" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
      ))}
    </div>
  );
}
