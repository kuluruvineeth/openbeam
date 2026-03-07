"use client";

import type { ControlIssueStatus } from "@openbeam/types/control";
import { cn } from "@/lib/utils";
import { ISSUE_STATUS_META } from "../../constants";
import { KanbanCard } from "./kanban-card";

type Issue = {
  id: string;
  identifier: string | null;
  title: string;
  priority: string;
  assigneeAgentId?: string | null;
};

type KanbanColumnProps = {
  status: ControlIssueStatus;
  issues: Issue[];
  className?: string;
};

export function KanbanColumn({ status, issues, className }: KanbanColumnProps) {
  const meta = ISSUE_STATUS_META[status];

  return (
    <div className={cn("flex w-64 shrink-0 flex-col", className)}>
      <div className="mb-2 flex items-center gap-2 px-1">
        <span className={cn("size-2 rounded-full", meta.dotColor)} />
        <span className="font-medium text-xs">{meta.label}</span>
        <span className="text-muted-foreground text-xs">{issues.length}</span>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto">
        {issues.map((issue) => (
          <KanbanCard issue={issue} key={issue.id} />
        ))}
      </div>
    </div>
  );
}
