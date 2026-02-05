"use client";

import type { StepDetail } from "@openplane/types/canvas/execution-ui";
import type {
  TimelineData,
  TimelineStep,
} from "@openplane/types/canvas/timeline";
import {
  Icons,
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@openplane/ui";
import { ExecutionTimeline } from "@openplane/ui/components/execution/execution-timeline";
import { StepDetailPanel } from "@openplane/ui/components/execution/step-detail-panel";
import { TimelineHeader } from "@openplane/ui/components/execution/timeline-header";
import { ScrollArea } from "@openplane/ui/components/scroll-area";
import { Skeleton } from "@openplane/ui/components/skeleton";
import { cn } from "@openplane/ui/utils";
import { AnimatePresence, motion } from "motion/react";
import { forwardRef, useMemo, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";

type ExecutionDetailViewProps = React.ComponentProps<"div"> & {
  executionData?: TimelineData;
  isLoading?: boolean;
  selectedStepId?: string;
  onStepSelect?: (stepId: string | undefined) => void;
  onRerunStep?: (stepId: string) => void;
  onCloseStepDetail?: () => void;
};

function timelineStepToStepDetail(step: TimelineStep): StepDetail {
  return {
    id: step.id,
    nodeId: step.nodeId,
    nodeType: step.nodeType,
    nodeName: step.nodeName,
    status: step.status,
    error: step.error,
    input: step.input,
    output: step.output,
    tokenUsage: step.tokenUsage,
    startedAt: step.startedAt,
    completedAt: step.completedAt,
    durationMs: step.durationMs,
  };
}

const ExecutionDetailView = forwardRef<
  HTMLDivElement,
  ExecutionDetailViewProps
>(
  (
    {
      executionData,
      isLoading = false,
      selectedStepId,
      onStepSelect,
      onRerunStep,
      onCloseStepDetail,
      className,
      ...props
    },
    ref
  ) => {
    const [detailPanelSize, setDetailPanelSize] = useState(35);

    const selectedStep = useMemo(() => {
      if (!(selectedStepId && executionData)) {
        return;
      }
      const step = executionData.steps.find((s) => s.id === selectedStepId);
      return step ? timelineStepToStepDetail(step) : undefined;
    }, [selectedStepId, executionData]);

    const handleStepClick = (step: TimelineStep) => {
      if (selectedStepId === step.id) {
        onStepSelect?.(undefined);
      } else {
        onStepSelect?.(step.id);
      }
    };

    const handleCloseDetail = () => {
      onStepSelect?.(undefined);
      onCloseStepDetail?.();
    };

    useHotkeys(
      "escape",
      () => {
        if (selectedStepId) {
          handleCloseDetail();
        }
      },
      { enabled: Boolean(selectedStepId) }
    );

    useHotkeys(
      "up",
      (e) => {
        e.preventDefault();
        if (!executionData || executionData.steps.length === 0) {
          return;
        }
        const currentIndex = selectedStepId
          ? executionData.steps.findIndex((s) => s.id === selectedStepId)
          : -1;
        const newIndex = Math.max(0, currentIndex - 1);
        const newStep = executionData.steps[newIndex];
        if (newStep) {
          onStepSelect?.(newStep.id);
        }
      },
      { enabled: Boolean(executionData) }
    );

    useHotkeys(
      "down",
      (e) => {
        e.preventDefault();
        if (!executionData || executionData.steps.length === 0) {
          return;
        }
        const currentIndex = selectedStepId
          ? executionData.steps.findIndex((s) => s.id === selectedStepId)
          : -1;
        const newIndex = Math.min(
          executionData.steps.length - 1,
          currentIndex + 1
        );
        const newStep = executionData.steps[newIndex];
        if (newStep) {
          onStepSelect?.(newStep.id);
        }
      },
      { enabled: Boolean(executionData) }
    );

    if (isLoading) {
      return (
        <div
          className={cn(
            "flex h-full min-h-0 flex-col overflow-hidden",
            className
          )}
          ref={ref}
          {...props}
        >
          <div className="border-border/30 border-b px-4 py-3">
            <div className="flex items-center gap-3">
              <Skeleton className="size-2 rounded-full" />
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="mt-2 h-1 w-full" />
          </div>
          <div className="flex-1 space-y-1 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                className="flex items-start gap-2.5 py-1.5"
                key={`skeleton-${i}`}
              >
                <div className="flex flex-col items-center pt-1">
                  <Skeleton className="size-2 rounded-full" />
                  {i < 4 && <Skeleton className="mt-1 h-6 w-px" />}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Skeleton className="size-3 rounded-sm" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (!executionData) {
      return (
        <div
          className={cn(
            "flex h-full min-h-0 flex-col items-center justify-center overflow-hidden",
            className
          )}
          ref={ref}
          {...props}
        >
          <div className="flex flex-col items-center text-center">
            <Icons.ListTree className="size-8 text-muted-foreground/50" />
            <h3 className="mt-3 font-medium text-sm">No execution selected</h3>
            <p className="mt-1 max-w-[220px] text-muted-foreground text-xs">
              Select an execution from the list to view its timeline.
            </p>
          </div>
        </div>
      );
    }

    const showDetailPanel = Boolean(selectedStep);

    return (
      <div
        className={cn(
          "flex h-full min-h-0 flex-col overflow-hidden",
          className
        )}
        ref={ref}
        {...props}
      >
        <div className="shrink-0 border-border/30 border-b px-4 py-3">
          <TimelineHeader
            durationMs={executionData.totalDurationMs}
            progress={executionData.progress}
            showProgress
            showTokens={false}
            size="md"
            status={executionData.status}
          />
        </div>

        <div className="flex-1 overflow-hidden">
          {showDetailPanel ? (
            <ResizablePanelGroup direction="horizontal">
              <ResizablePanel defaultSize={100 - detailPanelSize} minSize={40}>
                <ScrollArea className="h-full">
                  <div className="p-4">
                    <ExecutionTimeline
                      data={executionData}
                      onStepClick={handleStepClick}
                      selectedStepId={selectedStepId}
                      showConnector
                      showDuration
                      showRetryBadge
                      size="md"
                    />
                  </div>
                </ScrollArea>
              </ResizablePanel>

              <ResizableHandle className="bg-border/40 transition-colors hover:bg-border/60" />

              <ResizablePanel
                defaultSize={detailPanelSize}
                minSize={25}
                onResize={setDetailPanelSize}
              >
                <AnimatePresence mode="wait">
                  {selectedStep && (
                    <motion.div
                      animate={{ opacity: 1, x: 0 }}
                      className="h-full"
                      exit={{ opacity: 0, x: 20 }}
                      initial={{ opacity: 0, x: 20 }}
                      key={selectedStep.id}
                      transition={{ duration: 0.15 }}
                    >
                      <StepDetailPanel
                        className="h-full"
                        onClose={handleCloseDetail}
                        onRerun={onRerunStep}
                        step={selectedStep}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </ResizablePanel>
            </ResizablePanelGroup>
          ) : (
            <ScrollArea className="h-full">
              <div className="p-4">
                <ExecutionTimeline
                  data={executionData}
                  onStepClick={handleStepClick}
                  selectedStepId={selectedStepId}
                  showConnector
                  showDuration
                  showRetryBadge
                  size="md"
                />
              </div>
            </ScrollArea>
          )}
        </div>
      </div>
    );
  }
);
ExecutionDetailView.displayName = "ExecutionDetailView";

export { ExecutionDetailView };
export type { ExecutionDetailViewProps };
