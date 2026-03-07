"use client";

import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@openbeam/ui";
import { EmptyState } from "../shared/empty-state";
import { IssueRow } from "./issue-row";

type Issue = {
  id: string;
  identifier: string | null;
  title: string;
  status: string;
  priority: string;
  assigneeAgentId?: string | null;
  updatedAt: Date | string;
};

type IssuesTableProps = {
  issues: Issue[];
  onCreateClick?: () => void;
};

export function IssuesTable({ issues, onCreateClick }: IssuesTableProps) {
  if (issues.length === 0) {
    return (
      <EmptyState
        action={
          onCreateClick
            ? { label: "Create issue", onClick: onCreateClick }
            : undefined
        }
        description="No issues match the current filters."
        title="No issues found"
      />
    );
  }

  return (
    <div className="rounded-sm border border-border/50">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-24 text-xs">ID</TableHead>
            <TableHead className="text-xs">Title</TableHead>
            <TableHead className="w-28 text-xs">Status</TableHead>
            <TableHead className="w-24 text-xs">Priority</TableHead>
            <TableHead className="w-10 text-xs">Assignee</TableHead>
            <TableHead className="w-28 text-xs">Updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {issues.map((issue) => (
            <IssueRow issue={issue} key={issue.id} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
