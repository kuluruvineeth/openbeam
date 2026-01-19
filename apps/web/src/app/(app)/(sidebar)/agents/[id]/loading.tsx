import { Skeleton } from "@openplane/ui/components/skeleton";

export default function AgentLoading() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-border/50 border-b p-4">
        <Skeleton className="h-6 w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-20" />
        </div>
      </div>
      <div className="flex-1 p-6">
        <Skeleton className="h-full w-full rounded-md" />
      </div>
    </div>
  );
}
