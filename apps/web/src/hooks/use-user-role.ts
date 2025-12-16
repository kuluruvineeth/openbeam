"use client";

import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

export function useUserRole() {
  const trpc = useTRPC();

  return useQuery({
    ...trpc.team.getUserRole.queryOptions(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useIsAdmin(): boolean {
  const { data } = useUserRole();
  return data?.role === "OWNER" || data?.role === "ADMIN";
}
