"use client";

import { cn } from "../../utils/cn";
import type { DocumentCardContentProps } from "./types";

function DocumentCardContent({
  children,
  maxLines,
  className,
}: DocumentCardContentProps) {
  return (
    <div
      className={cn(
        "rounded-sm bg-muted/30 p-3 text-muted-foreground text-sm",
        maxLines && `line-clamp-${maxLines}`,
        className
      )}
    >
      {children}
    </div>
  );
}

export { DocumentCardContent };
