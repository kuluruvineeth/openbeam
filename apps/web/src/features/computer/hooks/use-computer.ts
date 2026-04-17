"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

export function useComputerCatalog() {
  const trpc = useTRPC();
  return useQuery(trpc.computer.listCatalog.queryOptions());
}

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

const ACTIVE_RUN_STATUSES = new Set(["RUNNING", "PENDING"]);
const RUN_POLL_INTERVAL = 3000;

export function useComputerRun(agentId: string, runId: string) {
  const trpc = useTRPC();
  return useQuery({
    ...trpc.computer.getRun.queryOptions({ agentId, runId }),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && ACTIVE_RUN_STATUSES.has(status)
        ? RUN_POLL_INTERVAL
        : false;
    },
  });
}

export function useComputerMemory(agentId: string) {
  const trpc = useTRPC();
  return useQuery(trpc.computer.listMemory.queryOptions({ agentId }));
}

export function useComputerProposals(agentId: string, runId: string) {
  const trpc = useTRPC();
  return useQuery(trpc.computer.getProposals.queryOptions({ agentId, runId }));
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

export function useApproveRun(agentId: string, runId: string) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useMutation({
    ...trpc.computer.approveRun.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.computer.getRun.queryKey({ agentId, runId }),
      });
      queryClient.invalidateQueries({
        queryKey: trpc.computer.getProposals.queryKey({ agentId, runId }),
      });
      queryClient.invalidateQueries({
        queryKey: trpc.computer.listRuns.queryKey({ agentId, limit: 20 }),
      });
    },
  });
}

export function useRejectRun(agentId: string, runId: string) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useMutation({
    ...trpc.computer.rejectRun.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.computer.getRun.queryKey({ agentId, runId }),
      });
      queryClient.invalidateQueries({
        queryKey: trpc.computer.getProposals.queryKey({ agentId, runId }),
      });
      queryClient.invalidateQueries({
        queryKey: trpc.computer.listRuns.queryKey({ agentId, limit: 20 }),
      });
    },
  });
}

export function useUpdateAgent() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useMutation({
    ...trpc.computer.updateAgent.mutationOptions(),
    onMutate: async (variables) => {
      const key = trpc.computer.getAgent.queryKey({
        agentId: variables.agentId,
      });
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData(key);
      queryClient.setQueryData(key, (old: typeof previous) =>
        old ? { ...old, ...variables } : old
      );
      return { previous, key };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(context.key, context.previous);
      }
    },
    onSettled: (_data, _err, variables) => {
      queryClient.invalidateQueries({
        queryKey: trpc.computer.getAgent.queryKey({
          agentId: variables.agentId,
        }),
      });
      queryClient.invalidateQueries({
        queryKey: trpc.computer.listAgents.queryKey(),
      });
    },
  });
}
