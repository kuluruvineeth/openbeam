"use client";

import { cn } from "../../utils/cn";
import type { DocumentCardRootProps } from "./types";

function DocumentCardRoot({
  variant = "compact",
  isLoading,
  error,
  children,
  className,
}: DocumentCardRootProps) {
  if (error) {
    return (
      <div
        className={cn("rounded-sm border border-destructive/30 p-4", className)}
      >
        <p className="text-destructive text-sm">{error}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div
        className={cn(
          "flex flex-col gap-3 rounded-sm border border-border/50 p-4",
          className
        )}
      >
        <div className="h-5 w-3/4 animate-pulse rounded-sm bg-muted" />
        <div className="h-4 w-1/2 animate-pulse rounded-sm bg-muted" />
        <div className="space-y-2">
          <div className="h-3.5 w-full animate-pulse rounded-sm bg-muted" />
          <div className="h-3.5 w-[90%] animate-pulse rounded-sm bg-muted" />
          <div className="h-3.5 w-3/5 animate-pulse rounded-sm bg-muted" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-3",
        variant === "compact" && "rounded-sm border border-border/50 p-4",
        variant === "panel" && "rounded-md p-6",
        className
      )}
    >
      {children}
    </div>
  );
}

export { DocumentCardRoot };
