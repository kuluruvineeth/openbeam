"use client";

import type { ControlAgentStatus } from "@openbeam/types/control";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

export function useControlAgents(filters?: {
  status?: ControlAgentStatus;
  limit?: number;
  offset?: number;
}) {
  const trpc = useTRPC();

  const list = useQuery({
    ...trpc.control.agents.list.queryOptions(filters ?? {}),
    placeholderData: keepPreviousData,
  });

  const count = useQuery(trpc.control.agents.count.queryOptions({}));

  return {
    agents: list.data ?? [],
    count: count.data ?? 0,
    isLoading: list.isLoading,
    isFetching: list.isFetching,
  };
}

export function useControlAgent(agentId: string) {
  const trpc = useTRPC();

  const agent = useQuery(trpc.control.agents.get.queryOptions({ agentId }));

  const relations = useQuery(
    trpc.control.agents.getWithRelations.queryOptions({ agentId })
  );

  return {
    agent: agent.data,
    relations: relations.data,
    isLoading: agent.isLoading,
  };
}

export function useCreateAgent() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.control.agents.create.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.control.agents.list.queryKey(),
      });
      queryClient.invalidateQueries({
        queryKey: trpc.control.agents.count.queryKey(),
      });
    },
  });
}

export function useUpdateAgent() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.control.agents.update.mutationOptions(),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: trpc.control.agents.get.queryKey({
          agentId: variables.agentId,
        }),
      });
      queryClient.invalidateQueries({
        queryKey: trpc.control.agents.list.queryKey(),
      });
    },
  });
}

function useAgentLifecycle(
  method: "pause" | "resume" | "terminate" | "remove" | "activate"
) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.control.agents[method].mutationOptions(),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: trpc.control.agents.get.queryKey({
          agentId: variables.agentId,
        }),
      });
      queryClient.invalidateQueries({
        queryKey: trpc.control.agents.list.queryKey(),
      });
      queryClient.invalidateQueries({
        queryKey: trpc.control.agents.count.queryKey(),
      });
      queryClient.invalidateQueries({
        queryKey: trpc.control.dashboard.summary.queryKey(),
      });
    },
  });
}

export function usePauseAgent() {
  return useAgentLifecycle("pause");
}

export function useResumeAgent() {
  return useAgentLifecycle("resume");
}

export function useTerminateAgent() {
  return useAgentLifecycle("terminate");
}

export function useRemoveAgent() {
  return useAgentLifecycle("remove");
}

export function useActivateAgent() {
  return useAgentLifecycle("activate");
}

export function useAgentApiKeys(agentId: string) {
  const trpc = useTRPC();
  return useQuery(trpc.control.agents.listApiKeys.queryOptions({ agentId }));
}

export function useCreateAgentApiKey() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.control.agents.createApiKey.mutationOptions(),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: trpc.control.agents.listApiKeys.queryKey({
          agentId: variables.agentId,
        }),
      });
    },
  });
}

export function useRevokeAgentApiKey() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.control.agents.revokeApiKey.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.control.agents.listApiKeys.queryKey(),
      });
    },
  });
}

export function useAgentConfigRevisions(agentId: string) {
  const trpc = useTRPC();
  return useQuery(
    trpc.control.agents.listConfigRevisions.queryOptions({ agentId })
  );
}

export function useRollbackAgentConfig() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.control.agents.rollbackConfig.mutationOptions(),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: trpc.control.agents.get.queryKey({
          agentId: variables.agentId,
        }),
      });
      queryClient.invalidateQueries({
        queryKey: trpc.control.agents.listConfigRevisions.queryKey({
          agentId: variables.agentId,
        }),
      });
    },
  });
}

export function useWakeAgent() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.control.agents.wake.mutationOptions(),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: trpc.control.agents.get.queryKey({
          agentId: variables.agentId,
        }),
      });
      queryClient.invalidateQueries({
        queryKey: trpc.control.heartbeats.listRuns.queryKey(),
      });
    },
  });
}

export function useOrgChart() {
  const trpc = useTRPC();
  return useQuery(trpc.control.agents.orgChart.queryOptions());
}
