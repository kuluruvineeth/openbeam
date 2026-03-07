"use client";

import { TableCell, TableRow } from "@openbeam/ui";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { AgentAvatar } from "../shared/agent-avatar";
import { PriorityBadge } from "../shared/priority-badge";
import { StatusBadge } from "../shared/status-badge";

type IssueRowProps = {
  issue: {
    id: string;
    identifier: string | null;
    title: string;
    status: string;
    priority: string;
    assigneeAgentId?: string | null;
    updatedAt: Date | string;
  };
  className?: string;
};

export function IssueRow({ issue, className }: IssueRowProps) {
  return (
    <TableRow className={cn("group", className)}>
      <TableCell className="w-24 font-mono text-muted-foreground text-xs">
        <Link
          className="transition-colors hover:text-foreground"
          href={`/control/issues/${issue.id}`}
        >
          {issue.identifier ?? issue.id.slice(0, 8)}
        </Link>
      </TableCell>
      <TableCell>
        <Link
          className="font-medium text-sm hover:underline"
          href={`/control/issues/${issue.id}`}
        >
          {issue.title}
        </Link>
      </TableCell>
      <TableCell className="w-28">
        <StatusBadge domain="issue" size="sm" status={issue.status} />
      </TableCell>
      <TableCell className="w-24">
        <PriorityBadge
          priority={issue.priority as "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"}
          size="sm"
        />
      </TableCell>
      <TableCell className="w-10">
        {issue.assigneeAgentId && (
          <AgentAvatar
            name={issue.assigneeAgentId.slice(0, 8)}
            showStatus={false}
            size="sm"
          />
        )}
      </TableCell>
      <TableCell className="w-28 text-muted-foreground text-xs">
        {formatDistanceToNow(new Date(issue.updatedAt), { addSuffix: true })}
      </TableCell>
    </TableRow>
  );
}
