"use client";

import { Badge, Button, Skeleton } from "@openbeam/ui";
import { formatRelativeTime } from "@openbeam/ui/utils/format";
import { Icons } from "@/components/icons";
import {
  useComputerAgent,
  useComputerRuns,
  useTriggerRun,
  useUpdateAgent,
} from "../hooks/use-computer";

const RUN_STATUS_STYLES: Record<string, string> = {
  COMPLETED: "text-emerald-600",
  FAILED: "text-destructive",
  RUNNING: "text-amber-600",
  PENDING: "text-muted-foreground",
  WAITING_APPROVAL: "text-violet-600",
};

export function ComputerDetailView({ agentId }: { agentId: string }) {
  const { data: agent, isLoading: agentLoading } = useComputerAgent(agentId);
  const { data: runs, isLoading: runsLoading } = useComputerRuns(agentId);
  const triggerRun = useTriggerRun();
  const updateAgent = useUpdateAgent();

  if (agentLoading) {
    return <DetailSkeleton />;
  }

  if (!agent) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
        Agent not found
      </div>
    );
  }

  const isActive = agent.status === "ACTIVE";

  return (
    <div className="mx-auto max-w-4xl space-y-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-medium text-xl">{agent.name}</h1>
          {agent.description && (
            <p className="text-muted-foreground text-sm">{agent.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            disabled={triggerRun.isPending || !isActive}
            onClick={() => triggerRun.mutate({ agentId })}
            size="sm"
            variant="outline"
          >
            <Icons.Play size={14} />
            Run Now
          </Button>
          <Button
            disabled={updateAgent.isPending}
            onClick={() =>
              updateAgent.mutate({
                agentId,
                status: isActive ? "PAUSED" : "ACTIVE",
              })
            }
            size="sm"
            variant="outline"
          >
            {isActive ? (
              <>
                <Icons.Pause size={14} />
                Pause
              </>
            ) : (
              <>
                <Icons.Play size={14} />
                Activate
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4 text-muted-foreground text-xs">
        <Badge variant="outline">{agent.status.toLowerCase()}</Badge>
        <span>{agent.mode.toLowerCase().replace("_", " ")}</span>
        {agent.scheduleCron && (
          <span className="flex items-center gap-1">
            <Icons.ClockIcon size={12} />
            {agent.scheduleCron}
          </span>
        )}
      </div>

      <div className="space-y-3">
        <h2 className="font-medium text-sm">Run History</h2>
        <RunList isLoading={runsLoading} runs={runs} />
      </div>
    </div>
  );
}

function RunList({
  runs,
  isLoading,
}: {
  runs:
    | Array<{
        id: string;
        status: string;
        summary: string | null;
        error: string | null;
        toolCallCount: number;
        llmCallCount: number;
        completedAt: Date | null;
        createdAt: Date;
      }>
    | undefined;
  isLoading: boolean;
}) {
  if (isLoading) {
    return <RunsSkeleton />;
  }

  if (!runs || runs.length === 0) {
    return <p className="text-muted-foreground text-xs">No runs yet</p>;
  }

  return (
    <div className="space-y-1">
      {runs.map((run) => (
        <RunRow key={run.id} run={run} />
      ))}
    </div>
  );
}

function RunRow({
  run,
}: {
  run: {
    id: string;
    status: string;
    summary: string | null;
    error: string | null;
    toolCallCount: number;
    llmCallCount: number;
    completedAt: Date | null;
    createdAt: Date;
  };
}) {
  const statusColor = RUN_STATUS_STYLES[run.status] ?? "text-muted-foreground";

  return (
    <div className="flex items-center gap-3 rounded-sm border border-border/30 px-3 py-2 text-xs">
      <span className={`font-medium ${statusColor}`}>
        {run.status.toLowerCase().replace("_", " ")}
      </span>
      <span className="flex-1 truncate text-muted-foreground">
        {run.summary ?? run.error ?? "\u2014"}
      </span>
      <span className="text-muted-foreground/60">
        {run.toolCallCount} tools
      </span>
      <span className="text-muted-foreground/60">
        {run.completedAt
          ? formatRelativeTime(new Date(run.completedAt))
          : formatRelativeTime(new Date(run.createdAt))}
      </span>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 py-8">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-96" />
      </div>
      <RunsSkeleton />
    </div>
  );
}

function RunsSkeleton() {
  return (
    <div className="space-y-1">
      {Array.from({ length: 5 }, (_, i) => (
        <Skeleton
          className="h-10 w-full"
          key={`run-skeleton-${i.toString()}`}
        />
      ))}
    </div>
  );
}
