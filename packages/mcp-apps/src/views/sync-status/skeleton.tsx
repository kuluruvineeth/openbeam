import { Bone } from "../../shared/loading-skeleton";

function RowSkeleton() {
  return (
    <div className="flex flex-col gap-2 border-border/50 border-b p-3 last:border-b-0">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <Bone className="h-5 w-5 shrink-0" />
          <Bone className="h-3.5 w-36" />
        </div>
        <Bone className="h-5 w-16" />
      </div>
      <Bone className="h-1.5 w-full rounded-full" />
      <div className="flex items-center gap-3">
        <Bone className="h-3 w-20" />
        <Bone className="h-3 w-24" />
      </div>
    </div>
  );
}

export function SyncStatusSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Bone className="h-4 w-32" />
      <div className="flex flex-col rounded-sm border border-border/50">
        <RowSkeleton />
        <RowSkeleton />
        <RowSkeleton />
      </div>
    </div>
  );
}
