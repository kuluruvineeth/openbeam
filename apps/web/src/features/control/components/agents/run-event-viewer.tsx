"use client";

import { cn } from "@/lib/utils";
import { useRunEvents } from "../../hooks/use-control-heartbeats";

type RunEventViewerProps = {
  runId: string;
};

const STREAM_COLORS: Record<string, string> = {
  stdout: "text-foreground",
  stderr: "text-red-400",
  system: "text-blue-400",
};

export function RunEventViewer({ runId }: RunEventViewerProps) {
  const { data: events, isLoading } = useRunEvents(runId);

  if (isLoading) {
    return <p className="text-muted-foreground text-xs">Loading events...</p>;
  }

  if (!events || events.length === 0) {
    return <p className="text-muted-foreground text-xs">No events recorded</p>;
  }

  return (
    <div className="max-h-80 overflow-y-auto rounded-sm bg-zinc-950 p-3 font-mono text-xs">
      {events.map((event) => (
        <div
          className={cn(
            "whitespace-pre-wrap py-px leading-relaxed",
            STREAM_COLORS[event.stream ?? "system"] ?? "text-muted-foreground"
          )}
          key={event.id}
        >
          <span className="mr-2 select-none text-zinc-600">{event.seq}</span>
          {event.message}
        </div>
      ))}
    </div>
  );
}
