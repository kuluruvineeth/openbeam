"use client";

import { Skeleton } from "@openplane/ui";
import { SKELETON_COLUMNS } from "./mission-columns";

const SKELETON_ROW_COUNT = 8;

function SkeletonCell({ columnId }: { columnId: string }) {
  switch (columnId) {
    case "select":
      return <Skeleton className="h-4 w-4 rounded-sm" />;
    case "name":
      return (
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-32" />
        </div>
      );
    case "status":
      return <Skeleton className="h-5 w-16 rounded-full" />;
    case "agents":
      return <Skeleton className="ml-auto h-4 w-8" />;
    case "progress":
      return (
        <div className="ml-auto flex items-center gap-2">
          <Skeleton className="h-2 w-20" />
          <Skeleton className="h-3 w-12" />
        </div>
      );
    case "cost":
      return <Skeleton className="ml-auto h-4 w-16" />;
    case "updated":
      return <Skeleton className="h-3 w-20" />;
    case "actions":
      return <Skeleton className="h-4 w-4" />;
    default:
      return <Skeleton className="h-4 w-16" />;
  }
}

function MissionTableSkeleton() {
  return (
    <div className="w-full">
      <table className="w-full border-collapse">
        <thead>
          <tr className="flex">
            {SKELETON_COLUMNS.map((col) => (
              <th
                className="flex h-10 items-center border-border/50 border-b px-3 text-left"
                key={col.id}
                style={{
                  width: col.width === 0 ? undefined : col.width,
                  flex: col.width === 0 ? 1 : undefined,
                }}
              >
                <Skeleton className="h-3 w-12" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: SKELETON_ROW_COUNT }, (_, rowIndex) => (
            <tr className="flex border-border/30 border-b" key={rowIndex}>
              {SKELETON_COLUMNS.map((col) => (
                <td
                  className="flex h-[52px] items-center px-3"
                  key={col.id}
                  style={{
                    width: col.width === 0 ? undefined : col.width,
                    flex: col.width === 0 ? 1 : `0 0 ${col.width}px`,
                  }}
                >
                  <SkeletonCell columnId={col.id} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export { MissionTableSkeleton };
