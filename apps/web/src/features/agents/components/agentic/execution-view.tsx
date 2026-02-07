"use client";

import type { ExecutionListItem } from "@openplane/types/canvas/execution-ui";
import type { TimelineData } from "@openplane/types/canvas/timeline";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@openplane/ui";
import { cn } from "@openplane/ui/utils";
import { forwardRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { ExecutionDetailView } from "./execution-detail-view";
import { ExecutionListSidebar } from "./execution-list-sidebar";

type ExecutionViewProps = Omit<React.ComponentProps<"div">, "onSelect"> & {
  agentId: string;
  executions: ExecutionListItem[];
  selectedExecutionId?: string;
  selectedExecutionData?: TimelineData;
  isLoadingExecutions?: boolean;
  isLoadingDetail?: boolean;
  hasMoreExecutions?: boolean;
  onSelectExecution?: (execution: ExecutionListItem) => void;
  onLoadMoreExecutions?: () => void;
  onRerunStep?: (stepId: string) => void;
  onCloseStepDetail?: () => void;
};

const ExecutionView = forwardRef<HTMLDivElement, ExecutionViewProps>(
  (
    {
      agentId,
      executions,
      selectedExecutionId,
      selectedExecutionData,
      isLoadingExecutions = false,
      isLoadingDetail = false,
      hasMoreExecutions = false,
      onSelectExecution,
      onLoadMoreExecutions,
      onRerunStep,
      onCloseStepDetail,
      className,
      ...props
    },
    ref
  ) => {
    const [selectedStepId, setSelectedStepId] = useState<string | undefined>();

    const handleStepSelect = (stepId: string | undefined) => {
      setSelectedStepId(stepId);
    };

    const navigateExecution = (direction: "up" | "down") => {
      if (executions.length === 0) {
        return;
      }

      const currentIndex = selectedExecutionId
        ? executions.findIndex((e) => e.id === selectedExecutionId)
        : -1;

      const newIndex =
        direction === "up"
          ? Math.max(0, currentIndex - 1)
          : Math.min(executions.length - 1, currentIndex + 1);

      const newExecution = executions[newIndex];
      if (newExecution && newExecution.id !== selectedExecutionId) {
        onSelectExecution?.(newExecution);
        setSelectedStepId(undefined);
      }
    };

    useHotkeys(
      "mod+up",
      (e) => {
        e.preventDefault();
        navigateExecution("up");
      },
      { enabled: executions.length > 0 }
    );

    useHotkeys(
      "mod+down",
      (e) => {
        e.preventDefault();
        navigateExecution("down");
      },
      { enabled: executions.length > 0 }
    );

    return (
      <div
        className={cn(
          "flex h-full min-h-0 flex-col overflow-hidden",
          className
        )}
        ref={ref}
        {...props}
      >
        <ResizablePanelGroup className="min-h-0 flex-1" direction="horizontal">
          <ResizablePanel
            className="min-w-[280px]"
            defaultSize={30}
            maxSize={40}
            minSize={20}
          >
            <ExecutionListSidebar
              agentId={agentId}
              className="h-full"
              executions={executions}
              hasMore={hasMoreExecutions}
              isLoading={isLoadingExecutions}
              onLoadMore={onLoadMoreExecutions}
              onSelect={onSelectExecution}
              selectedId={selectedExecutionId}
            />
          </ResizablePanel>

          <ResizableHandle className="bg-border/40 transition-colors hover:bg-border/60" />

          <ResizablePanel className="min-w-[400px]" defaultSize={70}>
            <ExecutionDetailView
              className="h-full"
              executionData={selectedExecutionData}
              isLoading={isLoadingDetail}
              onCloseStepDetail={onCloseStepDetail}
              onRerunStep={onRerunStep}
              onStepSelect={handleStepSelect}
              selectedStepId={selectedStepId}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    );
  }
);
ExecutionView.displayName = "ExecutionView";

export { ExecutionView };
export type { ExecutionViewProps };
