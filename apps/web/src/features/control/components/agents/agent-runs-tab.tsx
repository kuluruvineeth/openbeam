"use client";

type RunListItem = {
  id: string;
  invocationSource: string;
  status: string;
  startedAt: Date | string | null;
  finishedAt: Date | string | null;
  exitCode: number | null;
  errorCode: string | null;
  externalRunId: string | null;
  createdAt: Date | string;
};

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@openbeam/ui";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { useAgentRuns } from "../../hooks/use-control-heartbeats";
import { StatusBadge } from "../shared/status-badge";
import { RunEventViewer } from "./run-event-viewer";

type AgentRunsTabProps = {
  agentId: string;
};

export function AgentRunsTab({ agentId }: AgentRunsTabProps) {
  const { data: runs, isLoading } = useAgentRuns(agentId);
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);

  if (isLoading) {
    return <p className="text-muted-foreground text-xs">Loading runs...</p>;
  }

  if (!runs || runs.length === 0) {
    return <p className="text-muted-foreground text-xs">No runs recorded</p>;
  }

  function toggleExpand(runId: string) {
    setExpandedRunId((prev) => (prev === runId ? null : runId));
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[120px]">Status</TableHead>
          <TableHead>Source</TableHead>
          <TableHead>Started</TableHead>
          <TableHead>Duration</TableHead>
          <TableHead className="text-right">Exit</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {runs.map((run) => (
          <RunRow
            expanded={expandedRunId === run.id}
            key={run.id}
            onToggle={() => toggleExpand(run.id)}
            run={run}
          />
        ))}
      </TableBody>
    </Table>
  );
}

function RunRow({
  run,
  expanded,
  onToggle,
}: {
  run: RunListItem;
  expanded: boolean;
  onToggle: () => void;
}) {
  const duration = getDuration(run);

  return (
    <>
      <TableRow className="cursor-pointer hover:bg-muted/50" onClick={onToggle}>
        <TableCell>
          <StatusBadge domain="run" size="sm" status={run.status} />
        </TableCell>
        <TableCell className="text-xs">{run.invocationSource}</TableCell>
        <TableCell className="text-muted-foreground text-xs">
          {run.startedAt
            ? formatDistanceToNow(new Date(run.startedAt), { addSuffix: true })
            : "Pending"}
        </TableCell>
        <TableCell className="text-muted-foreground text-xs tabular-nums">
          {duration ?? "-"}
        </TableCell>
        <TableCell className="text-right text-muted-foreground text-xs tabular-nums">
          {run.exitCode ?? "-"}
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow>
          <TableCell className="p-0" colSpan={5}>
            <div className="border-border/50 border-t p-3">
              <RunEventViewer runId={run.id} />
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function getDuration(run: RunListItem): string | null {
  if (!(run.startedAt && run.finishedAt)) {
    return null;
  }
  const ms =
    new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime();
  if (ms < 1000) {
    return `${ms}ms`;
  }
  if (ms < 60_000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }
  return `${Math.round(ms / 60_000)}m`;
}
