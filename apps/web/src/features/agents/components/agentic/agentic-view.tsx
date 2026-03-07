"use client";

import type { ExecutionStatus } from "@openbeam/types/canvas/execution";
import type { ExecutionListItem } from "@openbeam/types/canvas/execution-ui";
import type {
  TimelineData,
  TimelineStep,
  TimelineStepStatus,
} from "@openbeam/types/canvas/timeline";
import { Button, Icons } from "@openbeam/ui";
import { TooltipProvider } from "@openbeam/ui/components/tooltip";
import { cn } from "@openbeam/ui/utils";
import { useQuery } from "@tanstack/react-query";
import { m } from "motion/react";
import { parseAsString, parseAsStringLiteral, useQueryState } from "nuqs";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { useShallow } from "zustand/react/shallow";
import { useNow } from "@/lib/hooks/use-now";
import { useTRPC } from "@/trpc/client";
import { useCanvasKeyboard } from "../../hooks/use-canvas-keyboard";
import { useCanvasPersistence } from "../../hooks/use-canvas-persistence";
import { useAgenticRuntimeStore } from "../../stores/agentic-runtime-store";
import { useChatPanelStore } from "../../stores/chat-panel-store";
import {
  AgenticViewHeader,
  AgenticViewHeaderSkeleton,
} from "./agentic-view-header";
import type { AgentViewTab } from "./agentic-view-tabs";
import { CanvasPanel } from "./canvas-panel";
import { ChatPanel } from "./chat-panel";
import {
  ExecutionLiveBanner,
  type LiveBannerStatus,
} from "./execution-live-banner";
import { ExecutionView } from "./execution-view";

const LIVE_BANNER_STATUSES = new Set<string>([
  "RUNNING",
  "WAITING_APPROVAL",
  "WAITING_INPUT",
]);

function isLiveBannerStatus(status: string): status is LiveBannerStatus {
  return LIVE_BANNER_STATUSES.has(status);
}

interface AgenticViewProps {
  agentId: string;
  className?: string;
}

const ACTIVE_STATUSES = new Set([
  "PENDING",
  "RUNNING",
  "WAITING_APPROVAL",
  "WAITING_INPUT",
]);

function parseTokenUsage(
  value: unknown
): { input: number; output: number } | undefined {
  if (typeof value !== "object" || value === null) {
    return;
  }
  const obj = value as Record<string, unknown>;
  if (typeof obj.input === "number" && typeof obj.output === "number") {
    return { input: obj.input, output: obj.output };
  }
  return;
}
const POLLING_INTERVAL_MS = 2000;
const EXECUTIONS_PAGE_SIZE = 20;

const VALID_EXECUTION_STATUSES: ReadonlySet<string> = new Set<ExecutionStatus>([
  "PENDING",
  "RUNNING",
  "WAITING_APPROVAL",
  "WAITING_INPUT",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
  "TIMED_OUT",
]);

function isValidExecutionStatus(status: string): status is ExecutionStatus {
  return VALID_EXECUTION_STATUSES.has(status);
}

const STEP_STATUS_MAP: Record<string, TimelineStepStatus> = {
  PENDING: "pending",
  RUNNING: "running",
  COMPLETED: "success",
  FAILED: "error",
  CANCELLED: "cancelled",
  TIMED_OUT: "error",
  WAITING_APPROVAL: "running",
  WAITING_INPUT: "running",
};

function mapStepStatus(dbStatus: string): TimelineStepStatus {
  return STEP_STATUS_MAP[dbStatus] ?? "pending";
}

function executionToListItem(
  execution: {
    id: string;
    status: string;
    versionNumber: number;
    currentNodeId: string | null;
    startedAt: Date | null;
    completedAt: Date | null;
    createdAt: Date;
    latencyMs: number | null;
    triggeredBy: {
      id: string;
      name: string | null;
      image: string | null;
    } | null;
  },
  agentCanvasId: string,
  agentCanvasName: string
): ExecutionListItem {
  return {
    id: execution.id,
    agentCanvasId,
    agentCanvasName,
    versionNumber: execution.versionNumber,
    status: isValidExecutionStatus(execution.status)
      ? execution.status
      : "PENDING",
    triggeredById: execution.triggeredBy?.id ?? "",
    triggeredByName: execution.triggeredBy?.name ?? undefined,
    triggerSource: undefined,
    stepsCompleted: 0,
    stepsTotal: 0,
    durationMs: execution.latencyMs ?? undefined,
    startedAt: execution.startedAt?.toISOString(),
    completedAt: execution.completedAt?.toISOString(),
    createdAt: execution.createdAt.toISOString(),
    error: undefined,
  };
}

