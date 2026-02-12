"use client";

import { Skeleton } from "@openplane/ui";
import { missionColumns } from "./mission-columns";

const SKELETON_ROW_COUNT = 10;

function SkeletonCell({ columnId }: { columnId: string }) {
  switch (columnId) {
    case "select":
      return <Skeleton className="h-4 w-4 rounded-sm" />;
    case "name":
      return <Skeleton className="h-4 w-40" />;
    case "status":
      return <Skeleton className="h-5 w-16 rounded-full" />;
    case "agentCount":
      return <Skeleton className="ml-auto h-4 w-6" />;
    case "progress":
      return (
        <div className="ml-auto flex items-center gap-2">
          <Skeleton className="h-1.5 w-16" />
          <Skeleton className="h-3 w-10" />
        </div>
      );
    case "totalCostCents":
      return <Skeleton className="ml-auto h-4 w-14" />;
    case "updatedAt":
      return <Skeleton className="h-3 w-20" />;
    case "actions":
      return <Skeleton className="h-4 w-4 rounded-sm" />;
    default:
      return <Skeleton className="h-4 w-16" />;
  }
}

function MissionTableSkeleton() {
  return (
    <div className="w-full overflow-hidden rounded-sm border border-border/50">
      <table className="w-full border-collapse">
        <thead>
          <tr className="flex h-[45px]">
            {missionColumns.map((col) => {
              const id =
                col.id ?? (col as { accessorKey?: string }).accessorKey ?? "";
              const size = col.size ?? 120;
              return (
                <th
                  className="flex items-center border-border border-t px-3 text-left"
                  key={id}
                  style={{
                    width: size,
                    flex: id === "name" ? 1 : `0 0 ${size}px`,
                  }}
                >
                  <Skeleton className="h-3 w-12" />
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: SKELETON_ROW_COUNT }, (_, rowIndex) => (
            <tr className="flex border-border/30 border-b" key={rowIndex}>
              {missionColumns.map((col) => {
                const id =
                  col.id ?? (col as { accessorKey?: string }).accessorKey ?? "";
                const size = col.size ?? 120;
                return (
                  <td
                    className="flex h-[45px] items-center px-3"
                    key={id}
                    style={{
                      width: size,
                      flex: id === "name" ? 1 : `0 0 ${size}px`,
                    }}
                  >
                    <SkeletonCell columnId={id} />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export { MissionTableSkeleton };
