"use client";

import type { ExecutionTrace, StepExecution } from "@openbeam/types/canvas";
import type { ExecutionPanelTab } from "@openbeam/types/canvas/execution-ui";
import type {
  TimelineData,
  TimelineStep,
} from "@openbeam/types/canvas/timeline";
import { forwardRef, useMemo } from "react";
import {
  useCurrentExecution,
  useExecutionFilter,
  useExecutionPanelTab,
  useExecutionSelectedStep,
  useExecutionStore,
  useExecutionViewMode,
} from "../../stores";
import { cn } from "../../utils/cn";
import { Icons } from "../icons";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "../resizable";
import { ScrollArea } from "../scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../tabs";
import { ExecutionTimeline } from "./execution-timeline";
import { StepDetailPanel } from "./step-detail-panel";
import { TimelineControls } from "./timeline-controls";
import { TimelineGantt } from "./timeline-gantt";
import { TimelineHeader } from "./timeline-header";

type ExecutionPanelProps = React.ComponentProps<"div"> & {
  execution?: ExecutionTrace;
  onStepRerun?: (stepId: string) => void;
};

function executionToTimelineData(execution: ExecutionTrace): TimelineData {
  const steps: TimelineStep[] = execution.steps.map((step) => ({
    id: step.nodeId,
    nodeId: step.nodeId,
    nodeType: step.nodeType,
    nodeName: step.nodeType,
    status: mapExecutionStatus(step.status),
    startedAt: step.startedAt,
    completedAt: step.completedAt,
    durationMs: step.latencyMs,
    error: step.error,
    retryCount: 0,
    attempt: 1,
    depth: 0,
  }));

  const completedSteps = steps.filter(
    (s) => s.status === "success" || s.status === "error"
  ).length;

  return {
    executionId: execution.id,
    status: execution.status,
    steps,
    events: [],
    startedAt: execution.startedAt,
    completedAt: execution.completedAt,
    totalDurationMs: execution.totalLatencyMs,
    progress: {
      completed: completedSteps,
      total: steps.length,
      percentage: steps.length > 0 ? (completedSteps / steps.length) * 100 : 0,
    },
  };
}

function mapExecutionStatus(
  status: StepExecution["status"]
): TimelineStep["status"] {
  switch (status) {
    case "PENDING":
      return "pending";
    case "RUNNING":
      return "running";
    case "COMPLETED":
      return "success";
    case "FAILED":
      return "error";
    case "CANCELLED":
      return "cancelled";
    case "TIMED_OUT":
      return "error";
    case "WAITING_APPROVAL":
    case "WAITING_INPUT":
      return "queued";
    default:
      return "pending";
  }
}

