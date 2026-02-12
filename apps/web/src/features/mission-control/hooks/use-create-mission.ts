"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getVanillaTRPCClient } from "@/trpc/client";
import { useMissionCreationStore } from "../stores/mission-creation-store";

const BOARD_QUERY_PREFIX = ["missionControl", "getBoard"];

export function useCreateMission(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  const store = useMissionCreationStore;

  return useMutation({
    mutationFn: async () => {
      const client = getVanillaTRPCClient();
      const { objective, budgetCents, cronSchedule, agents, tasks } =
        store.getState();

      store.getState().setSubmitting(true);

      const mission = await client.missionControl.create.mutate({
        objective,
        budgetCents: budgetCents ?? undefined,
        cronSchedule: cronSchedule ?? undefined,
      });

      const missionId = mission.id;

      for (const agent of agents) {
        await client.missionControl.addAgent.mutate({
          missionId,
          name: agent.name,
          role: agent.role,
          soulPrompt: agent.soulPrompt,
          tools: agent.tools,
        });
      }

      if (agents.some((a) => a.capabilities.length > 0)) {
        const dbAgents = await client.missionControl.get.query({ missionId });
        const agentsByName = new Map(
          (dbAgents.agents ?? []).map((a: { name: string; id: string }) => [
            a.name,
            a.id,
          ])
        );

        for (const agent of agents) {
          if (agent.capabilities.length > 0) {
            const agentId = agentsByName.get(agent.name);
            if (agentId) {
              await client.missionControl.updateAgent.mutate({
                missionId,
                agentId,
                capabilities: agent.capabilities,
              });
            }
          }
        }
      }

      const taskIdMap = new Map<number, string>();

      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        const resolvedDeps = task.dependsOn
          .map((dep) => taskIdMap.get(Number(dep)))
          .filter((id): id is string => !!id);

        const created = await client.missionControl.createTask.mutate({
          missionId,
          title: task.title,
          description: task.description || undefined,
          priority: task.priority,
          dependsOn: resolvedDeps.length > 0 ? resolvedDeps : undefined,
          requiredCapabilities:
            task.requiredCapabilities.length > 0
              ? task.requiredCapabilities
              : undefined,
        });

        taskIdMap.set(i, created.id);
      }

      await client.missionControl.start.mutate({ missionId });

      return { missionId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BOARD_QUERY_PREFIX });
      store.getState().reset();
      toast.success("Mission launched");
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error("Failed to launch mission", {
        description: error.message,
      });
    },
    onSettled: () => {
      store.getState().setSubmitting(false);
    },
  });
}
