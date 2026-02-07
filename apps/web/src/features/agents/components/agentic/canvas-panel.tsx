"use client";

import type { RouterOutputs } from "@openplane/api/routers/index";
import { ALL_CONNECTOR_ACTION_REGISTRIES } from "@openplane/integrations/connector-actions";
import { connectorLogos } from "@openplane/integrations/logos";
import type {
  AgentCanvasEdge,
  AgentCanvasNode,
  CanvasNodeType,
  NodeStatus,
} from "@openplane/types/canvas";
import {
  type ConnectorType,
  normalizeToConnectorType,
} from "@openplane/types/services/connectors/events";
import {
  AgentCanvas,
  CanvasHistoryControls,
  ConfigPanel,
  createNodeData,
  useBuilderStatus,
  useCanvasStore,
  useIsActionPanelDocked,
  usePendingOperationCount,
  useSetActionPanelDocked,
} from "@openplane/ui";
import type { ConnectorInfo } from "@openplane/ui/components/event-builder";
import { Icons } from "@openplane/ui/components/icons";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@openplane/ui/components/sheet";
import { cn } from "@openplane/ui/utils";
import { useQuery } from "@tanstack/react-query";
import type { Edge, Node } from "@xyflow/react";
import { Suspense, useCallback, useMemo, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { useShallow } from "zustand/react/shallow";
import { PAGE_SIZES, POLLING_INTERVALS } from "@/lib/constants/polling";
import { Z_INDEX } from "@/lib/constants/z-index";
import { hasConfig, hasLabel, hasStringConfig } from "@/lib/utils/type-guards";
import { useTRPC } from "@/trpc/client";
import { useCanvasCommandPalette } from "../../hooks/use-canvas-command-palette";
import { useCanvasSync } from "../../hooks/use-canvas-sync";
import { useConnectorResources } from "../../hooks/use-connector-resources";
import { useDebouncedCanvasHistory } from "../../hooks/use-debounced-canvas-history";
import {
  getWaitingApprovalNodeId,
  resolveApprovalNodeConfig,
} from "../executions/execution-approval-utils";
import {
  getWaitingInputNodeId,
  resolveInputNodeConfig,
} from "../executions/execution-input-utils";
import { ActionPanelContent } from "./action-panel-content";
import { BuildingIndicator } from "./building-indicator";
import { CanvasCommandPalette } from "./canvas-command-palette";

interface CanvasPanelProps {
  agentId: string;
  className?: string;
}

type ExecutionSummary =
  RouterOutputs["agentCanvas"]["listExecutions"]["items"][number];
type ExecutionDetail = RouterOutputs["agentCanvas"]["getExecution"];
type ExecutionStatus = ExecutionSummary["status"];

const ACTIVE_EXECUTION_STATUSES = new Set<ExecutionStatus>([
  "PENDING",
  "RUNNING",
  "WAITING_INPUT",
  "WAITING_APPROVAL",
]);

const EXECUTION_DOT_STYLES: Record<ExecutionStatus, string> = {
  PENDING: "bg-muted-foreground/70 animate-pulse",
  RUNNING: "bg-primary animate-pulse",
  WAITING_INPUT: "bg-amber-500 animate-pulse",
  WAITING_APPROVAL: "bg-amber-500 animate-pulse",
  COMPLETED: "bg-emerald-500",
  FAILED: "bg-destructive",
  CANCELLED: "bg-muted-foreground/70",
  TIMED_OUT: "bg-destructive",
};

const EXECUTION_STATUS_TO_NODE_STATUS: Record<ExecutionStatus, NodeStatus> = {
  PENDING: "pending",
  RUNNING: "running",
  WAITING_INPUT: "waiting",
  WAITING_APPROVAL: "waiting",
  COMPLETED: "success",
  FAILED: "error",
  CANCELLED: "error",
  TIMED_OUT: "error",
};

type EdgeExecutionState = "idle" | "running" | "success" | "error";

function resolveNodeLabel(node: AgentCanvasNode | Node | undefined): string {
  if (!node) {
    return "—";
  }
  const data =
    typeof node.data === "object" && node.data !== null
      ? (node.data as Record<string, unknown>)
      : {};
  const label = typeof data.label === "string" ? data.label.trim() : "";
  if (label) {
    return label;
  }
  if (typeof node.type === "string" && node.type.length > 0) {
    return node.type.replaceAll("_", " ");
  }
  return "Node";
}

function mapEdgeState(status?: NodeStatus): EdgeExecutionState {
  if (!status) {
    return "idle";
  }
  if (status === "running" || status === "waiting" || status === "pending") {
    return "running";
  }
  if (status === "success") {
    return "success";
  }
  if (status === "error") {
    return "error";
  }
  return "idle";
}

function buildExecutionOverlay(params: {
  nodes: AgentCanvasNode[];
  edges: AgentCanvasEdge[];
  summary?: ExecutionSummary;
  detail?: ExecutionDetail | null;
}) {
  const { nodes, edges, summary, detail } = params;
  if (!(summary && ACTIVE_EXECUTION_STATUSES.has(summary.status))) {
    return {
      nodeStatusMap: undefined,
      edgeStateMap: undefined,
      currentNodeLabel: undefined,
      executionId: undefined,
      executionStatus: undefined,
      progress: undefined,
    };
  }

  const statusByNodeId = new Map<string, NodeStatus>();
  const steps = detail?.steps ?? [];

  for (const step of steps) {
    statusByNodeId.set(
      step.nodeId,
      EXECUTION_STATUS_TO_NODE_STATUS[step.status]
    );
  }

  const currentNodeId = detail?.currentNodeId ?? summary.currentNodeId ?? null;
  const executionStatus = detail?.status ?? summary.status;

  if (currentNodeId) {
    statusByNodeId.set(
      currentNodeId,
      EXECUTION_STATUS_TO_NODE_STATUS[executionStatus]
    );
  }

  const nodeStatusMap = Object.fromEntries(statusByNodeId);

  const edgeStateMap: Record<string, EdgeExecutionState> = {};
  for (const edge of edges) {
    if (edge.type === "error") {
      continue;
    }
    const targetStatus = statusByNodeId.get(edge.target);
    const sourceStatus = statusByNodeId.get(edge.source);
    const edgeState = mapEdgeState(targetStatus ?? sourceStatus);
    if (edgeState !== "idle") {
      edgeStateMap[edge.id] = edgeState;
    }
  }

  const currentNode = currentNodeId
    ? nodes.find((node) => node.id === currentNodeId)
    : undefined;
  const currentNodeLabel = resolveNodeLabel(currentNode);
  const totalNodes = nodes.filter((node) => node.type !== "annotation").length;
  const completedNodeIds = new Set(
    steps
      .filter((step) => step.status === "COMPLETED")
      .map((step) => step.nodeId)
  );
  if (currentNodeId) {
    completedNodeIds.add(currentNodeId);
  }
  const showProgress = totalNodes > 0 && (steps.length > 0 || currentNodeId);
  const progressValue = showProgress
    ? Math.min(100, Math.round((completedNodeIds.size / totalNodes) * 100))
    : 0;

  return {
    nodeStatusMap,
    edgeStateMap,
    currentNodeLabel,
    executionId: summary.id,
    executionStatus,
    progress: showProgress
      ? {
          value: progressValue,
          label: `${completedNodeIds.size}/${totalNodes} nodes`,
        }
      : undefined,
  };
}

function ExecutionOverlay({
  status,
  currentNodeLabel,
  progress,
}: {
  executionId: string;
  status: ExecutionStatus;
  currentNodeLabel: string;
  progress?: { value: number; label: string };
}) {
  const isActive = status === "RUNNING" || status === "PENDING";
  const isWaiting = status === "WAITING_INPUT" || status === "WAITING_APPROVAL";

  return (
    <div className="pointer-events-auto overflow-hidden rounded-sm border border-border/40 bg-background/95 shadow-sm backdrop-blur-sm">
      <div className="flex items-center gap-2.5 px-3 py-2">
        <div className="relative flex items-center justify-center">
          <span
            className={cn("size-2 rounded-full", EXECUTION_DOT_STYLES[status])}
          />
          {(isActive || isWaiting) && (
            <span
              className={cn(
                "absolute size-2 animate-ping rounded-full opacity-75",
                EXECUTION_DOT_STYLES[status]
              )}
            />
          )}
        </div>
        <span className="flex-1 truncate font-medium text-[13px]">
          {currentNodeLabel}
        </span>
        {progress && (
          <span className="shrink-0 font-mono text-[11px] text-muted-foreground tabular-nums">
            {progress.label}
          </span>
        )}
      </div>
      {progress && (
        <div className="h-0.5 bg-border/30">
          <div
            className={cn(
              "h-full transition-all duration-300",
              isActive && "bg-foreground/60",
              isWaiting && "bg-amber-500/60",
              status === "COMPLETED" && "bg-emerald-500/60",
              status === "FAILED" && "bg-destructive/60"
            )}
            style={{ width: `${progress.value}%` }}
          />
        </div>
      )}
    </div>
  );
}

function CanvasPanelContent({ agentId, className }: CanvasPanelProps) {
  const trpc = useTRPC();
  const { fetchResources } = useConnectorResources();
  const status = useBuilderStatus();
  const pendingCount = usePendingOperationCount();

  const { nodes, edges } = useCanvasStore(
    useShallow((s) => ({ nodes: s.nodes, edges: s.edges }))
  );

  const { setNodes, setEdges, addNode, updateNode, removeNode } =
    useCanvasStore(
      useShallow((s) => ({
        setNodes: s.setNodes,
        setEdges: s.setEdges,
        addNode: s.addNode,
        updateNode: s.updateNode,
        removeNode: s.removeNode,
      }))
    );

  const commandPalette = useCanvasCommandPalette();
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const actionPanelDocked = useIsActionPanelDocked();
  const setActionPanelDocked = useSetActionPanelDocked();

  const { canUndo, canRedo, handleUndo, handleRedo } =
    useDebouncedCanvasHistory(
      nodes as AgentCanvasNode[],
      edges as AgentCanvasEdge[]
    );

  const onUndo = useCallback(() => {
    handleUndo(
      (n) => setNodes(n),
      (e) => setEdges(e)
    );
  }, [handleUndo, setNodes, setEdges]);

  const onRedo = useCallback(() => {
    handleRedo(
      (n) => setNodes(n),
      (e) => setEdges(e)
    );
  }, [handleRedo, setNodes, setEdges]);

  useHotkeys("mod+z", (e) => {
    e.preventDefault();
    onUndo();
  });

  useHotkeys("mod+shift+z", (e) => {
    e.preventDefault();
    onRedo();
  });

  const { data: agent } = useQuery(
    trpc.agentCanvas.get.queryOptions({ canvasId: agentId })
  );

  const { data: connectorApps } = useQuery(trpc.apps.list.queryOptions());

  const executionListQuery = useQuery({
    ...trpc.agentCanvas.listExecutions.queryOptions({
      canvasId: agentId,
      limit: PAGE_SIZES.EXECUTIONS,
      offset: 0,
    }),
    refetchInterval: (query) => {
      const items = query.state.data?.items ?? [];
      return items.some((item) => ACTIVE_EXECUTION_STATUSES.has(item.status))
        ? POLLING_INTERVALS.EXECUTION_STATUS
        : false;
    },
  });

  const activeExecutionSummary = useMemo(() => {
    const items = executionListQuery.data?.items ?? [];
    return items.find((item) => ACTIVE_EXECUTION_STATUSES.has(item.status));
  }, [executionListQuery.data?.items]);

  const shouldPollExecution =
    !!activeExecutionSummary &&
    ACTIVE_EXECUTION_STATUSES.has(activeExecutionSummary.status);

  const executionQuery = useQuery({
    ...trpc.agentCanvas.getExecution.queryOptions({
      executionId: activeExecutionSummary?.id ?? "",
    }),
    enabled: shouldPollExecution,
    refetchInterval: shouldPollExecution
      ? POLLING_INTERVALS.EXECUTION_STATUS
      : false,
  });

  const waitingInputNodeId = useMemo(() => {
    const execution = executionQuery.data;
    if (!execution || execution.status !== "WAITING_INPUT") {
      return;
    }
    return getWaitingInputNodeId(execution);
  }, [executionQuery.data]);

  const waitingApprovalNodeId = useMemo(() => {
    const execution = executionQuery.data;
    if (!execution || execution.status !== "WAITING_APPROVAL") {
      return;
    }
    return getWaitingApprovalNodeId(execution);
  }, [executionQuery.data]);

  const waitingExecutionId =
    activeExecutionSummary?.id ?? executionQuery.data?.id;

  const waitingNodeId = waitingApprovalNodeId ?? waitingInputNodeId;
  const waitingKind = useMemo(() => {
    if (waitingApprovalNodeId) {
      return "approval";
    }
    if (waitingInputNodeId) {
      return "input";
    }
    return;
  }, [waitingApprovalNodeId, waitingInputNodeId]);

  const executionCanvasQuery = useQuery({
    ...trpc.agentCanvas.getExecutionCanvas.queryOptions({
      executionId: waitingExecutionId ?? "",
    }),
    enabled: Boolean(waitingNodeId && waitingExecutionId),
  });

  const waitingNode = useMemo(() => {
    if (!waitingNodeId) {
      return;
    }
    return executionCanvasQuery.data?.nodes.find(
      (node) => node.id === waitingNodeId
    );
  }, [executionCanvasQuery.data?.nodes, waitingNodeId]);

  const _waitingInputConfig = useMemo(
    () =>
      waitingKind === "input" && waitingNode
        ? resolveInputNodeConfig(waitingNode)
        : undefined,
    [waitingKind, waitingNode]
  );

  const _waitingApprovalConfig = useMemo(
    () =>
      waitingKind === "approval" && waitingNode
        ? resolveApprovalNodeConfig(waitingNode)
        : undefined,
    [waitingKind, waitingNode]
  );

  const waitingNodeLabel = useMemo(() => {
    if (!waitingNode) {
      return waitingKind === "approval"
        ? "Waiting for approval"
        : "Waiting for input";
    }
    return resolveNodeLabel(waitingNode);
  }, [waitingKind, waitingNode]);

  const showActionPanel = Boolean(
    waitingNodeId && waitingExecutionId && waitingKind
  );

  const approvalQuery = useQuery({
    ...trpc.agentCanvas.getPendingApproval.queryOptions({
      executionId: waitingExecutionId ?? "",
      nodeId: waitingApprovalNodeId ?? "",
    }),
    enabled: Boolean(
      waitingKind === "approval" && waitingExecutionId && waitingApprovalNodeId
    ),
    refetchInterval:
      waitingKind === "approval" ? POLLING_INTERVALS.APPROVAL_STATUS : false,
  });

  const toggleActionPanelDocked = useCallback(() => {
    setActionPanelDocked(!actionPanelDocked);
  }, [actionPanelDocked, setActionPanelDocked]);

  const actionPanelBody = useMemo(() => {
    if (!showActionPanel) {
      return null;
    }

    return (
      <ActionPanelContent
        approvalData={approvalQuery.data}
        approvalError={approvalQuery.error}
        approvalLoading={approvalQuery.isLoading}
        executionCanvasError={executionCanvasQuery.error}
        executionCanvasLoading={executionCanvasQuery.isLoading}
        executionCanvasNodes={executionCanvasQuery.data?.nodes}
        executionDetail={executionQuery.data}
        waitingExecutionId={waitingExecutionId}
        waitingKind={waitingKind}
        waitingNodeId={waitingNodeId}
      />
    );
  }, [
    approvalQuery.data,
    approvalQuery.error,
    approvalQuery.isLoading,
    executionCanvasQuery.data?.nodes,
    executionCanvasQuery.error,
    executionCanvasQuery.isLoading,
    executionQuery.data,
    showActionPanel,
    waitingExecutionId,
    waitingKind,
    waitingNodeId,
  ]);

  const actionPanelCard = useMemo(() => {
    if (!showActionPanel) {
      return null;
    }

    return (
      <div
        className={cn(
          "flex max-h-full flex-col overflow-hidden",
          actionPanelDocked
            ? "h-full"
            : "rounded-sm border border-border/40 bg-background/95 shadow-sm backdrop-blur-sm"
        )}
      >
        <div
          className={cn(
            "flex shrink-0 items-center justify-between gap-3 px-4 py-3",
            actionPanelDocked && "border-border/40 border-b"
          )}
        >
          <div className="flex items-center gap-2.5">
            <div className="relative flex items-center justify-center">
              <span className="size-2 animate-pulse rounded-full bg-amber-500" />
              <span className="absolute size-2 animate-ping rounded-full bg-amber-500 opacity-75" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-medium text-[13px]">
                {waitingNodeLabel}
              </p>
            </div>
          </div>
          <button
            aria-label={actionPanelDocked ? "Float panel" : "Dock panel"}
            className="flex size-6 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
            onClick={toggleActionPanelDocked}
            type="button"
          >
            {actionPanelDocked ? (
              <Icons.Move size={14} />
            ) : (
              <Icons.SidebarRight size={14} />
            )}
          </button>
        </div>
        <div className="flex-1 overflow-auto px-4 pt-1 pb-4">
          {actionPanelBody}
        </div>
      </div>
    );
  }, [
    actionPanelBody,
    actionPanelDocked,
    showActionPanel,
    toggleActionPanelDocked,
    waitingNodeLabel,
  ]);

  const connectors: ConnectorInfo[] = useMemo(() => {
    if (!connectorApps) {
      return [];
    }
    return connectorApps
      .filter((app) => app.connectorId && app.status !== "DELETING")
      .map((app) => ({
        id: app.connectorId as string,
        type:
          normalizeToConnectorType(app.id) ??
          (app.id.toLowerCase() as ConnectorType),
        name: app.name,
      }));
  }, [connectorApps]);

  const { data: availableTools } = useQuery(
    trpc.agentCanvas.listTools.queryOptions()
  );

  const selectedToolId = useMemo(() => {
    if (!selectedNode || selectedNode.type !== "tool") {
      return;
    }
    if (hasStringConfig(selectedNode.data, "toolId")) {
      return selectedNode.data.config.toolId;
    }
    return;
  }, [selectedNode]);

  const { data: toolParameters, isLoading: toolParametersLoading } = useQuery({
    ...trpc.agentCanvas.getToolParameters.queryOptions({
      toolId: selectedToolId ?? "",
    }),
    enabled: !!selectedToolId,
  });

  useCanvasSync(agent);

  const isBuilding = status === "building";

  const initialNodes = useMemo(
    () => (agent?.nodes ?? []) as Node[],
    [agent?.nodes]
  );
  const initialEdges = useMemo(
    () => (agent?.edges ?? []) as Edge[],
    [agent?.edges]
  );

  const externalNodes = useMemo(() => nodes as Node[], [nodes]);
  const externalEdges = useMemo(() => edges as Edge[], [edges]);

  const executionOverlay = useMemo(
    () =>
      buildExecutionOverlay({
        nodes: nodes as AgentCanvasNode[],
        edges: edges as AgentCanvasEdge[],
        summary: activeExecutionSummary,
        detail: executionQuery.data ?? undefined,
      }),
    [activeExecutionSummary, edges, executionQuery.data, nodes]
  );

  const handleNodesChange = useCallback(
    (updatedNodes: Node[]) => {
      setNodes(updatedNodes as AgentCanvasNode[]);
    },
    [setNodes]
  );

  const handleEdgesChange = useCallback(
    (updatedEdges: Edge[]) => {
      setEdges(updatedEdges as AgentCanvasEdge[]);
    },
    [setEdges]
  );

  const handleSelectNodeFromPalette = useCallback(
    (nodeType: string) => {
      const newNode: AgentCanvasNode = {
        id: `${nodeType}_${Date.now()}`,
        type: nodeType,
        position: { x: 250, y: 250 },
        data: createNodeData(nodeType),
      };
      addNode(newNode);
    },
    [addNode]
  );

  const handleNodeSelect = useCallback((node: Node | null) => {
    setSelectedNode(node);
  }, []);

  const handleSheetClose = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const handleLabelChange = useCallback(
    (newLabel: string) => {
      if (!(selectedNode && hasLabel(selectedNode.data))) {
        return;
      }
      const currentData = selectedNode.data;
      updateNode(selectedNode.id, { ...currentData, label: newLabel });
      setSelectedNode((prev) =>
        prev && hasLabel(prev.data)
          ? { ...prev, data: { ...prev.data, label: newLabel } }
          : null
      );
    },
    [selectedNode, updateNode]
  );

  const handleConfigChange = useCallback(
    (nodeId: string, config: Record<string, unknown>) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (!(node && hasConfig(node.data))) {
        return;
      }
      const currentData = node.data;
      if (config.label !== undefined) {
        updateNode(nodeId, { ...currentData, ...config });
      } else {
        updateNode(nodeId, { ...currentData, config });
      }
      if (selectedNode?.id === nodeId && hasConfig(selectedNode.data)) {
        setSelectedNode((prev) => {
          if (!(prev && hasConfig(prev.data))) {
            return null;
          }
          const prevData = prev.data;
          if (config.label !== undefined) {
            return { ...prev, data: { ...prevData, ...config } };
          }
          return { ...prev, data: { ...prevData, config } };
        });
      }
    },
    [nodes, selectedNode, updateNode]
  );

  const handleDeleteNode = useCallback(() => {
    if (!selectedNode) {
      return;
    }
    removeNode(selectedNode.id);
    setSelectedNode(null);
  }, [selectedNode, removeNode]);

  const handleDuplicateNode = useCallback(() => {
    if (!selectedNode) {
      return;
    }
    const newNode: AgentCanvasNode = {
      ...selectedNode,
      id: `${selectedNode.type}_${Date.now()}`,
      position: {
        x: selectedNode.position.x + 50,
        y: selectedNode.position.y + 50,
      },
      selected: false,
    } as AgentCanvasNode;
    addNode(newNode);
  }, [selectedNode, addNode]);

  if (!agent) {
    return <CanvasPanelSkeleton />;
  }

  return (
    <div className={cn("flex h-full w-full", className)}>
      <div className="relative flex-1">
        {isBuilding && <BuildingIndicator pendingCount={pendingCount} />}
        {executionOverlay.executionId &&
          executionOverlay.executionStatus &&
          executionOverlay.currentNodeLabel && (
            <div
              className="pointer-events-none absolute top-4 right-4 w-[320px]"
              style={{ zIndex: Z_INDEX.DROPDOWN }}
            >
              <ExecutionOverlay
                currentNodeLabel={executionOverlay.currentNodeLabel}
                executionId={executionOverlay.executionId}
                progress={executionOverlay.progress}
                status={executionOverlay.executionStatus}
              />
            </div>
          )}
        {showActionPanel && !actionPanelDocked && actionPanelCard && (
          <div
            className="pointer-events-none absolute top-24 right-4 max-h-[calc(100vh-7rem)] w-[360px]"
            style={{ zIndex: Z_INDEX.DROPDOWN }}
          >
            <div className="pointer-events-auto">{actionPanelCard}</div>
          </div>
        )}

        <AgentCanvas
          className="h-full w-full"
          connectorLogos={connectorLogos}
          connectors={connectors}
          edgeStateMap={executionOverlay.edgeStateMap}
          externalEdges={externalEdges}
          externalNodes={externalNodes}
          initialEdges={initialEdges}
          initialNodes={initialNodes}
          nodeStatusMap={executionOverlay.nodeStatusMap}
          onEdgesChange={handleEdgesChange}
          onFetchResources={fetchResources}
          onNodeSelect={handleNodeSelect}
          onNodesChange={handleNodesChange}
          onOpenCommandPalette={() => commandPalette.setIsOpen(true)}
          readOnly={isBuilding}
          showBackground
          showControls
          showEmptyState
        />

        {nodes.length > 0 && (
          <div
            className="absolute right-4 bottom-4"
            style={{ zIndex: Z_INDEX.DROPDOWN }}
          >
            <CanvasHistoryControls
              canRedo={canRedo}
              canUndo={canUndo}
              onRedo={onRedo}
              onUndo={onUndo}
            />
          </div>
        )}

        <CanvasCommandPalette
          onOpenChange={commandPalette.setIsOpen}
          onSelectNode={handleSelectNodeFromPalette}
          open={commandPalette.isOpen}
        />

        <Sheet
          onOpenChange={(open) => !open && handleSheetClose()}
          open={!!selectedNode}
        >
          <SheetContent className="w-96 p-0 sm:max-w-md" hideClose>
            <SheetHeader className="sr-only">
              <SheetTitle>Node Configuration</SheetTitle>
              <SheetDescription>Configure the selected node</SheetDescription>
            </SheetHeader>
            {selectedNode && (
              <ConfigPanel
                actionRegistries={ALL_CONNECTOR_ACTION_REGISTRIES}
                availableTools={availableTools}
                connectorLogos={connectorLogos}
                connectors={connectors}
                embedded
                nodeConfig={
                  hasConfig(selectedNode.data)
                    ? (selectedNode.data.config ?? {})
                    : {}
                }
                nodeId={selectedNode.id}
                nodeLabel={
                  hasLabel(selectedNode.data) && selectedNode.data.label
                    ? selectedNode.data.label
                    : (selectedNode.type ?? "Node")
                }
                nodeType={(selectedNode.type ?? "start") as CanvasNodeType}
                onClose={handleSheetClose}
                onConfigChange={handleConfigChange}
                onDelete={handleDeleteNode}
                onDuplicate={handleDuplicateNode}
                onFetchResources={fetchResources}
                onLabelChange={handleLabelChange}
                toolParameters={toolParameters}
                toolParametersLoading={toolParametersLoading}
              />
            )}
          </SheetContent>
        </Sheet>
      </div>

      {showActionPanel && actionPanelDocked && actionPanelCard && (
        <div className="flex w-[360px] shrink-0 flex-col border-border/60 border-l bg-background/95">
          {actionPanelCard}
        </div>
      )}
    </div>
  );
}

function CanvasPanelSkeleton() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-muted/20">
      <div className="flex flex-col items-center gap-2">
        <div className="h-8 w-8 animate-pulse rounded-md bg-muted" />
        <span className="text-muted-foreground text-xs">Loading canvas...</span>
      </div>
    </div>
  );
}

export function CanvasPanel({ agentId, className }: CanvasPanelProps) {
  return (
    <div className={cn("h-full w-full", className)}>
      <Suspense fallback={<CanvasPanelSkeleton />}>
        <CanvasPanelContent agentId={agentId} />
      </Suspense>
    </div>
  );
}
