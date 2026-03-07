"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

export function useControlActivity(filters?: {
  entityType?: string;
  entityId?: string;
  limit?: number;
  offset?: number;
}) {
  const trpc = useTRPC();

  const list = useQuery({
    ...trpc.control.activity.list.queryOptions(filters ?? {}),
    placeholderData: keepPreviousData,
  });

  return {
    activity: list.data ?? [],
    isLoading: list.isLoading,
    isFetching: list.isFetching,
  };
}
