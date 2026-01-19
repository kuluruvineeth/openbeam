"use client";

import { differenceInMinutes, format } from "date-fns";
import { useMemo } from "react";

import { cn } from "../../utils/cn";

interface TrackerEntry {
  id: string;
  name: string;
  startTime: Date;
  endTime?: Date;
  status: "running" | "completed" | "paused";
  color?: string;
}

interface TrackerRowProps {
  entry: TrackerEntry;
  onResume?: () => void;
  onStop?: () => void;
  onClick?: () => void;
}

function TrackerRow({ entry, onClick }: TrackerRowProps) {
  const duration = useMemo(() => {
    const end = entry.endTime || new Date();
    const minutes = differenceInMinutes(end, entry.startTime);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${minutes}m`;
  }, [entry.startTime, entry.endTime]);

  return (
    <button
      className={cn(
        "flex w-full cursor-pointer items-center gap-4 rounded-lg p-3 text-left",
        "border border-border transition-colors hover:border-border/80"
      )}
      onClick={onClick}
      type="button"
    >
      <div
        className="h-3 w-3 flex-shrink-0 rounded-full"
        style={{ backgroundColor: entry.color || "hsl(var(--primary))" }}
      />

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{entry.name}</p>
        <p className="text-muted-foreground text-xs">
          {format(entry.startTime, "h:mm a")}
          {entry.endTime && ` - ${format(entry.endTime, "h:mm a")}`}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <span
          className={cn(
            "rounded px-2 py-0.5 font-medium text-xs",
            entry.status === "running" && "bg-emerald-500/10 text-emerald-500",
            entry.status === "completed" && "bg-muted text-muted-foreground",
            entry.status === "paused" && "bg-amber-500/10 text-amber-500"
          )}
        >
          {entry.status}
        </span>

        <span className="font-mono text-sm tabular-nums">{duration}</span>
      </div>
    </button>
  );
}

export { TrackerRow };
export type { TrackerEntry, TrackerRowProps };
