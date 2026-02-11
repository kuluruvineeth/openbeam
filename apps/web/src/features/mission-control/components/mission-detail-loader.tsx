"use client";

import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { MissionDetailShell } from "./mission-detail-shell";
import { MissionDetailSkeleton } from "./mission-detail-skeleton";

type MissionDetailLoaderProps = {
  missionId: string;
};

export function MissionDetailLoader({ missionId }: MissionDetailLoaderProps) {
  const trpc = useTRPC();

  const { data: mission, isLoading: missionLoading } = useQuery(
    trpc.missionControl.get.queryOptions({ missionId })
  );

  const { data: stats, isLoading: statsLoading } = useQuery({
    ...trpc.missionControl.getStats.queryOptions({ missionId }),
    enabled: !!mission,
  });

  if (missionLoading || statsLoading || !mission || !stats) {
    return <MissionDetailSkeleton />;
  }

  const tasksDone = stats.tasks.done;
  const tasksTotal =
    stats.tasks.inbox +
    stats.tasks.assigned +
    stats.tasks.inProgress +
    stats.tasks.review +
    stats.tasks.done +
    stats.tasks.blocked +
    stats.tasks.cancelled;

  const agents = (mission.agents ?? []).map((a) => ({
    id: a.id,
    name: a.name,
    role: a.role,
    status: a.agent?.status ?? "IDLE",
  }));

  return (
    <MissionDetailShell
      initialActivity={[]}
      initialAgents={agents}
      initialStats={{
        totalAgents: agents.length,
        totalTasks: tasksTotal,
        completedTasks: tasksDone,
        totalTokens: 0,
        totalCostCents: stats.budget.consumed,
      }}
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
        startedAt: null,
      }}
    />
  );
}
