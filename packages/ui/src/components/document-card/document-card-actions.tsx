"use client";

import { cn } from "../../utils/cn";
import type { DocumentCardActionsProps } from "./types";

function DocumentCardActions({
  children,
  className,
}: DocumentCardActionsProps) {
  return (
    <div className={cn("flex items-center gap-2 pt-1", className)}>
      {children}
    </div>
  );
}

export { DocumentCardActions };
