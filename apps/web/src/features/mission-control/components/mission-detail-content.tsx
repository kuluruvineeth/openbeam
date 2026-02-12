"use client";

import { Icons } from "@openplane/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cva } from "class-variance-authority";
import { useCallback, useMemo } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { getVanillaTRPCClient, useTRPC } from "@/trpc/client";
import type { DetailTab } from "../hooks/use-mission-detail-params";
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
import { MissionEventFeed } from "./mission-event-feed";
import { MissionLedger } from "./mission-ledger";
import { TaskBoard } from "./task-board";

const tabVariants = cva(
  "inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-sm transition-all duration-200",
  {
    variants: {
      active: {
        true: "bg-muted font-medium text-foreground dark:bg-[#1d1d1d]",
        false: "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
      },
    },
    defaultVariants: { active: false },
  }
);

type TabDefinition = {
  id: DetailTab;
  label: string;
  icon: React.ReactNode;
  count?: number;
};

type MissionAgent = {
  id: string;
  name: string;
  role: string;
  status: string;
};

type MissionDetailContentProps = {
  missionId: string;
  runId: string;
  activeTab: DetailTab;
  agents: MissionAgent[];
  onTabChange: (tab: DetailTab) => void;
};

export function MissionDetailContent({
  missionId,
  runId,
  activeTab,
  agents,
  onTabChange,
}: MissionDetailContentProps) {
  useHotkeys("1", () => onTabChange("timeline"));
  useHotkeys("2", () => onTabChange("agents"));
  useHotkeys("3", () => onTabChange("tasks"));
  useHotkeys("4", () => onTabChange("approvals"));
  useHotkeys("5", () => onTabChange("artifacts"));
  useHotkeys("6", () => onTabChange("memory"));
  useHotkeys("7", () => onTabChange("budget"));

  const tabs: TabDefinition[] = [
    { id: "timeline", label: "Timeline", icon: <Icons.Clock size={14} /> },
    { id: "agents", label: "Agents", icon: <Icons.Users size={14} /> },
    { id: "tasks", label: "Tasks", icon: <Icons.Task size={14} /> },
    {
      id: "approvals",
      label: "Approvals",
      icon: <Icons.ShieldAlert size={14} />,
    },
    { id: "artifacts", label: "Artifacts", icon: <Icons.File size={14} /> },
    { id: "memory", label: "Memory", icon: <Icons.Database size={14} /> },
    { id: "budget", label: "Budget", icon: <Icons.Coins size={14} /> },
  ];

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center gap-1 border-border/50 border-b px-3 py-1.5 dark:border-[#1d1d1d]">
        {tabs.map((tab) => (
          <button
            className={tabVariants({ active: activeTab === tab.id })}
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            type="button"
          >
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="ml-1 rounded-sm bg-muted px-1 py-0.5 font-medium text-[10px] tabular-nums">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto p-4">
        <TabContent
          activeTab={activeTab}
          agents={agents}
          missionId={missionId}
          runId={runId}
        />
      </div>
    </div>
  );
}

type TabContentProps = {
  activeTab: DetailTab;
  missionId: string;
  runId: string;
  agents: MissionAgent[];
};

function TabContent({ activeTab, missionId, runId, agents }: TabContentProps) {
  switch (activeTab) {
    case "timeline":
      return <TimelineTab runId={runId} />;
    case "agents":
      return <AgentsTab runId={runId} />;
    case "tasks":
      return <TaskBoard missionId={missionId} runId={runId} />;
    case "approvals":
      return <ApprovalsTab missionId={missionId} />;
    case "artifacts":
      return <ArtifactsTab missionId={missionId} runId={runId} />;
    case "memory":
      return <MemoryInspector agents={agents} missionId={missionId} />;
    case "budget":
      return <MissionLedger />;
    default:
      return null;
  }
}

function TimelineTab({ runId }: { runId: string }) {
  const events = useMissionEvents(runId);
  return <MissionEventFeed events={events} />;
}

function AgentsTab({ runId }: { runId: string }) {
  const agentBoard = useAgentBoard();
  const events = useMissionEvents(runId);
  return <AgentSquadBoard agents={agentBoard} events={events} />;
}

function ApprovalsTab({ missionId }: { missionId: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const queryKey = trpc.missionControl.get.queryOptions({ missionId }).queryKey;

  const approveMutation = useMutation({
    mutationFn: (approvalId: string) =>
      getVanillaTRPCClient().missionControl.resolveApproval.mutate({
        missionId,
        approvalId,
        approved: true,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const rejectMutation = useMutation({
    mutationFn: ({
      approvalId,
      reason,
    }: {
      approvalId: string;
      reason?: string;
    }) =>
      getVanillaTRPCClient().missionControl.resolveApproval.mutate({
        missionId,
        approvalId,
        approved: false,
        reason,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const handleApprove = useCallback(
    (id: string) => approveMutation.mutate(id),
    [approveMutation]
  );

  const handleReject = useCallback(
    (id: string, reason?: string) =>
      rejectMutation.mutate({ approvalId: id, reason }),
    [rejectMutation]
  );

  return (
    <ApprovalQueuePanel onApprove={handleApprove} onReject={handleReject} />
  );
}

function ArtifactsTab({
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

export { tabVariants };
