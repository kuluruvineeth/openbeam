"use client";

import { cva } from "class-variance-authority";
import { memo, useState } from "react";
import type { MemoryEntry, MemoryScope } from "../hooks/use-memory";
import { MemoryValueDisplay } from "./memory-value-display";

const scopeBadgeVariants = cva(
  "inline-flex items-center rounded-sm px-1.5 py-0.5 font-medium text-[10px]",
  {
    variants: {
      scope: {
        mission: "bg-primary/10 text-primary",
        agent: "bg-amber-500/10 text-amber-600",
        task: "bg-muted text-muted-foreground",
        all: "bg-muted text-muted-foreground",
      },
    },
  }
);

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

type TimelineEntryProps = {
  entry: MemoryEntry;
};

const TimelineEntry = memo(function TimelineEntryInner({
  entry,
}: TimelineEntryProps) {
  const [expanded, setExpanded] = useState(false);
  const timestamp = timeFormatter.format(new Date(entry.updatedAt));

  return (
    <div className="relative flex gap-3 pb-4 pl-4">
      <div className="absolute top-1.5 left-0 h-2 w-2 rounded-full bg-border" />

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="shrink-0 font-mono text-muted-foreground text-xs tabular-nums">
            {timestamp}
          </span>
          <span className="text-xs">
            <span className="font-medium">{entry.updatedBy}</span>
            {" wrote "}
            <span className="font-medium font-mono">"{entry.key}"</span>
          </span>
          <span
            className={scopeBadgeVariants({
              scope: entry.scope as Exclude<MemoryScope, "all">,
            })}
          >
            {entry.scope}
          </span>
        </div>

        <button
          className="mt-1 w-full text-left"
          onClick={() => setExpanded((prev) => !prev)}
          type="button"
        >
          {expanded ? (
            <div className="rounded-sm border border-border/50 bg-muted/20 p-2">
              <MemoryValueDisplay value={entry.value} />
            </div>
          ) : (
            <p className="truncate text-muted-foreground text-xs">
              {typeof entry.value === "string"
                ? entry.value
                : JSON.stringify(entry.value)}
            </p>
          )}
        </button>
      </div>
    </div>
  );
});

type MemoryTimelineProps = {
  entries: MemoryEntry[];
};

export function MemoryTimeline({ entries }: MemoryTimelineProps) {
  const sorted = [...entries].sort((a, b) => b.updatedAt - a.updatedAt);

  if (sorted.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
        No memory entries found
      </div>
    );
  }

  return (
    <div className="relative border-border/50 border-l pl-2">
      {sorted.map((entry) => (
        <TimelineEntry entry={entry} key={entry.key} />
      ))}
    </div>
  );
}
