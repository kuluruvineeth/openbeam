"use client";

import type { ExecutionListItem } from "@openplane/types/canvas/execution-ui";
import { Icons } from "@openplane/ui";
import { Button } from "@openplane/ui/components/button";
import { ExecutionHistoryList } from "@openplane/ui/components/execution/execution-history-list";
import { cn } from "@openplane/ui/utils";
import { forwardRef } from "react";

type ExecutionListSidebarProps = Omit<
  React.ComponentProps<"div">,
  "onSelect"
> & {
  agentId: string;
  executions: ExecutionListItem[];
  selectedId?: string;
  isLoading?: boolean;
  hasMore?: boolean;
  onSelect?: (execution: ExecutionListItem) => void;
  onLoadMore?: () => void;
  onRefresh?: () => void;
};

const ExecutionListSidebar = forwardRef<
  HTMLDivElement,
  ExecutionListSidebarProps
>(
  (
    {
      agentId,
      executions,
      selectedId,
      isLoading = false,
      hasMore = false,
      onSelect,
      onLoadMore,
      onRefresh,
      className,
      ...props
    },
    ref
  ) => (
    <div
      className={cn("flex h-full min-h-0 flex-col overflow-hidden", className)}
      ref={ref}
      {...props}
    >
      <div className="flex shrink-0 items-center justify-between px-4 py-3">
        <span className="font-medium text-[13px]">History</span>
        {onRefresh && (
          <Button
            className="size-6"
            disabled={isLoading}
            onClick={onRefresh}
            size="icon"
            variant="ghost"
          >
            <Icons.RefreshCw
              className={cn("size-3", isLoading && "animate-spin")}
            />
          </Button>
        )}
      </div>

      <ExecutionHistoryList
        className="flex-1"
        executions={executions}
        hasMore={hasMore}
        isLoading={isLoading}
        onLoadMore={onLoadMore}
        onSelect={onSelect}
        selectedId={selectedId}
        size="sm"
      />
    </div>
  )
);
ExecutionListSidebar.displayName = "ExecutionListSidebar";

export { ExecutionListSidebar };
export type { ExecutionListSidebarProps };
