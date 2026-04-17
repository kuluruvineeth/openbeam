"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

export function useComputerAgents() {
  const trpc = useTRPC();
  return useQuery(trpc.computer.listAgents.queryOptions());
}

export function useComputerAgent(agentId: string) {
  const trpc = useTRPC();
  return useQuery(trpc.computer.getAgent.queryOptions({ agentId }));
}

export function useComputerRuns(agentId: string) {
  const trpc = useTRPC();
  return useQuery(trpc.computer.listRuns.queryOptions({ agentId, limit: 20 }));
}

export function useComputerRun(agentId: string, runId: string) {
  const trpc = useTRPC();
  return useQuery(trpc.computer.getRun.queryOptions({ agentId, runId }));
}

export function useComputerMemory(agentId: string) {
  const trpc = useTRPC();
  return useQuery(trpc.computer.listMemory.queryOptions({ agentId }));
}

export function useEnableAgent() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useMutation({
    ...trpc.computer.enableAgent.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.computer.listAgents.queryKey(),
      });
    },
  });
}

export function useTriggerRun() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useMutation({
    ...trpc.computer.triggerRun.mutationOptions(),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: trpc.computer.listRuns.queryKey({
          agentId: variables.agentId,
          limit: 20,
        }),
      });
    },
  });
}

export function useApproveRun() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useMutation({
    ...trpc.computer.approveRun.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });
}

export function useRejectRun() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useMutation({
    ...trpc.computer.rejectRun.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });
}

export function useUpdateAgent() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useMutation({
    ...trpc.computer.updateAgent.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.computer.listAgents.queryKey(),
      });
    },
  });
}
