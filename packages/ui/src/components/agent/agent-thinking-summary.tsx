"use client";

import { forwardRef } from "react";
import { cn } from "../../utils/cn";
import { formatDurationPrecise } from "../../utils/format";
import { Icons } from "../icons";

type AgentThinkingSummaryProps = React.ComponentProps<"span"> & {
  durationMs?: number | null;
  hasContent?: boolean;
};

const AgentThinkingSummary = forwardRef<
  HTMLSpanElement,
  AgentThinkingSummaryProps
>(({ className, durationMs, hasContent = false, ...props }, ref) => (
  <span
    className={cn(
      "inline-flex items-center gap-1.5 text-muted-foreground text-sm",
      className
    )}
    ref={ref}
    {...props}
  >
    <Icons.Sparkles className="size-3.5 text-primary/70" />
    <span>
      {hasContent ? "Reasoned" : "Processed"}
      {durationMs != null && ` for ${formatDurationPrecise(durationMs)}`}
    </span>
  </span>
));
AgentThinkingSummary.displayName = "AgentThinkingSummary";

export { AgentThinkingSummary };
export type { AgentThinkingSummaryProps };
