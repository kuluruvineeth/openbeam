import { Bone } from "../../shared/loading-skeleton";

function StatCardSkeleton() {
  return (
    <div className="flex flex-col gap-1.5 rounded-sm border border-border/50 p-2.5">
      <Bone className="h-3 w-12" />
      <Bone className="h-4 w-8" />
    </div>
  );
}

function MemberRowSkeleton() {
  return (
    <div className="grid grid-cols-[auto_1fr_auto_1fr] items-center gap-x-3 px-3 py-2">
      <Bone className="h-7 w-7 rounded-full" />
      <Bone className="h-3.5 w-24" />
      <Bone className="h-4 w-12 rounded-sm" />
      <Bone className="h-3 w-32" />
    </div>
  );
}

export function TeamSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-2">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      <div>
        <Bone className="mb-2 h-4 w-20" />
        <div className="divide-y divide-border/50 rounded-sm border border-border/50">
          <MemberRowSkeleton />
          <MemberRowSkeleton />
          <MemberRowSkeleton />
          <MemberRowSkeleton />
        </div>
      </div>
    </div>
  );
}
