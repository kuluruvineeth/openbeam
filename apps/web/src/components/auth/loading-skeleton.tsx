import { Skeleton } from "@openplane/ui";

export function AuthLayoutSkeleton() {
  return (
    <div className="relative flex h-screen overflow-hidden">
      <div className="flex flex-1 flex-col">
        <header className="flex h-[70px] shrink-0 items-center justify-end border-b bg-background px-6">
          <Skeleton className="h-8 w-8 rounded-full" />
        </header>

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
