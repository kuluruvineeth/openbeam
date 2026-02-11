"use client";

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
  "flex cursor-pointer items-center gap-2 rounded-sm border px-2 py-1.5 text-xs transition-colors",
  {
    variants: {
      status: {
        idle: "border-border/30 bg-card hover:bg-muted/50",
        running: "border-primary/30 bg-primary/5 hover:bg-primary/10",
        blocked: "border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10",
        completed: "border-emerald-500/30 bg-emerald-500/5",
        failed: "border-destructive/30 bg-destructive/5",
      },
    },
    defaultVariants: { status: "idle" },
  }
);

const STATUS_DOT_CLASSES: Record<AgentStatus, string> = {
  idle: "bg-muted-foreground",
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

  return (
    <button
      className={agentMiniCardVariants({ status: resolved })}
      onClick={onClick}
      type="button"
    >
      <span
        className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT_CLASSES[resolved]}`}
      />
      <span className="truncate font-medium">{name}</span>
      <span className="ml-auto shrink-0 text-muted-foreground">{role}</span>
    </button>
  );
}

export { agentMiniCardVariants };