function AgenticViewContent({ agentId, className }: AgenticViewProps) {
  "use no memo";
  const trpc = useTRPC();
  const { save } = useCanvasPersistence(agentId);
  const { collapsed, toggleCollapsed } = useChatPanelStore(
    useShallow((s) => ({ collapsed: s.collapsed, toggleCollapsed: s.toggle }))
  );

  useHotkeys("mod+b", (e) => {
    e.preventDefault();
    toggleCollapsed();
  });

  const [view, setView] = useQueryState(
    "view",
    parseAsStringLiteral(["canvas", "executions"] as const).withDefault(
      "canvas"
    )
  );
  const [selectedExecutionId, setSelectedExecutionId] = useQueryState(
    "run",
    parseAsString.withDefault("")
  );
  const [sessionParam, setSessionParam] = useQueryState(
    "session",
    parseAsString.withDefault("")
  );

  const sessionIdFromStore = useAgenticRuntimeStore((s) => s.sessionId);

  useEffect(() => {
    setSessionParam(sessionIdFromStore ?? null);
  }, [sessionIdFromStore, setSessionParam]);

  const [executionsOffset, setExecutionsOffset] = useState(0);
  const [dismissedLiveBanner, setDismissedLiveBanner] = useState(false);
  const now = useNow();

  useCanvasKeyboard({ onSave: save });

  const agentQuery = useQuery(
    trpc.agentCanvas.get.queryOptions({ canvasId: agentId })
  );

  const executionDetailQuery = useQuery({
    ...trpc.agentCanvas.getExecution.queryOptions({
      executionId: selectedExecutionId || "",
    }),
    enabled: Boolean(selectedExecutionId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && ACTIVE_STATUSES.has(status)
        ? POLLING_INTERVAL_MS
        : false;
    },
  });

  const executionsQuery = useQuery({
    ...trpc.agentCanvas.listExecutions.queryOptions({
      canvasId: agentId,
      limit: EXECUTIONS_PAGE_SIZE,
      offset: executionsOffset,
    }),
    refetchInterval: (query) => {
      const hasActive = query.state.data?.items.some((e) =>
        ACTIVE_STATUSES.has(e.status)
      );
      return hasActive ? POLLING_INTERVAL_MS : false;
    },
  });

  const agentName = agentQuery.data?.name ?? "Agent";

  const executions: ExecutionListItem[] = useMemo(() => {
    if (!executionsQuery.data?.items) {
      return [];
    }
    return executionsQuery.data.items.map((e) =>
      executionToListItem(e, agentId, agentName)
    );
  }, [executionsQuery.data?.items, agentId, agentName]);

  const liveExecution = useMemo(
    () => executions.find((e) => ACTIVE_STATUSES.has(e.status)),
    [executions]
  );

  const hasLiveExecution = Boolean(liveExecution);
  const isWaitingState =
    liveExecution?.status === "WAITING_INPUT" ||
    liveExecution?.status === "WAITING_APPROVAL";

  const showLiveBanner =
    hasLiveExecution &&
    view === "executions" &&
    (isWaitingState || !dismissedLiveBanner);

  const handleTabChange = useCallback(
    (tab: AgentViewTab) => {
      setView(tab);
      if (tab === "canvas") {
        setDismissedLiveBanner(false);
      }
    },
    [setView]
  );

  const handleSelectExecution = useCallback(
    (execution: ExecutionListItem) => {
      setSelectedExecutionId(execution.id);
    },
    [setSelectedExecutionId]
  );

  const handleLiveBannerAction = useCallback(() => {
    if (!liveExecution) {
      return;
    }

    const isWaiting =
      liveExecution.status === "WAITING_INPUT" ||
      liveExecution.status === "WAITING_APPROVAL";

    if (isWaiting) {
      setView("canvas");
    } else {
      setSelectedExecutionId(liveExecution.id);
    }
  }, [liveExecution, setView, setSelectedExecutionId]);

  const handleLoadMoreExecutions = useCallback(() => {
    setExecutionsOffset((prev) => prev + EXECUTIONS_PAGE_SIZE);
  }, []);

  const nodeNameMap = useMemo(() => {
    const rawNodes = agentQuery.data?.nodes;
    if (!Array.isArray(rawNodes)) {
      return new Map<string, string>();
    }
    return new Map(
      rawNodes.map((n: { id: string; data?: { label?: string } }) => [
        n.id,
        n.data?.label ?? `Node ${n.id.slice(0, 6)}`,
      ])
    );
  }, [agentQuery.data?.nodes]);

  const selectedExecutionData: TimelineData | undefined = useMemo(() => {
    if (!selectedExecutionId) {
      return;
    }
    const listExecution = executions.find((e) => e.id === selectedExecutionId);
    const detailExecution = executionDetailQuery.data;

    if (!listExecution) {
      return;
    }

    const steps: TimelineStep[] = (detailExecution?.steps ?? []).map(
      (step, index) => ({
        id: step.id,
        nodeId: step.nodeId,
        nodeType: step.nodeType,
        nodeName: nodeNameMap.get(step.nodeId) ?? `Step ${index + 1}`,
        status: mapStepStatus(step.status),
        startedAt: step.startedAt?.getTime(),
        completedAt: step.completedAt?.getTime(),
        durationMs: step.latencyMs ?? undefined,
        error: step.error ?? undefined,
        input: step.input ?? undefined,
        output: step.output ?? undefined,
        tokenUsage: parseTokenUsage(step.tokenUsage),
        retryCount: 0,
        attempt: 1,
        depth: 0,
      })
    );

    const completedSteps = steps.filter((s) => s.status === "success").length;
    const totalSteps = steps.length;

    return {
      executionId: listExecution.id,
      status: detailExecution?.status ?? listExecution.status,
      steps,
      events: [],
      startedAt: listExecution.startedAt
        ? new Date(listExecution.startedAt).getTime()
        : now,
      completedAt: listExecution.completedAt
        ? new Date(listExecution.completedAt).getTime()
        : undefined,
      totalDurationMs:
        detailExecution?.latencyMs ?? listExecution.durationMs ?? undefined,
      progress: {
        completed: completedSteps,
        total: totalSteps,
        percentage:
          totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0,
      },
    };
  }, [
    selectedExecutionId,
    executions,
    executionDetailQuery.data,
    nodeNameMap,
    now,
  ]);

  return (
    <div className={cn("flex h-full flex-col", className)}>
      <Suspense fallback={<AgenticViewHeaderSkeleton />}>
        <AgenticViewHeader
          activeTab={view}
          agentId={agentId}
          executionCount={executions.length}
          hasLiveExecution={hasLiveExecution}
          onTabChange={handleTabChange}
        />
      </Suspense>

      {view === "canvas" ? (
        <div className="flex flex-1 overflow-hidden">
          <m.div
            animate={{ width: collapsed ? 0 : 380 }}
            className="shrink-0 overflow-hidden"
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          >
            <div className="h-full w-[380px]">
              <ChatPanel
                agentId={agentId}
                initialSessionId={sessionParam || undefined}
                onCollapse={toggleCollapsed}
              />
            </div>
          </m.div>
          <div className="relative flex-1">
            {collapsed && (
              <Button
                className="absolute top-2 left-2 z-10 h-8 w-8"
                onClick={toggleCollapsed}
                size="icon"
                variant="ghost"
              >
                <Icons.SidebarRight size={16} />
              </Button>
            )}
            <CanvasPanel agentId={agentId} />
          </div>
        </div>
      ) : (
        <ExecutionView
          agentId={agentId}
          className="flex-1"
          executions={executions}
          hasMoreExecutions={executionsQuery.data?.hasMore ?? false}
          isLoadingDetail={executionDetailQuery.isLoading}
          isLoadingExecutions={executionsQuery.isLoading}
          onLoadMoreExecutions={handleLoadMoreExecutions}
          onSelectExecution={handleSelectExecution}
          selectedExecutionData={selectedExecutionData}
          selectedExecutionId={selectedExecutionId || undefined}
        />
      )}

      {showLiveBanner &&
        liveExecution &&
        isLiveBannerStatus(liveExecution.status) && (
          <ExecutionLiveBanner
            executionId={liveExecution.id}
            executionName={liveExecution.agentCanvasName}
            onAction={handleLiveBannerAction}
            onDismiss={() => setDismissedLiveBanner(true)}
            startedAt={
              liveExecution.startedAt
                ? new Date(liveExecution.startedAt).getTime()
                : undefined
            }
            status={liveExecution.status}
          />
        )}
    </div>
  );
}

export function AgenticView({ agentId, className }: AgenticViewProps) {
  return (
    <TooltipProvider>
      <div className={cn("h-full", className)}>
        <AgenticViewContent agentId={agentId} className="h-full" />
      </div>
    </TooltipProvider>
  );
}
