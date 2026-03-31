import { Bone } from "../../shared/loading-skeleton";

function RowSkeleton() {
  return (
    <div className="flex items-start gap-3 px-3 py-2.5">
      <Bone className="size-7 shrink-0" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-center gap-2">
          <Bone className="h-2.5 w-16" />
          <Bone className="h-2.5 w-20" />
          <Bone className="ml-auto h-2.5 w-12" />
        </div>
        <Bone className="h-3.5 w-3/4" />
        <div className="flex items-center gap-1.5">
          <Bone className="size-4 rounded-full" />
          <Bone className="h-2.5 w-20" />
          <Bone className="h-2.5 w-24" />
        </div>
        <Bone className="h-3 w-full" />
        <Bone className="h-3 w-4/5" />
      </div>
    </div>
  );
}

export function SearchSkeleton() {
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 px-3 pb-2">
        <Bone className="h-2.5 w-14" />
        <Bone className="h-2.5 w-6" />
      </div>
      <div className="flex flex-col divide-y divide-border/30">
        <RowSkeleton />
        <RowSkeleton />
        <RowSkeleton />
        <RowSkeleton />
      </div>
    </div>
  );
}
