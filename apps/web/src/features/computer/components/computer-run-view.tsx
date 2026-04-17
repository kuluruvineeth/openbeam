"use client";

import {
  Badge,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@openbeam/ui";
import { formatRelativeTime } from "@openbeam/ui/utils/format";
import Link from "next/link";
import { Icons } from "@/components/icons";
import { RUN_STATUS_BADGE } from "../constants";
import { useComputerProposals, useComputerRun } from "../hooks/use-computer";
import { ProposalCard, ProposalCardSkeleton } from "./proposal-card";
import { StepTrace, StepTraceSkeleton } from "./step-trace";

interface ComputerRunViewProps {
  agentId: string;
  runId: string;
}

export function ComputerRunView({ agentId, runId }: ComputerRunViewProps) {
  const { data: run, isLoading } = useComputerRun(agentId, runId);
  const { data: proposals, isLoading: proposalsLoading } = useComputerProposals(
    agentId,
    runId
  );

  if (isLoading) {
    return <RunDetailSkeleton />;
  }

  if (!run) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
        Run not found
      </div>
    );
  }

  const statusStyle = RUN_STATUS_BADGE[run.status] ?? RUN_STATUS_BADGE.PENDING;
  const proposedActions = (proposals?.proposedActions ?? []) as Array<{
    tool: string;
    args: Record<string, unknown>;
    description?: string;
  }>;

  return (
    <div className="mx-auto max-w-4xl space-y-6 py-8">
      <div>
        <Link
          className="mb-3 inline-flex items-center gap-1 text-muted-foreground text-xs hover:text-foreground"
          href={`/computer/${agentId}`}
        >
          <Icons.ArrowLeft size={12} />
          Back to agent
        </Link>

        <div className="flex items-center justify-between">
          <h1 className="font-medium text-xl">Run Details</h1>
          <Badge className={statusStyle} variant="outline">
            {run.status.toLowerCase().replace("_", " ")}
          </Badge>
        </div>

        <div className="mt-2 flex items-center gap-4 text-muted-foreground text-xs">
          <span>{run.toolCallCount} tool calls</span>
          <span>{run.llmCallCount} LLM calls</span>
          {run.startedAt && (
            <span>started {formatRelativeTime(new Date(run.startedAt))}</span>
          )}
          {run.completedAt && (
            <span>
              completed {formatRelativeTime(new Date(run.completedAt))}
            </span>
          )}
        </div>

        {run.summary && (
          <p className="mt-3 rounded-sm bg-muted/50 px-3 py-2 text-sm">
            {run.summary}
          </p>
        )}
        {run.error && (
          <p className="mt-3 rounded-sm bg-destructive/5 px-3 py-2 text-destructive text-sm">
            {run.error}
          </p>
        )}
      </div>

      <Tabs defaultValue="steps">
        <TabsList>
          <TabsTrigger value="steps">
            Steps ({run.steps?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="proposals">
            Proposals
            {proposedActions.length > 0 ? ` (${proposedActions.length})` : ""}
          </TabsTrigger>
        </TabsList>

        <TabsContent className="mt-4" value="steps">
          {run.steps ? <StepTrace steps={run.steps} /> : <StepTraceSkeleton />}
        </TabsContent>

        <TabsContent className="mt-4" value="proposals">
          <ProposalsSection
            actions={proposedActions}
            agentId={agentId}
            isLoading={proposalsLoading}
            runId={runId}
            status={proposals?.status ?? run.status}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ProposalsSection({
  actions,
  agentId,
  isLoading,
  runId,
  status,
}: {
  actions: Array<{
    tool: string;
    args: Record<string, unknown>;
    description?: string;
  }>;
  agentId: string;
  isLoading: boolean;
  runId: string;
  status: string;
}) {
  if (isLoading) {
    return <ProposalCardSkeleton />;
  }
  if (actions.length > 0) {
    return (
      <ProposalCard
        actions={actions}
        agentId={agentId}
        runId={runId}
        status={status}
      />
    );
  }
  return (
    <p className="py-4 text-center text-muted-foreground text-xs">
      No proposals for this run
    </p>
  );
}

function RunDetailSkeleton() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 py-8">
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <StepTraceSkeleton />
    </div>
  );
}
