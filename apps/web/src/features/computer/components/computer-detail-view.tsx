"use client";

import {
  Badge,
  Button,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@openbeam/ui";
import { formatRelativeTime } from "@openbeam/ui/utils/format";
import Link from "next/link";
import { useHotkeys } from "react-hotkeys-hook";
import { Icons } from "@/components/icons";
import { humanCron, RUN_STATUS_COLOR } from "../constants";
import {
  useComputerAgent,
  useComputerMemory,
  useComputerRuns,
  useTriggerRun,
  useUpdateAgent,
} from "../hooks/use-computer";
import { AgentSettings } from "./agent-settings";
import { MemoryViewer, MemoryViewerSkeleton } from "./memory-viewer";

export function ComputerDetailView({ agentId }: { agentId: string }) {
  const { data: agent, isLoading: agentLoading } = useComputerAgent(agentId);
  const { data: runs, isLoading: runsLoading } = useComputerRuns(agentId);
  const { data: memory, isLoading: memoryLoading } = useComputerMemory(agentId);
  const triggerRun = useTriggerRun();
  const updateAgent = useUpdateAgent();

  const isActive = !agentLoading && agent?.status === "ACTIVE";

  useHotkeys(
    "r",
    () => {
      if (isActive && !triggerRun.isPending) {
        triggerRun.mutate({ agentId });
      }
    },
    { enabled: isActive }
  );

  useHotkeys(
    "p",
    () => {
      if (!agentLoading && agent) {
        updateAgent.mutate({
          agentId,
          status: agent.status === "ACTIVE" ? "PAUSED" : "ACTIVE",
        });
      }
    },
    { enabled: !agentLoading && !!agent }
  );

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

  return (
    <div className="mx-auto max-w-4xl space-y-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <Link
            className="mb-2 inline-flex items-center gap-1 text-muted-foreground text-xs hover:text-foreground"
            href="/computer"
          >
            <Icons.ArrowLeft size={12} />
            All agents
          </Link>
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
            {humanCron(agent.scheduleCron)}
          </span>
        )}
      </div>

      <Tabs defaultValue="runs">
        <TabsList>
          <TabsTrigger value="runs">
            Runs{runs ? ` (${runs.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="memory">
            Memory{memory ? ` (${memory.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent className="mt-4" value="runs">
          <RunList agentId={agentId} isLoading={runsLoading} runs={runs} />
        </TabsContent>

        <TabsContent className="mt-4" value="memory">
          {memoryLoading ? (
            <MemoryViewerSkeleton />
          ) : (
            <MemoryViewer entries={memory ?? []} />
          )}
        </TabsContent>

        <TabsContent className="mt-4" value="settings">
          <AgentSettings
            agentId={agentId}
            mode={agent.mode}
            scheduleCron={agent.scheduleCron}
            status={agent.status}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RunList({
  runs,
  isLoading,
  agentId,
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
  agentId: string;
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
        <RunRow agentId={agentId} key={run.id} run={run} />
      ))}
    </div>
  );
}

function RunRow({
  run,
  agentId,
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
  agentId: string;
}) {
  const statusColor = RUN_STATUS_COLOR[run.status] ?? "text-muted-foreground";

  return (
    <Link
      className="flex items-center gap-3 rounded-sm border border-border/30 px-3 py-2 text-xs transition-colors hover:border-border hover:bg-muted/20"
      href={`/computer/${agentId}/runs/${run.id}`}
    >
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
      <Icons.ChevronRight className="text-muted-foreground/30" size={12} />
    </Link>
  );
}

function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 py-8">
      <div className="space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-28" />
      </div>
      <Skeleton className="h-9 w-64" />
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
