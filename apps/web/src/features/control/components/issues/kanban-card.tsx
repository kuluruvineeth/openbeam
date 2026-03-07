"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { AgentAvatar } from "../shared/agent-avatar";
import { PriorityBadge } from "../shared/priority-badge";

type KanbanCardProps = {
  issue: {
    id: string;
    identifier: string | null;
    title: string;
    priority: string;
    assigneeAgentId?: string | null;
  };
  className?: string;
};

export function KanbanCard({ issue, className }: KanbanCardProps) {
  return (
    <Link
      className={cn(
        "block rounded-sm border border-border/50 p-3 transition-colors hover:border-border hover:bg-muted/30",
        className
      )}
      href={`/control/issues/${issue.id}`}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <span className="font-mono text-[10px] text-muted-foreground">
          {issue.identifier ?? issue.id.slice(0, 8)}
        </span>
        <PriorityBadge
          priority={issue.priority as "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"}
          size="sm"
        />
      </div>
      <p className="line-clamp-2 text-sm leading-snug">{issue.title}</p>
      {issue.assigneeAgentId && (
        <div className="mt-2 flex items-center gap-1.5">
          <AgentAvatar
            name={issue.assigneeAgentId.slice(0, 8)}
            showStatus={false}
            size="sm"
          />
          <span className="truncate text-muted-foreground text-xs">
            {issue.assigneeAgentId.slice(0, 8)}
          </span>
        </div>
      )}
    </Link>
  );
}
