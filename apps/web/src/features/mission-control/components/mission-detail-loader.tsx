"use client";

import type { MissionEventLedgerItem } from "@openplane/types/mission-control";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { normalizeMissionEventType } from "../lib/event-type-normalization";
import { MissionDetailShell } from "./mission-detail-shell";
import { MissionDetailSkeleton } from "./mission-detail-skeleton";

type MissionDetailLoaderProps = {
  missionId: string;
};

const ACTIVE_POLL_MS = 5000;
const INACTIVE_POLL_MS = 15_000;

export function MissionDetailLoader({ missionId }: MissionDetailLoaderProps) {
  const trpc = useTRPC();

  const { data: mission, isLoading: missionLoading } = useQuery({
    ...trpc.missionControl.get.queryOptions({ missionId }),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "ACTIVE" || status === "PAUSED"
        ? ACTIVE_POLL_MS
        : false;
    },
  });

  const isLive = mission?.status === "ACTIVE" || mission?.status === "PAUSED";
  let activityRefetchInterval: number | false = false;
  if (mission) {
    activityRefetchInterval = isLive ? ACTIVE_POLL_MS : INACTIVE_POLL_MS;
  }

  const { data: activityData, isLoading: activityLoading } = useQuery({
    ...trpc.missionControl.listActivity.queryOptions({
      missionId,
      limit: 50,
    }),
    enabled: !!mission,
    refetchInterval: activityRefetchInterval,
  });

  if (missionLoading || activityLoading || !mission) {
    return <MissionDetailSkeleton />;
  }

  const agents = (mission.agents ?? []).map((a) => ({
    id: a.id,
    name: a.name,
    role: a.role,
    status: a.agent?.status ?? "IDLE",
  }));

  const agentNameMap = new Map(agents.map((a) => [a.id, a.name]));

  const sortedActivityItems = [...(activityData?.items ?? [])].sort((a, b) => {
    const timeDiff =
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    if (timeDiff !== 0) {
      return timeDiff;
    }

    return a.id.localeCompare(b.id);
  });

  const initialActivity: MissionEventLedgerItem[] = sortedActivityItems.map(
    (item, index) => {
      const eventType = normalizeMissionEventType(item.type);
      const meta = (item.metadata as Record<string, unknown>) ?? {};
      const agentName =
        (meta.agentName as string | undefined) ??
        (item.agentId ? agentNameMap.get(item.agentId) : undefined);

      return {
        eventId: item.id,
        missionId,
        runId: mission.runId ?? "",
        lane: "autonomous" as const,
        sequence: index + 1,
        eventType,
        agentName,
        summary: item.message,
        timestamp: new Date(item.createdAt).getTime(),
        payload: {
          ...meta,
          ...(item.agentId ? { agentId: item.agentId } : {}),
        },
      };
    }
  );

  return (
    <MissionDetailShell
      initialActivity={initialActivity}
      initialAgents={agents}
      mission={{
        id: mission.id,
        name: mission.name,
        objective: mission.objective,
        status: mission.status,
        lane: "autonomous",
        runId: mission.runId ?? "",
        workflowId: mission.workflowId,
        budgetCents: mission.budgetCents,
        consumedCents: mission.consumedCents,
        maxConcurrentRuns: mission.maxConcurrentRuns,
        createdAt: mission.createdAt,
        updatedAt: mission.updatedAt,
      }}
    />
  );
}
