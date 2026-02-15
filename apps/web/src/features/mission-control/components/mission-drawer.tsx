"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@openplane/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { getVanillaTRPCClient, useTRPC } from "@/trpc/client";
import type { DrawerType } from "../hooks/use-mission-drawer";
import {
  mapArtifactRunsToSummaries,
  mapMissionEventsToArtifactSummaries,
} from "../lib/artifact-summary";
import {
  useAgentBoard,
  useMissionEvents,
} from "../stores/mission-runtime-store";
import { AgentSquadBoard } from "./agent-squad-board";
import { ApprovalQueuePanel } from "./approval-queue-panel";
import { MemoryInspector } from "./memory-inspector";
import {
  type ArtifactSummary,
  MissionArtifactPanel,
} from "./mission-artifact-panel";
import { MissionLedger } from "./mission-ledger";
import { TaskBoard } from "./task-board";

type MissionAgent = {
  id: string;
  name: string;
  role: string;
  status: string;
};

type MissionDrawerProps = {
  drawerType: DrawerType;
  missionId: string;
  runId: string;
  agents: MissionAgent[];
  onClose: () => void;
};

const DRAWER_TITLES: Record<NonNullable<DrawerType>, string> = {
  tasks: "Tasks",
  artifacts: "Results",
  debug: "Debug",
  agents: "Agents",
};

export function MissionDrawer({
  drawerType,
  missionId,
  runId,
  agents,
  onClose,
}: MissionDrawerProps) {
  return (
    <Sheet onOpenChange={(open) => !open && onClose()} open={!!drawerType}>
      <SheetContent
        className="flex w-[96vw] max-w-[1120px] flex-col gap-0 overflow-hidden p-0 sm:w-[92vw] lg:w-[88vw]"
        side="right"
      >
        <SheetHeader className="border-border/50 border-b px-4 py-3 dark:border-[#1d1d1d]">
          <SheetTitle>{drawerType ? DRAWER_TITLES[drawerType] : ""}</SheetTitle>
          <SheetDescription className="sr-only">
            {drawerType ? `${DRAWER_TITLES[drawerType]} panel` : ""}
          </SheetDescription>
        </SheetHeader>
        <div className="no-scrollbar flex-1 overflow-y-auto">
          {drawerType === "tasks" && (
            <TaskBoard missionId={missionId} runId={runId} />
          )}
          {drawerType === "artifacts" && (
            <ArtifactsDrawerContent missionId={missionId} runId={runId} />
          )}
          {drawerType === "debug" && (
            <DebugDrawerContent agents={agents} missionId={missionId} />
          )}
          {drawerType === "agents" && (
            <AgentsDrawerContent missionId={missionId} runId={runId} />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ArtifactsDrawerContent({
  missionId,
  runId,
}: {
  missionId: string;
  runId: string;
}) {
  const trpc = useTRPC();
  const events = useMissionEvents(runId);
  const { data } = useQuery(
    trpc.missionControl.listArtifacts.queryOptions({ missionId })
  );

  const artifacts = useMemo((): ArtifactSummary[] => {
    const databaseArtifacts = mapArtifactRunsToSummaries(
      (data ?? []).map((run) => ({
        runId: run.runId,
        agentName: run.agentName,
        createdAt: run.createdAt,
        artifacts: run.artifacts as unknown[],
      }))
    );

    if (databaseArtifacts.length > 0) {
      return databaseArtifacts;
    }

    return mapMissionEventsToArtifactSummaries(events);
  }, [data, events]);

  return <MissionArtifactPanel artifacts={artifacts} />;
}

function DebugDrawerContent({
  missionId,
  agents,
}: {
  missionId: string;
  agents: MissionAgent[];
}) {
  const memoryAgents = useMemo(
    () => agents.map((a) => ({ id: a.id, name: a.name })),
    [agents]
  );

  return (
    <div className="flex flex-col gap-4 p-4">
      <MemoryInspector agents={memoryAgents} missionId={missionId} />
      <div className="border-border/50 border-t pt-4 dark:border-[#1d1d1d]">
        <MissionLedger />
      </div>
    </div>
  );
}

function AgentsDrawerContent({
  runId,
  missionId,
}: {
  runId: string;
  missionId: string;
}) {
  const agentBoard = useAgentBoard();
  const events = useMissionEvents(runId);
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const approveMutation = useMutation({
    mutationFn: ({
      missionId: targetMissionId,
      approvalId,
      approved,
      reason,
    }: {
      missionId: string;
      approvalId: string;
      approved: boolean;
      reason?: string;
    }) =>
      getVanillaTRPCClient().missionControl.resolveApproval.mutate({
        missionId: targetMissionId,
        approvalId,
        approved,
        reason,
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: trpc.missionControl.get.queryOptions({ missionId }).queryKey,
      }),
  });

  const handleApprove = useCallback(
    (id: string) =>
      approveMutation.mutate({
        missionId,
        approvalId: id,
        approved: true,
      }),
    [approveMutation, missionId]
  );

  const handleReject = useCallback(
    (id: string, reason?: string) =>
      approveMutation.mutate({
        missionId,
        approvalId: id,
        approved: false,
        reason,
      }),
    [approveMutation, missionId]
  );

  return (
    <div className="flex flex-col gap-4 p-4">
      <AgentSquadBoard
        agents={agentBoard}
        events={events}
        missionId={missionId}
      />
      <div className="border-border/50 border-t pt-4 dark:border-[#1d1d1d]">
        <ApprovalQueuePanel onApprove={handleApprove} onReject={handleReject} />
      </div>
    </div>
  );
}
