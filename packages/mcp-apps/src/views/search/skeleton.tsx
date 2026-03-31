import { Bone } from "../../shared/loading-skeleton";

function CardSkeleton() {
  return (
    <div className="flex gap-3 rounded-sm border border-border/50 p-3">
      <Bone className="h-5 w-5 shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <Bone className="h-3.5 w-3/4" />
        <Bone className="h-3 w-full" />
        <Bone className="h-3 w-5/6" />
        <div className="flex items-center gap-2 pt-1">
          <Bone className="h-3 w-12" />
          <Bone className="h-3 w-8" />
          <Bone className="h-3 w-16" />
        </div>
      </div>
    </div>
  );
}

export function SearchSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Bone className="h-4 w-48" />
      <div className="flex flex-col gap-1.5 pt-1">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
}
