"use client";

import type { AgentLifecycleStatus } from "@openplane/types/services/daemon";
import { cn } from "@openplane/ui";

const STATUS_CLASSES: Record<string, string> = {
  running: "bg-blue-500",
  requires_attention: "bg-emerald-500",
};

export function AgentStatusDot({
  status,
  requiresAttention,
  showInactive = false,
  className,
}: {
  status: AgentLifecycleStatus;
  requiresAttention?: boolean;
  showInactive?: boolean;
  className?: string;
}) {
  const colorClass =
    requiresAttention && status !== "running"
      ? STATUS_CLASSES.requires_attention
      : STATUS_CLASSES[status];

  if (!(colorClass || showInactive)) {
    return null;
  }

  return (
    <span
      className={cn(
        "inline-block size-2 shrink-0 rounded-full",
        colorClass ?? "border border-border/60 bg-transparent",
        className
      )}
    />
  );
}
