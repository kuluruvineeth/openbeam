"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

export function useControlCostSummary() {
  const trpc = useTRPC();
  return useQuery(trpc.control.costs.summary.queryOptions());
}

export function useControlCostsByAgent() {
  const trpc = useTRPC();

  return useQuery({
    ...trpc.control.costs.byAgent.queryOptions(),
    placeholderData: keepPreviousData,
  });
}

export function useControlCostEvents(filters?: {
  agentId?: string;
  limit?: number;
  offset?: number;
}) {
  const trpc = useTRPC();

  return useQuery({
    ...trpc.control.costs.list.queryOptions(filters ?? {}),
    placeholderData: keepPreviousData,
  });
}

export function useUpdateBudget() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.control.costs.updateBudget.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.control.costs.summary.queryKey(),
      });
      queryClient.invalidateQueries({
        queryKey: trpc.control.dashboard.summary.queryKey(),
      });
    },
  });
}
