"use client";

import { cn } from "@openbeam/ui";

export function ConnectionStatusIndicator({
  connected,
  className,
}: {
  connected: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs", className)}>
      <span
        className={cn(
          "inline-block size-1.5 rounded-full",
          connected ? "bg-emerald-500" : "bg-destructive"
        )}
      />
      <span className="text-muted-foreground">
        {connected ? "Connected" : "Disconnected"}
      </span>
    </span>
  );
}
