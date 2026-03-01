"use client";

import type { MissionEventLedgerItem } from "@openplane/types/mission-control";
import { useEffect, useRef } from "react";
import { useMissionDrawer } from "../hooks/use-mission-drawer";
import { useMissionEventStream } from "../hooks/use-mission-event-stream";
import { useMissionRuntimeStore } from "../stores/mission-runtime-store";
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
  const { openDrawer, close } = useMissionDrawer();
  const prevMissionIdRef = useRef(mission.id);
  const isLiveMission =
    mission.status === "ACTIVE" || mission.status === "PAUSED";

  useMissionEventStream({
    missionId: mission.id,
    runId: mission.runId,
    enabled: isLiveMission,
  });

  useEffect(() => {
    const store = useMissionRuntimeStore.getState();

    if (prevMissionIdRef.current !== mission.id) {
      store.resetAll();
      prevMissionIdRef.current = mission.id;
    }

    if (initialAgents.length > 0) {
      store.seedAgentBoard(initialAgents);
    }
  }, [mission.id, initialAgents]);

  useEffect(() => {
    if (initialActivity.length > 0) {
      useMissionRuntimeStore
        .getState()
        .replayFromCursor(mission.runId, initialActivity);
    }
  }, [mission.runId, initialActivity]);

  useEffect(() => () => useMissionRuntimeStore.getState().resetAll(), []);

  return (
    <div className="flex h-full flex-col dark:bg-[#0c0c0c]">
      <MissionDetailHeader mission={mission} />
      <MissionControlLayout
        missionId={mission.id}
        missionStatus={mission.status}
        runId={mission.runId}
      />
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
