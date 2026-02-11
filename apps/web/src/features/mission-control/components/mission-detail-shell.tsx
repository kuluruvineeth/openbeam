"use client";

import type { MissionEventLedgerItem } from "@openplane/types/mission-control";
import { useEffect } from "react";
import { useMissionDetailParams } from "../hooks/use-mission-detail-params";
import { useMissionRuntimeStore } from "../stores/mission-runtime-store";
import { MissionActionBar } from "./mission-action-bar";
import { MissionDetailContent } from "./mission-detail-content";
import { MissionDetailHeader } from "./mission-detail-header";
import { MissionDetailSidebar } from "./mission-detail-sidebar";

type Mission = {
  id: string;
  name: string;
  objective: string;
  status: string;
  lane: string;
  runId: string;
  workflowId: string | null;
  budgetCents: number | null;
  consumedCents: number;
  maxConcurrentRuns: number;
  createdAt: Date;
  startedAt: Date | null;
};

type MissionStats = {
  totalAgents: number;
  totalTasks: number;
  completedTasks: number;
  totalTokens: number;
  totalCostCents: number;
};

type MissionAgent = {
  id: string;
  name: string;
  role: string;
  status: string;
};

type MissionDetailShellProps = {
  mission: Mission;
  initialStats: MissionStats;
  initialAgents: MissionAgent[];
  initialActivity: MissionEventLedgerItem[];
};

export function MissionDetailShell({
  mission,
  initialStats,
  initialAgents,
  initialActivity,
}: MissionDetailShellProps) {
  const [params, setParams] = useMissionDetailParams();
  const replayFromCursor = useMissionRuntimeStore((s) => s.replayFromCursor);

  useEffect(() => {
    if (initialActivity.length > 0) {
      replayFromCursor(mission.runId, initialActivity);
    }
  }, [mission.runId, initialActivity, replayFromCursor]);

  return (
    <div className="flex h-full flex-col">
      <MissionDetailHeader mission={mission} />
      <div className="flex flex-1 overflow-hidden">
        <MissionDetailSidebar
          agents={initialAgents}
          mission={mission}
          stats={initialStats}
        />
        <MissionDetailContent
          activeTab={params.tab}
          missionId={mission.id}
          onTabChange={(tab) => setParams({ tab })}
          runId={mission.runId}
        />
      </div>
      <MissionActionBar missionId={mission.id} status={mission.status} />
    </div>
  );
}
