"use client";

import { cn } from "../../utils/cn";
import type { DocumentCardMetadataProps } from "./types";

function DocumentCardMetadata({
  items,
  columns = 2,
  className,
}: DocumentCardMetadataProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "grid gap-x-6 gap-y-1.5 border-border/50 border-t pt-3",
        columns === 2 && "grid-cols-2",
        columns === 1 && "grid-cols-1",
        className
      )}
    >
      {items.map((item) => (
        <div
          className="flex items-center justify-between py-0.5"
          key={item.label}
        >
          <span className="text-muted-foreground text-xs">{item.label}</span>
          <span className="truncate text-right text-xs">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

export { DocumentCardMetadata };
