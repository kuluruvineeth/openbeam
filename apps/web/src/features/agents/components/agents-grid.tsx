"use client";

import {
  AgentsEmptyState,
  AgentsGridSkeleton,
  AgentsNoResults,
  LoadMore,
} from "@openbeam/ui/components/agents";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { useInView } from "react-intersection-observer";
import { useTRPC } from "@/trpc/client";
import type { AgentStatus } from "../hooks/use-agent-filters";
import { AgentItem } from "./agent-item";

type ApiStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

const statusToApiMap: Record<AgentStatus, ApiStatus> = {
  draft: "DRAFT",
  active: "PUBLISHED",
  paused: "ARCHIVED",
  archived: "ARCHIVED",
};

type AgentsGridProps = {
  status?: AgentStatus[];
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
};

export function AgentsGrid({
  status,
  hasActiveFilters = false,
  onClearFilters,
}: AgentsGridProps) {
  const { ref, inView } = useInView({ threshold: 0 });
  const trpc = useTRPC();

  const apiStatus =
    status && status.length > 0 ? statusToApiMap[status[0]] : undefined;

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useInfiniteQuery({
      ...trpc.agentCanvas.list.infiniteQueryOptions(
        {
          limit: 12,
          status: apiStatus,
        },
        {
          getNextPageParam: (lastPage) => lastPage.nextCursor,
        }
      ),
    });

  const agents = useMemo(
    () => data?.pages.flatMap((page) => page.items) ?? [],
    [data]
  );

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) {
    return <AgentsGridSkeleton />;
  }

  if (agents.length === 0) {
    if (hasActiveFilters && onClearFilters) {
      return <AgentsNoResults onClear={onClearFilters} />;
    }
    return <AgentsEmptyState />;
  }

  return (
    <div>
      <div className="grid 3xl:grid-cols-6 grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {agents.map((agent) => (
          <AgentItem data={agent} key={agent.id} />
        ))}
      </div>

      <LoadMore hasNextPage={hasNextPage} ref={ref} />
    </div>
  );
}
