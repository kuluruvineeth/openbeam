"use client";

import type { HeartbeatRunStatus } from "@openbeam/types/control";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

export function useAgentRuns(
  agentId?: string,
  filters?: {
    status?: HeartbeatRunStatus;
    limit?: number;
    offset?: number;
  }
) {
  const trpc = useTRPC();

  return useQuery({
    ...trpc.control.heartbeats.listRuns.queryOptions({
      agentId,
      ...filters,
    }),
    placeholderData: keepPreviousData,
  });
}

export function useRun(runId: string) {
  const trpc = useTRPC();
  return useQuery(trpc.control.heartbeats.getRun.queryOptions({ runId }));
}

export function useRunEvents(
  runId: string,
  options?: { limit?: number; offset?: number }
) {
  const trpc = useTRPC();

  return useQuery({
    ...trpc.control.heartbeats.getRunEvents.queryOptions({
      runId,
      ...options,
    }),
    enabled: Boolean(runId),
  });
}
