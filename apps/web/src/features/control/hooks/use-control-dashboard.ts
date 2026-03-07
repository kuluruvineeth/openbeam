"use client";

import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

export function useControlDashboard() {
  const trpc = useTRPC();

  const summary = useQuery({
    ...trpc.control.dashboard.summary.queryOptions(),
    staleTime: 30_000,
  });

  const recentActivity = useQuery({
    ...trpc.control.dashboard.recentActivity.queryOptions(),
    staleTime: 30_000,
  });

  return {
    summary: summary.data,
    recentActivity: recentActivity.data,
    isLoading: summary.isLoading || recentActivity.isLoading,
  };
}
