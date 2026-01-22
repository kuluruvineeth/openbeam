"use client";

import { Badge } from "@openplane/ui/components/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@openplane/ui/components/table";
import { useInfiniteQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { useEffect, useMemo } from "react";
import { useInView } from "react-intersection-observer";
import { useTRPC } from "@/trpc/client";
import type { AgentStatus } from "../hooks/use-agent-filters";
import { AgentItemActions } from "./agent-item-actions";
import { AgentsEmptyState, AgentsNoResults } from "./agents-empty";
import { AgentsTableSkeleton } from "./agents-skeleton";
import { LoadMore } from "./load-more";

function parseIcon(icon: string | null): { emoji: string; color: string } {
  if (!icon) {
    return { emoji: "🤖", color: "#3b82f6" };
  }
  const parts = icon.split("|");
  if (parts.length === 2) {
    return { emoji: parts[0] || "🤖", color: parts[1] || "#3b82f6" };
  }
  return { emoji: icon || "🤖", color: "#3b82f6" };
}

type ApiStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

const statusToApiMap: Record<AgentStatus, ApiStatus> = {
  draft: "DRAFT",
  active: "PUBLISHED",
  paused: "ARCHIVED",
  archived: "ARCHIVED",
};

const statusConfig = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground" },
  active: { label: "Active", className: "bg-green-500/10 text-green-500" },
  paused: { label: "Paused", className: "bg-yellow-500/10 text-yellow-500" },
  archived: { label: "Archived", className: "bg-muted text-muted-foreground" },
};

function getAgentStatus(status: string): keyof typeof statusConfig {
  if (status === "PUBLISHED") {
    return "active";
  }
  if (status === "DRAFT") {
    return "draft";
  }
  return "archived";
}

type AgentsTableProps = {
  status?: AgentStatus[];
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
};

export function AgentsTable({
  status,
  hasActiveFilters = false,
  onClearFilters,
}: AgentsTableProps) {
  const { ref, inView } = useInView({ threshold: 0 });
  const trpc = useTRPC();

  const apiStatus =
    status && status.length > 0 ? statusToApiMap[status[0]] : undefined;

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useInfiniteQuery({
      ...trpc.agentCanvas.list.infiniteQueryOptions(
        {
          limit: 20,
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
    return <AgentsTableSkeleton />;
  }

  if (agents.length === 0) {
    if (hasActiveFilters && onClearFilters) {
      return <AgentsNoResults onClear={onClearFilters} />;
    }
    return <AgentsEmptyState />;
  }

  return (
    <div className="border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[300px]">Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Version</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead className="w-[100px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {agents.map((agent) => {
            const agentStatus = getAgentStatus(agent.status);
            const statusInfo = statusConfig[agentStatus];
            const { emoji, color } = parseIcon(agent.icon);

            return (
              <TableRow className="group" key={agent.id}>
                <TableCell>
                  <Link
                    className="flex items-center gap-3"
                    href={`/agents/${agent.id}`}
                  >
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md"
                      style={{ backgroundColor: `${color}20` }}
                    >
                      <span className="text-lg">{emoji}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-primary text-sm">
                        {agent.name}
                      </p>
                      <p className="line-clamp-1 text-muted-foreground text-xs">
                        {agent.description || "No description"}
                      </p>
                    </div>
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge
                    className={`rounded-full text-xs ${statusInfo.className}`}
                  >
                    {statusInfo.label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="text-muted-foreground text-sm">
                    v{agent.version}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-muted-foreground text-sm">
                    {formatDistanceToNow(new Date(agent.updatedAt), {
                      addSuffix: true,
                    })}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end opacity-0 transition-opacity group-hover:opacity-100">
                    <AgentItemActions id={agent.id} name={agent.name} />
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <LoadMore hasNextPage={hasNextPage} ref={ref} />
    </div>
  );
}
