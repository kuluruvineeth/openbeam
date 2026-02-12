"use client";

import type { MissionEventLedgerItem } from "@openplane/types/mission-control";
import { useCallback, useEffect, useRef } from "react";
import { useMissionDrawer } from "../hooks/use-mission-drawer";
import { useMissionEventStream } from "../hooks/use-mission-event-stream";
import { useMissionRuntimeStore } from "../stores/mission-runtime-store";
import { MissionActionBar } from "./mission-action-bar";
import { MissionControlLayout } from "./mission-control-layout";
import { MissionDetailHeader } from "./mission-detail-header";
import { MissionDrawer } from "./mission-drawer";

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
  updatedAt: Date;
};

type MissionAgent = {
  id: string;
  name: string;
  role: string;
  status: string;
};

type MissionDetailShellProps = {
  mission: Mission;
  initialAgents: MissionAgent[];
  initialActivity: MissionEventLedgerItem[];
};

export function MissionDetailShell({
  mission,
  initialAgents,
  initialActivity,
}: MissionDetailShellProps) {
  const replayFromCursor = useMissionRuntimeStore((s) => s.replayFromCursor);
  const seedAgentBoard = useMissionRuntimeStore((s) => s.seedAgentBoard);
  const resetAll = useMissionRuntimeStore((s) => s.resetAll);
  const { openDrawer, open, close } = useMissionDrawer();
  const prevMissionIdRef = useRef(mission.id);
  const isLiveMission =
    mission.status === "ACTIVE" || mission.status === "PAUSED";
  const openArtifacts = useCallback(() => open("artifacts"), [open]);

  useMissionEventStream({
    missionId: mission.id,
    runId: mission.runId,
    enabled: isLiveMission,
  });

  useEffect(() => {
    if (prevMissionIdRef.current !== mission.id) {
      resetAll();
      prevMissionIdRef.current = mission.id;
    }

    if (initialAgents.length > 0) {
      seedAgentBoard(initialAgents);
    }
  }, [mission.id, initialAgents, seedAgentBoard, resetAll]);

  useEffect(() => {
    if (initialActivity.length > 0) {
      replayFromCursor(mission.runId, initialActivity);
    }
  }, [mission.runId, initialActivity, replayFromCursor]);

  useEffect(() => () => resetAll(), [resetAll]);

  return (
    <div className="flex h-full flex-col dark:bg-[#0c0c0c]">
      <MissionDetailHeader mission={mission} onOpenArtifacts={openArtifacts} />
      <MissionControlLayout
        missionId={mission.id}
        missionStatus={mission.status}
        onOpenArtifacts={openArtifacts}
        runId={mission.runId}
      />
      <MissionActionBar missionId={mission.id} status={mission.status} />
      <MissionDrawer
        agents={initialAgents}
        drawerType={openDrawer}
        missionId={mission.id}
        onClose={close}
        runId={mission.runId}
      />
    </div>
  );
}
