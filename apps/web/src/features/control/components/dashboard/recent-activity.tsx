"use client";

import type { ControlActivityLog } from "@openbeam/types/control";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

type RecentActivityProps = {
  entries: ControlActivityLog[];
};

export function RecentActivity({ entries }: RecentActivityProps) {
  return (
    <div className="space-y-3">
      <h2 className="font-medium text-sm">Recent Activity</h2>
      {entries.length === 0 ? (
        <p className="py-4 text-center text-muted-foreground text-xs">
          No recent activity
        </p>
      ) : (
        <div className="space-y-0.5">
          {entries.slice(0, 8).map((entry) => (
            <ActivityRow entry={entry} key={entry.id} />
          ))}
        </div>
      )}
    </div>
  );
}

function ActivityRow({ entry }: { entry: ControlActivityLog }) {
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-sm px-2 py-1.5",
        "transition-colors hover:bg-muted/50"
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">
          <span className="font-medium">{entry.actorType}</span>{" "}
          <span className="text-muted-foreground">{entry.action}</span>{" "}
          <span>{entry.entityType}</span>
        </p>
      </div>
      <span className="shrink-0 pl-3 text-muted-foreground text-xs">
        {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
      </span>
    </div>
  );
}
