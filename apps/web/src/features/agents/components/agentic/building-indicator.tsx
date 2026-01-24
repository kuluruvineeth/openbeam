"use client";

import { cn } from "@openplane/ui/utils";
import { Loader2 } from "lucide-react";

interface BuildingIndicatorProps {
  pendingCount?: number;
  className?: string;
}

export function BuildingIndicator({
  pendingCount = 0,
  className,
}: BuildingIndicatorProps) {
  return (
    <div
      className={cn(
        "absolute top-4 left-4 z-10 flex items-center gap-2 rounded-md border border-border/50 bg-background/95 px-3 py-2 shadow-sm backdrop-blur-sm",
        className
      )}
    >
      <Loader2 className="h-4 w-4 animate-spin text-primary" />
      <span className="font-medium text-sm">Building</span>
      {pendingCount > 0 && (
        <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground text-xs">
          {pendingCount} pending
        </span>
      )}
    </div>
  );
}
