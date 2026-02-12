"use client";

import { Icons } from "@openplane/ui";
import { cva } from "class-variance-authority";

const AGENT_STATUSES = [
  "idle",
  "running",
  "blocked",
  "completed",
  "failed",
] as const;
type AgentStatus = (typeof AGENT_STATUSES)[number];

const agentMiniCardVariants = cva(
  "flex cursor-pointer items-center gap-1.5 rounded-sm border px-2 py-1 text-xs transition-colors duration-100",
  {
    variants: {
      status: {
        idle: "border-border/40 hover:bg-muted/30 dark:border-[#1d1d1d] dark:hover:bg-[#0f0f0f]",
        running:
          "border-primary/20 hover:bg-primary/[0.04] dark:border-primary/15",
        blocked:
          "border-amber-500/20 hover:bg-amber-500/[0.04] dark:border-amber-500/15",
        completed:
          "border-border/40 hover:bg-muted/30 dark:border-[#1d1d1d] dark:hover:bg-[#0f0f0f]",
        failed:
          "border-destructive/20 hover:bg-destructive/[0.04] dark:border-destructive/15",
      },
    },
    defaultVariants: { status: "idle" },
  }
);

const STATUS_DOT_CLASSES: Record<AgentStatus, string> = {
  idle: "bg-muted-foreground/50",
  running: "bg-primary animate-pulse",
  blocked: "bg-amber-500",
  completed: "bg-emerald-500",
  failed: "bg-destructive",
};

function resolveAgentStatus(raw: string): AgentStatus {
  return (AGENT_STATUSES as readonly string[]).includes(raw)
    ? (raw as AgentStatus)
    : "idle";
}

type AgentMiniCardProps = {
  name: string;
  role: string;
  status: string;
  onClick?: () => void;
};

export function AgentMiniCard({
  name,
  role,
  status,
  onClick,
}: AgentMiniCardProps) {
  const resolved = resolveAgentStatus(status);
  const isCoordinator = role.toLowerCase() === "coordinator";

  return (
    <button
      className={agentMiniCardVariants({ status: resolved })}
      onClick={onClick}
      type="button"
    >
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT_CLASSES[resolved]}`}
      />
      <span className="truncate font-medium">{name}</span>
      {isCoordinator && (
        <Icons.Star className="ml-auto shrink-0 text-primary/60" size={10} />
      )}
    </button>
  );
}

export { agentMiniCardVariants };
