import { Skeleton } from "@/components/ui/skeleton";

export function AuthLayoutSkeleton() {
  return (
    <div className="relative flex h-screen overflow-hidden">
      {/* Sidebar skeleton */}
      <aside className="fixed top-0 z-50 hidden h-screen w-[70px] shrink-0 border-border border-r bg-background md:flex">
        <div className="flex w-full flex-col items-center justify-between pt-4 pb-4">
          <div className="space-y-4">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </aside>

      {/* Main content skeleton */}
      <div className="flex flex-1 flex-col md:ml-[70px]">
        {/* Header skeleton */}
        <header className="flex h-[70px] shrink-0 items-center justify-end border-b bg-background px-6">
          <Skeleton className="h-8 w-8 rounded-full" />
        </header>

        {/* Content skeleton */}
        <div className="flex-1 space-y-4 p-6">
          <Skeleton className="h-8 w-[200px]" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    </div>
  );
}
