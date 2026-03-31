import { Bone } from "../../shared/loading-skeleton";

function CardSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-sm border border-border/50 px-3 py-2">
      <Bone className="h-8 w-8 shrink-0 rounded-full" />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <Bone className="h-3.5 w-32" />
        <Bone className="h-3 w-44" />
        <Bone className="h-3 w-36" />
      </div>
      <Bone className="h-4 w-4 shrink-0" />
    </div>
  );
}

export function PeopleSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Bone className="h-4 w-24" />
      <div className="flex flex-col gap-1.5 pt-1">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
}