const ExecutionPanel = forwardRef<HTMLDivElement, ExecutionPanelProps>(
  ({ execution: propExecution, onStepRerun, className, ...props }, ref) => {
    const storeExecution = useCurrentExecution();
    const filter = useExecutionFilter();
    const viewMode = useExecutionViewMode();
    const selectedStepId = useExecutionSelectedStep();
    const activeTab = useExecutionPanelTab();
    const store = useExecutionStore();

    const execution = propExecution ?? storeExecution;

    const timelineData = useMemo(() => {
      if (!execution) {
        return null;
      }
      return executionToTimelineData(execution);
    }, [execution]);

    const selectedStep = useMemo(() => {
      if (!(selectedStepId && execution)) {
        return null;
      }
      const step = execution.steps.find((s) => s.nodeId === selectedStepId);
      if (!step) {
        return null;
      }
      return {
        id: step.nodeId,
        nodeId: step.nodeId,
        nodeType: step.nodeType,
        nodeName: step.nodeType,
        status: mapExecutionStatus(step.status),
        input: step.input,
        output: step.output,
        error: step.error,
        startedAt: step.startedAt,
        completedAt: step.completedAt,
        durationMs: step.latencyMs,
        tokenUsage: step.tokenUsage,
      };
    }, [selectedStepId, execution]);

    if (!(execution && timelineData)) {
      return (
        <div
          className={cn(
            "flex h-full items-center justify-center text-muted-foreground",
            className
          )}
          ref={ref}
          {...props}
        >
          <div className="text-center">
            <Icons.ListTree className="mx-auto size-8 opacity-50" />
            <p className="mt-2 text-sm">No execution selected</p>
          </div>
        </div>
      );
    }

    const handleStepClick = (step: TimelineStep) => {
      store.selectStep(step.nodeId);
    };

    const handleTabChange = (value: string) => {
      store.setActiveTab(value as ExecutionPanelTab);
    };

    return (
      <div
        className={cn("flex h-full flex-col", className)}
        ref={ref}
        {...props}
      >
        <div className="border-b p-4">
          <TimelineHeader
            durationMs={execution.totalLatencyMs}
            progress={timelineData.progress}
            status={execution.status}
            tokenUsage={execution.totalTokenUsage}
          />
        </div>

        <Tabs
          className="flex flex-1 flex-col overflow-hidden"
          onValueChange={handleTabChange}
          value={activeTab}
        >
          <div className="flex items-center justify-between border-b px-4">
            <TabsList className="h-10 w-auto">
              <TabsTrigger className="gap-1.5" value="timeline">
                <Icons.ListTree className="size-3.5" />
                Timeline
              </TabsTrigger>
              <TabsTrigger className="gap-1.5" value="logs">
                <Icons.FileText className="size-3.5" />
                Logs
              </TabsTrigger>
              <TabsTrigger className="gap-1.5" value="input">
                <Icons.ArrowRight className="size-3.5" />
                Input
              </TabsTrigger>
              <TabsTrigger className="gap-1.5" value="output">
                <Icons.ArrowLeft className="size-3.5" />
                Output
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent className="mt-0 flex-1 overflow-hidden" value="timeline">
            <ResizablePanelGroup direction="horizontal">
              <ResizablePanel
                defaultSize={selectedStep ? 60 : 100}
                minSize={40}
              >
                <div className="flex h-full flex-col">
                  <div className="border-b p-3">
                    <TimelineControls
                      filter={filter}
                      onFilterChange={(f) => store.setFilter(f)}
                      onViewModeChange={(m) => store.setViewMode(m)}
                      viewMode={viewMode}
                    />
                  </div>
                  <ScrollArea className="flex-1 p-4">
                    {viewMode === "gantt" ? (
                      <TimelineGantt
                        endTime={timelineData.completedAt}
                        onStepClick={handleStepClick}
                        selectedStepId={selectedStepId}
                        startTime={timelineData.startedAt}
                        steps={timelineData.steps}
                      />
                    ) : (
                      <ExecutionTimeline
                        data={timelineData}
                        filter={filter}
                        onStepClick={handleStepClick}
                        selectedStepId={selectedStepId}
                      />
                    )}
                  </ScrollArea>
                </div>
              </ResizablePanel>

              {selectedStep && (
                <>
                  <ResizableHandle withHandle />
                  <ResizablePanel defaultSize={40} minSize={30}>
                    <StepDetailPanel
                      onClose={() => store.selectStep(null)}
                      onRerun={onStepRerun}
                      step={selectedStep}
                    />
                  </ResizablePanel>
                </>
              )}
            </ResizablePanelGroup>
          </TabsContent>

          <TabsContent className="mt-0 flex-1 overflow-hidden" value="logs">
            <ScrollArea className="h-full p-4">
              <div className="font-mono text-muted-foreground text-xs">
                {execution.steps.map((step, index) => (
                  <div className="py-1" key={step.nodeId}>
                    <span className="text-muted-foreground/60">
                      [{index + 1}]
                    </span>{" "}
                    <span
                      className={cn(
                        step.status === "COMPLETED" && "text-green-500",
                        step.status === "FAILED" && "text-destructive",
                        step.status === "RUNNING" && "text-primary"
                      )}
                    >
                      {step.nodeType}
                    </span>
                    {step.latencyMs && (
                      <span className="ml-2 text-muted-foreground/60">
                        ({step.latencyMs}ms)
                      </span>
                    )}
                    {step.error && (
                      <div className="ml-4 text-destructive">{step.error}</div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent className="mt-0 flex-1 overflow-hidden" value="input">
            <ScrollArea className="h-full p-4">
              <pre className="text-xs">
                {JSON.stringify(execution.input, null, 2)}
              </pre>
            </ScrollArea>
          </TabsContent>

          <TabsContent className="mt-0 flex-1 overflow-hidden" value="output">
            <ScrollArea className="h-full p-4">
              <pre className="text-xs">
                {JSON.stringify(execution.output, null, 2)}
              </pre>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    );
  }
);
ExecutionPanel.displayName = "ExecutionPanel";

export { ExecutionPanel };
export type { ExecutionPanelProps };
