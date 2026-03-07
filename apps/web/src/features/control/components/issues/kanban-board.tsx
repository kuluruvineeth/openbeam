"use client";

import { KANBAN_COLUMNS } from "../../constants";
import { EmptyState } from "../shared/empty-state";
import { KanbanColumn } from "./kanban-column";

type Issue = {
  id: string;
  identifier: string | null;
  title: string;
  status: string;
  priority: string;
  assigneeAgentId?: string | null;
};

type KanbanBoardProps = {
  issues: Issue[];
  onCreateClick?: () => void;
};

export function KanbanBoard({ issues, onCreateClick }: KanbanBoardProps) {
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

  const grouped = new Map<string, Issue[]>();
  for (const col of KANBAN_COLUMNS) {
    grouped.set(col, []);
  }
  for (const issue of issues) {
    const column = grouped.get(issue.status);
    if (column) {
      column.push(issue);
    }
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {KANBAN_COLUMNS.map((status) => (
        <KanbanColumn
          issues={grouped.get(status) ?? []}
          key={status}
          status={status}
        />
      ))}
    </div>
  );
}
