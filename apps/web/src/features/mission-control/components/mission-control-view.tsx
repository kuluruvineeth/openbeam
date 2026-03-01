"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cva } from "class-variance-authority";
import { useCallback, useMemo, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { getVanillaTRPCClient, useTRPC } from "@/trpc/client";
import {
  mapArtifactRunsToSummaries,
  mapMissionEventsToArtifactSummaries,
} from "../lib/artifact-summary";
import {
  useApprovalQueue,
  useMissionEvents,
  useMissionRuntimeStore,
  useSelectedApprovalIds,
} from "../stores/mission-runtime-store";
import { AgentSquadBoard } from "./agent-squad-board";
import { MissionApprovalDrawer } from "./mission-approval-drawer";
import { MissionArtifactPanel } from "./mission-artifact-panel";
import { MissionEventFeed } from "./mission-event-feed";
import { MissionLedger } from "./mission-ledger";

const tabVariants = cva(
  "rounded-sm px-3 py-1.5 font-medium text-sm transition-colors",
  {
    variants: {
      active: {
        true: "bg-accent text-accent-foreground",
        false: "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
      },
    },
  }
);

type TabId = "timeline" | "agents" | "approvals" | "artifacts" | "ledger";

type Tab = {
  id: TabId;
  label: string;
  count?: number;
};

type MissionControlViewProps = {
  missionId: string;
  runId: string;
};

export function MissionControlView({
  missionId,
  runId,
}: MissionControlViewProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabId>("timeline");
  const events = useMissionEvents(runId);
  const agentBoard = useMissionRuntimeStore((s) => s.agentBoardState);
  const approvals = useApprovalQueue();
  const selectedApprovalIds = useSelectedApprovalIds();
  const toggleApprovalSelection = useMissionRuntimeStore(
    (s) => s.toggleApprovalSelection
  );
  const selectAllApprovals = useMissionRuntimeStore(
    (s) => s.selectAllApprovals
  );
  const clearApprovalSelection = useMissionRuntimeStore(
    (s) => s.clearApprovalSelection
  );
  const { data: artifactRuns } = useQuery(
    trpc.missionControl.listArtifacts.queryOptions({ missionId })
  );

  const artifacts = useMemo(() => {
    const databaseArtifacts = mapArtifactRunsToSummaries(
      (artifactRuns ?? []).map((run) => ({
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
  }, [artifactRuns, events]);

  const approveMutation = useMutation({
    mutationFn: ({
      approvalId,
      approved,
      reason,
    }: {
      approvalId: string;
      approved: boolean;
      reason?: string;
    }) =>
      getVanillaTRPCClient().missionControl.resolveApproval.mutate({
        missionId,
        approvalId,
        approved,
        reason,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.missionControl.get.queryOptions({ missionId }).queryKey,
      });
    },
  });

  const handleApprove = useCallback(
    (approvalId: string) =>
      approveMutation.mutate({
        approvalId,
        approved: true,
      }),
    [approveMutation]
  );

  const handleReject = useCallback(
    (approvalId: string, reason?: string) =>
      approveMutation.mutate({
        approvalId,
        approved: false,
        reason,
      }),
    [approveMutation]
  );

  useHotkeys("1", () => setActiveTab("timeline"));
  useHotkeys("2", () => setActiveTab("agents"));
  useHotkeys("3", () => setActiveTab("approvals"));
  useHotkeys("4", () => setActiveTab("artifacts"));
  useHotkeys("5", () => setActiveTab("ledger"));

  const tabs: Tab[] = [
    { id: "timeline", label: "Timeline", count: events.length },
    {
      id: "agents",
      label: "Agents",
      count: Object.keys(agentBoard).length,
    },
    {
      id: "approvals",
      label: "Approvals",
      count: approvals.filter((a) => a.status === "pending").length,
    },
    { id: "artifacts", label: "Artifacts" },
    { id: "ledger", label: "Ledger" },
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1 border-border/50 border-b px-3 py-1.5">
        {tabs.map((tab) => (
          <button
            className={tabVariants({ active: activeTab === tab.id })}
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            type="button"
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="ml-1.5 text-muted-foreground text-xs">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {activeTab === "timeline" && <MissionEventFeed events={events} />}
        {activeTab === "agents" && (
          <AgentSquadBoard agents={agentBoard} missionId={missionId} />
        )}
        {activeTab === "approvals" && (
          <MissionApprovalDrawer
            approvals={approvals}
            onApprove={handleApprove}
            onClearSelection={clearApprovalSelection}
            onReject={handleReject}
            onSelectAll={selectAllApprovals}
            onToggleSelect={toggleApprovalSelection}
            selectedIds={selectedApprovalIds}
          />
        )}
        {activeTab === "artifacts" && (
          <MissionArtifactPanel artifacts={artifacts} />
        )}
        {activeTab === "ledger" && <MissionLedger />}
      </div>
    </div>
  );
}
