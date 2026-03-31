import { Bone } from "../../shared/loading-skeleton";

function StatSkeleton() {
  return (
    <div className="flex flex-col gap-1 rounded-sm border border-border/50 p-2.5">
      <Bone className="h-3 w-16" />
      <Bone className="h-5 w-10" />
    </div>
  );
}

function RowSkeleton() {
  return (
    <div className="grid grid-cols-[1fr_100px_100px_60px] items-center gap-3 border-border/50 border-b px-3 py-2.5 last:border-b-0">
      <div className="flex items-center gap-2.5">
        <Bone className="size-5.5 shrink-0" />
        <Bone className="h-3.5 w-28" />
      </div>
      <div className="flex items-center gap-1.5">
        <Bone className="size-1.5 shrink-0 rounded-full" />
        <Bone className="h-3 w-10" />
      </div>
      <Bone className="h-3 w-14" />
      <Bone className="ml-auto h-3 w-8" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-2">
        <StatSkeleton />
        <StatSkeleton />
        <StatSkeleton />
      </div>
      <Bone className="h-4 w-24" />
      <div className="rounded-sm border border-border/50">
        <div className="grid grid-cols-[1fr_100px_100px_60px] gap-3 border-border/50 border-b px-3 py-1.5">
          <Bone className="h-3 w-12" />
          <Bone className="h-3 w-10" />
          <Bone className="h-3 w-14" />
          <Bone className="ml-auto h-3 w-8" />
        </div>
        <RowSkeleton />
        <RowSkeleton />
        <RowSkeleton />
        <RowSkeleton />
      </div>
    </div>
  );
}
