"use client";

import { cva } from "class-variance-authority";
import { useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import {
  useApprovalQueue,
  useMissionRuntimeStore,
  useSelectedApprovalIds,
} from "../stores/mission-runtime-store";
import { AgentSquadBoard } from "./agent-squad-board";
import { MissionApprovalDrawer } from "./mission-approval-drawer";
import { MissionArtifactPanel } from "./mission-artifact-panel";
import { MissionEventFeed } from "./mission-event-feed";

function noop() {
  return;
}

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
  const [activeTab, setActiveTab] = useState<TabId>("timeline");
  const events = useMissionRuntimeStore((s) => s.eventsByRun[runId] ?? []);
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
            onApprove={noop}
            onClearSelection={clearApprovalSelection}
            onReject={noop}
            onSelectAll={selectAllApprovals}
            onToggleSelect={toggleApprovalSelection}
            selectedIds={selectedApprovalIds}
          />
        )}
        {activeTab === "artifacts" && <MissionArtifactPanel artifacts={[]} />}
        {activeTab === "ledger" && <MissionEventFeed events={events} />}
      </div>
    </div>
  );
}
