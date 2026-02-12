"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { getVanillaTRPCClient } from "@/trpc/client";
import { useMissionFilterParams } from "../hooks/use-mission-filter-params";
import { MissionCardGrid } from "./mission-card-grid";
import { MissionCreateSheet } from "./mission-create-sheet";
import { MissionEmptyState } from "./mission-empty-state";
import {
  type DashboardStats,
  MissionSummaryCards,
} from "./mission-summary-cards";
import { MissionToolbar } from "./mission-toolbar";
import { MissionDataTable } from "./table/mission-data-table";
import { MissionTableSkeleton } from "./table/mission-table-skeleton";

const PAGE_SIZE = 20;

export function MissionDashboard() {
  const router = useRouter();
  const { search, status, viewMode, hasActiveFilters, clearFilters } =
    useMissionFilterParams();
  const [createOpen, setCreateOpen] = useState(false);

  const statusFilter = status.length === 1 ? status[0] : undefined;

  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ["missionControl", "getBoard", { status: statusFilter }],
      queryFn: async ({ pageParam = 0 }) => {
        const client = getVanillaTRPCClient();
        return await client.missionControl.getBoard.query({
          status: statusFilter as
            | "DRAFT"
            | "ACTIVE"
            | "PAUSED"
            | "COMPLETED"
            | "CANCELLED"
            | "ARCHIVED"
            | undefined,
          limit: PAGE_SIZE,
          offset: pageParam,
        });
      },
      getNextPageParam: (lastPage) =>
        lastPage.hasMore ? lastPage.nextOffset : undefined,
      initialPageParam: 0,
    });

  const missions = useMemo(
    () => data?.pages.flatMap((p) => p.items) ?? [],
    [data]
  );

  const filteredMissions = useMemo(() => {
    let result = missions;
    if (status.length > 1) {
      const statusSet = new Set(status);
      result = result.filter((m) => statusSet.has(m.status));
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((m) => m.name.toLowerCase().includes(q));
    }
    return result;
  }, [missions, status, search]);

  const stats = useMemo((): DashboardStats => {
    const totalTasks = missions.reduce((sum, m) => sum + m.taskCount, 0);
    const completedTasks = missions.reduce(
      (sum, m) => sum + m.completedTasks,
      0
    );

    return {
      activeMissions: missions.filter((m) => m.status === "ACTIVE").length,
      totalAgents: missions.reduce((sum, m) => sum + m.agentCount, 0),
      completionRate: totalTasks > 0 ? completedTasks / totalTasks : 0,
      totalCostCents: missions.reduce((sum, m) => sum + m.totalCostCents, 0),
    };
  }, [missions]);

  const handleRowClick = useCallback(
    (id: string) => {
      const href = `/missions/${id}`;
      router.push(href);
    },
    [router]
  );

  const hasMissions = missions.length > 0;
  const showFullChrome = hasMissions || hasActiveFilters || isLoading;

  return (
    <div className="flex flex-col gap-4 px-6">
      {showFullChrome ? (
        <>
          <MissionToolbar onCreateClick={() => setCreateOpen(true)} />
          {hasMissions && <MissionSummaryCards stats={stats} />}

          {(() => {
            if (isLoading) {
              return <MissionTableSkeleton />;
            }
            if (filteredMissions.length === 0) {
              return (
                <MissionEmptyState
                  onClearFilters={hasActiveFilters ? clearFilters : undefined}
                  onCreateClick={() => setCreateOpen(true)}
                  variant="no-results"
                />
              );
            }
            if (viewMode === "table") {
              return (
                <MissionDataTable
                  data={filteredMissions}
                  fetchNextPage={fetchNextPage}
                  hasMore={hasNextPage ?? false}
                  isFetchingNextPage={isFetchingNextPage}
                  onRowClick={handleRowClick}
                />
              );
            }
            return (
              <MissionCardGrid
                missions={filteredMissions}
                onMissionClick={handleRowClick}
              />
            );
          })()}
        </>
      ) : (
        <MissionEmptyState
          onCreateClick={() => setCreateOpen(true)}
          variant="empty"
        />
      )}

      <MissionCreateSheet
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
      />
    </div>
  );
}
