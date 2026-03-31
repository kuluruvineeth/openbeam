import { Bone } from "../../shared/loading-skeleton";

export function PreviewSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Bone className="size-6 shrink-0" />
        <Bone className="h-5 w-12" />
      </div>

      <div className="flex flex-col gap-1.5">
        <Bone className="h-4.5 w-3/4" />
        <Bone className="h-3 w-2/5" />
      </div>

      <div className="flex flex-col gap-2 rounded-sm bg-muted/30 p-3">
        <Bone className="h-3.5 w-full" />
        <Bone className="h-3.5 w-[95%]" />
        <Bone className="h-3.5 w-[88%]" />
        <Bone className="h-3.5 w-[92%]" />
        <Bone className="h-3.5 w-3/5" />
      </div>

      <div className="grid grid-cols-2 gap-x-6 border-border/50 border-t pt-2">
        <div className="flex flex-col gap-1.5">
          {Array.from({ length: 3 }, (_, i) => (
            <div
              className="flex items-center justify-between py-1"
              key={`l-${String(i)}`}
            >
              <Bone className="h-3 w-14" />
              <Bone className="h-3 w-20" />
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-1.5">
          {Array.from({ length: 2 }, (_, i) => (
            <div
              className="flex items-center justify-between py-1"
              key={`r-${String(i)}`}
            >
              <Bone className="h-3 w-14" />
              <Bone className="h-3 w-20" />
            </div>
          ))}
        </div>
      </div>

      <Bone className="h-8 w-full" />
    </div>
  );
}
