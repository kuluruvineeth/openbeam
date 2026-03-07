"use client";

import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

export function useSidebarBadges() {
  const trpc = useTRPC();

  const { data } = useQuery({
    ...trpc.control.dashboard.sidebarBadges.queryOptions(),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  return {
    pendingApprovals: data?.pendingApprovalCount ?? 0,
    blockedIssues: data?.staleIssueCount ?? 0,
    agentsWithErrors: 0,
    overBudget: false,
  };
}
