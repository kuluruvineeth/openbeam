"use client";

import { Sparkles } from "lucide-react";
import { forwardRef } from "react";
import { cn } from "../../utils/cn";
import { formatDuration } from "./agent-duration";

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
    <Sparkles className="size-3.5 text-primary/70" />
    <span>
      {hasContent ? "Reasoned" : "Processed"}
      {durationMs != null && ` for ${formatDuration(durationMs)}`}
    </span>
  </span>
));
AgentThinkingSummary.displayName = "AgentThinkingSummary";

export { AgentThinkingSummary };
export type { AgentThinkingSummaryProps };
