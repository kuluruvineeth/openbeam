"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { getVanillaTRPCClient } from "@/trpc/client";
import { useMissionFilterParams } from "../hooks/use-mission-filter-params";
import { useMissionListStore } from "../stores/mission-list-store";
import { MissionBulkBar } from "./mission-bulk-bar";
import { MissionCardGrid } from "./mission-card-grid";
import { MissionCreateSheet } from "./mission-create-sheet";
import { MissionEmptyState } from "./mission-empty-state";
import { MissionStatusTabs } from "./mission-status-tabs";
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
  const [params, setParams] = useMissionFilterParams();
  const viewMode = useMissionListStore((s) => s.viewMode);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [createOpen, setCreateOpen] = useState(false);

  const statusFilter = params.status === "all" ? undefined : params.status;

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

  const stats = useMemo((): DashboardStats | undefined => {
    if (missions.length === 0) {
      return;
    }

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

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: missions.length };
    for (const m of missions) {
      counts[m.status] = (counts[m.status] ?? 0) + 1;
    }
    return counts;
  }, [missions]);

  const handleRowClick = useCallback(
    (id: string) => {
      const href = `/missions/${id}`;
      router.push(href as Parameters<typeof router.push>[0]);
    },
    [router]
  );

  const handleToggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleToggleAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === missions.length) {
        return new Set();
      }
      return new Set(missions.map((m) => m.id));
    });
  }, [missions]);

  const handleClearFilters = useCallback(() => {
    setParams({ status: "all", search: "" });
  }, [setParams]);

  const hasActiveFilters = params.status !== "all" || params.search !== "";

  return (
    <div className="flex flex-col gap-4 p-6">
      <MissionToolbar
        onCreateClick={() => setCreateOpen(true)}
        resultCount={missions.length}
      />
      <MissionStatusTabs counts={statusCounts} />
      <MissionSummaryCards isLoading={isLoading} stats={stats} />

      {(() => {
        if (isLoading) {
          return <MissionTableSkeleton />;
        }
        if (missions.length === 0) {
          return (
            <MissionEmptyState
              onClearFilters={hasActiveFilters ? handleClearFilters : undefined}
              onCreateClick={() => setCreateOpen(true)}
              variant={hasActiveFilters ? "no-results" : "empty"}
            />
          );
        }
        if (viewMode === "table") {
          return (
            <MissionDataTable
              data={missions}
              fetchNextPage={fetchNextPage}
              hasMore={hasNextPage ?? false}
              isFetchingNextPage={isFetchingNextPage}
              onRowClick={handleRowClick}
              onToggleAll={handleToggleAll}
              onToggleSelection={handleToggleSelection}
              selectedIds={selectedIds}
            />
          );
        }
        return (
          <MissionCardGrid
            missions={missions}
            onMissionClick={handleRowClick}
          />
        );
      })()}

      <MissionBulkBar
        onDeselect={() => setSelectedIds(new Set())}
        selectedCount={selectedIds.size}
      />

      <MissionCreateSheet
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
      />
    </div>
  );
}
