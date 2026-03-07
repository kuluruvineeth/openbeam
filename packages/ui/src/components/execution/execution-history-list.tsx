"use client";

import type { ExecutionStatus } from "@openbeam/types/canvas/execution";
import type {
  ExecutionHistoryFilter,
  ExecutionHistorySort,
  ExecutionListItem,
} from "@openbeam/types/canvas/execution-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, useMemo, useState } from "react";
import { cn } from "../../utils/cn";
import { formatDurationPrecise } from "../../utils/format";
import { Button } from "../button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../dropdown-menu";
import { Icons } from "../icons";
import { Input } from "../input";
import { ScrollArea } from "../scroll-area";
import { Skeleton } from "../skeleton";

const executionHistoryListVariants = cva("", {
  variants: {
    size: {
      sm: "text-xs",
      md: "text-sm",
      lg: "text-base",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

const executionItemVariants = cva(
  "relative flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors",
  {
    variants: {
      selected: {
        true: "before:absolute before:inset-y-0 before:left-0 before:w-[2px] before:bg-foreground",
        false: "hover:bg-[#F2F1EF]/40 dark:hover:bg-[#1A1A1A]/40",
      },
    },
    defaultVariants: {
      selected: false,
    },
  }
);

type ExecutionHistoryListProps = Omit<React.ComponentProps<"div">, "onSelect"> &
  VariantProps<typeof executionHistoryListVariants> & {
    executions: ExecutionListItem[];
    selectedId?: string;
    isLoading?: boolean;
    onSelect?: (execution: ExecutionListItem) => void;
    onLoadMore?: () => void;
    hasMore?: boolean;
  };

const statusOptions: { value: ExecutionStatus; label: string }[] = [
  { value: "PENDING", label: "Pending" },
  { value: "RUNNING", label: "Running" },
  { value: "COMPLETED", label: "Completed" },
  { value: "FAILED", label: "Failed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "TIMED_OUT", label: "Timed Out" },
  { value: "WAITING_APPROVAL", label: "Waiting Approval" },
  { value: "WAITING_INPUT", label: "Waiting Input" },
];

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) {
    return "Just now";
  }
  if (diffMins < 60) {
    return `${diffMins}m ago`;
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }
  return date.toLocaleDateString();
}

const statusDotColors: Record<string, string> = {
  PENDING: "bg-muted-foreground",
  RUNNING: "bg-foreground",
  COMPLETED: "bg-[#00C853]",
  FAILED: "bg-destructive",
  CANCELLED: "bg-muted-foreground",
  TIMED_OUT: "bg-destructive",
  WAITING_APPROVAL: "bg-[#FFB300]",
  WAITING_INPUT: "bg-[#FFB300]",
};

const ExecutionHistoryItem = forwardRef<
  HTMLButtonElement,
  {
    execution: ExecutionListItem;
    selected?: boolean;
    onClick?: () => void;
  }
>(({ execution, selected, onClick }, ref) => {
  const isRunning = execution.status === "RUNNING";
  const dotColor = statusDotColors[execution.status] ?? "bg-muted-foreground";

  return (
    <button
      className={cn(executionItemVariants({ selected }), "w-full text-left")}
      onClick={onClick}
      ref={ref}
      type="button"
    >
      <div className="relative flex shrink-0 items-center justify-center">
        <span
          className={cn(
            "size-[6px] rounded-full",
            dotColor,
            isRunning && "animate-pulse"
          )}
        />
        {isRunning && (
          <span
            className={cn(
              "absolute size-[6px] animate-ping rounded-full",
              dotColor,
              "opacity-75"
            )}
          />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <span className="block truncate font-medium text-[13px]">
          {execution.agentCanvasName}
        </span>
        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="tabular-nums">v{execution.versionNumber}</span>
          {execution.durationMs && (
            <>
              <span className="text-muted-foreground/40">·</span>
              <span className="tabular-nums">
                {formatDurationPrecise(execution.durationMs)}
              </span>
            </>
          )}
          <span className="text-muted-foreground/40">·</span>
          <span>{formatRelativeTime(execution.createdAt)}</span>
        </div>
      </div>
    </button>
  );
});
ExecutionHistoryItem.displayName = "ExecutionHistoryItem";

const ExecutionHistoryItemSkeleton = () => (
  <div className="flex items-center gap-3 p-3">
    <Skeleton className="size-[6px] rounded-full" />
    <div className="flex-1 space-y-1.5">
      <Skeleton className="h-[13px] w-2/3" />
      <Skeleton className="h-[11px] w-1/2" />
    </div>
  </div>
);

const ExecutionHistoryList = forwardRef<
  HTMLDivElement,
  ExecutionHistoryListProps
>(
  (
    {
      executions,
      selectedId,
      isLoading,
      onSelect,
      onLoadMore,
      hasMore,
      size,
      className,
      ...props
    },
    ref
  ) => {
    const [filter, setFilter] = useState<ExecutionHistoryFilter>({});
    const [sort, setSort] = useState<ExecutionHistorySort>({
      field: "createdAt",
      direction: "desc",
    });

    const filteredExecutions = useMemo(() => {
      let result = [...executions];

      if (filter.status?.length) {
        result = result.filter((e) => filter.status?.includes(e.status));
      }

      if (filter.search) {
        const searchLower = filter.search.toLowerCase();
        result = result.filter(
          (e) =>
            e.agentCanvasName.toLowerCase().includes(searchLower) ||
            e.triggeredByName?.toLowerCase().includes(searchLower)
        );
      }

      result.sort((a, b) => {
        let comparison = 0;
        switch (sort.field) {
          case "createdAt":
            comparison =
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            break;
          case "startedAt":
            comparison =
              new Date(a.startedAt ?? "").getTime() -
              new Date(b.startedAt ?? "").getTime();
            break;
          case "durationMs":
            comparison = (a.durationMs ?? 0) - (b.durationMs ?? 0);
            break;
          case "status":
            comparison = a.status.localeCompare(b.status);
            break;
          default:
            break;
        }
        return sort.direction === "desc" ? -comparison : comparison;
      });

      return result;
    }, [executions, filter, sort]);

    const toggleStatusFilter = (status: ExecutionStatus) => {
      const current = filter.status ?? [];
      const newStatus = current.includes(status)
        ? current.filter((s) => s !== status)
        : [...current, status];
      setFilter({
        ...filter,
        status: newStatus.length > 0 ? newStatus : undefined,
      });
    };

    const hasActiveFilters =
      (filter.status?.length ?? 0) > 0 || Boolean(filter.search);

    return (
      <div
        className={cn(
          executionHistoryListVariants({ size }),
          "flex h-full min-h-0 flex-col overflow-hidden",
          className
        )}
        ref={ref}
        {...props}
      >
        <div className="flex shrink-0 items-center gap-1.5 px-2 py-2">
          <div className="relative flex-1">
            <Icons.Search className="-translate-y-1/2 absolute top-1/2 left-2 size-3 text-muted-foreground" />
            <Input
              className="h-7 border-0 bg-transparent pl-7 text-xs shadow-none focus-visible:ring-0"
              onChange={(e) =>
                setFilter({ ...filter, search: e.target.value || undefined })
              }
              placeholder="Search..."
              value={filter.search ?? ""}
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                className={cn("size-7", hasActiveFilters && "text-foreground")}
                size="icon"
                title="Filter"
                variant="ghost"
              >
                <Icons.Filter className="size-3.5" />
                {hasActiveFilters && (
                  <span className="-top-0.5 -right-0.5 absolute flex size-3.5 items-center justify-center rounded-full bg-foreground text-[9px] text-background">
                    {filter.status?.length ?? 0}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuLabel className="text-xs">Status</DropdownMenuLabel>
              {statusOptions.map((option) => (
                <DropdownMenuCheckboxItem
                  checked={filter.status?.includes(option.value) ?? false}
                  className="text-xs"
                  key={option.value}
                  onCheckedChange={() => toggleStatusFilter(option.value)}
                >
                  {option.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                className="size-7"
                size="icon"
                title="Sort"
                variant="ghost"
              >
                <Icons.ChevronDown className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuLabel className="text-xs">Sort by</DropdownMenuLabel>
              <DropdownMenuCheckboxItem
                checked={sort.field === "createdAt"}
                className="text-xs"
                onCheckedChange={() => setSort({ ...sort, field: "createdAt" })}
              >
                Created
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={sort.field === "durationMs"}
                className="text-xs"
                onCheckedChange={() =>
                  setSort({ ...sort, field: "durationMs" })
                }
              >
                Duration
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={sort.field === "status"}
                className="text-xs"
                onCheckedChange={() => setSort({ ...sort, field: "status" })}
              >
                Status
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={sort.direction === "desc"}
                className="text-xs"
                onCheckedChange={() =>
                  setSort({
                    ...sort,
                    direction: sort.direction === "desc" ? "asc" : "desc",
                  })
                }
              >
                Descending
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <ScrollArea className="flex-1">
          <div className="space-y-0.5 p-2">
            {(() => {
              if (isLoading && executions.length === 0) {
                return Array.from({ length: 5 }).map((_, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders have no identity
                  <ExecutionHistoryItemSkeleton key={i} />
                ));
              }
              if (filteredExecutions.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Icons.ListTree className="size-6 text-muted-foreground/50" />
                    <p className="mt-3 font-medium text-sm">
                      {hasActiveFilters
                        ? "No matching executions"
                        : "No executions yet"}
                    </p>
                    <p className="mt-1 max-w-[180px] text-muted-foreground text-xs">
                      {hasActiveFilters
                        ? "Try adjusting your filters."
                        : "Run your first workflow to see it here."}
                    </p>
                  </div>
                );
              }
              return filteredExecutions.map((execution) => (
                <ExecutionHistoryItem
                  execution={execution}
                  key={execution.id}
                  onClick={() => onSelect?.(execution)}
                  selected={selectedId === execution.id}
                />
              ));
            })()}
            {hasMore && (
              <Button
                className="w-full"
                disabled={isLoading}
                onClick={onLoadMore}
                variant="ghost"
              >
                {isLoading ? (
                  <Icons.Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Icons.ChevronDown className="mr-2 size-4" />
                )}
                Load more
              </Button>
            )}
          </div>
        </ScrollArea>
      </div>
    );
  }
);
ExecutionHistoryList.displayName = "ExecutionHistoryList";

export {
  ExecutionHistoryList,
  ExecutionHistoryItem,
  ExecutionHistoryItemSkeleton,
  executionHistoryListVariants,
  executionItemVariants,
};
export type { ExecutionHistoryListProps };
