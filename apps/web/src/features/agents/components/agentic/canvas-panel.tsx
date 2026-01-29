"use client";

import { ALL_CONNECTOR_ACTION_REGISTRIES } from "@openplane/integrations/connector-actions";
import { connectorLogos } from "@openplane/integrations/logos";
import type {
  AgentCanvasEdge,
  AgentCanvasNode,
  CanvasNodeType,
} from "@openplane/types/canvas";
import {
  type ConnectorType,
  normalizeToConnectorType,
} from "@openplane/types/services/connectors/events";
import {
  AgentCanvas,
  ConfigPanel,
  createNodeData,
  useBuilderStatus,
  useCanvasStore,
  usePendingOperationCount,
} from "@openplane/ui";
import type { ConnectorInfo } from "@openplane/ui/components/event-builder";
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
import { useShallow } from "zustand/react/shallow";
import { useTRPC } from "@/trpc/client";
import { useCanvasCommandPalette } from "../../hooks/use-canvas-command-palette";
import { useCanvasSync } from "../../hooks/use-canvas-sync";
import { useConnectorResources } from "../../hooks/use-connector-resources";
import { BuildingIndicator } from "./building-indicator";
import { CanvasCommandPalette } from "./canvas-command-palette";

interface CanvasPanelProps {
  agentId: string;
  className?: string;
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

  const { data: agent } = useQuery(
    trpc.agentCanvas.get.queryOptions({ canvasId: agentId })
  );

  const { data: connectorApps } = useQuery(trpc.apps.list.queryOptions());

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
    return (selectedNode.data as { config?: { toolId?: string } })?.config
      ?.toolId;
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
      if (!selectedNode) {
        return;
      }
      const currentData = selectedNode.data as Record<string, unknown>;
      updateNode(selectedNode.id, { ...currentData, label: newLabel });
      setSelectedNode((prev) =>
        prev ? { ...prev, data: { ...currentData, label: newLabel } } : null
      );
    },
    [selectedNode, updateNode]
  );

  const handleConfigChange = useCallback(
    (nodeId: string, config: Record<string, unknown>) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) {
        return;
      }
      const currentData = node.data as Record<string, unknown>;
      if (config.label !== undefined) {
        updateNode(nodeId, { ...currentData, ...config });
      } else {
        updateNode(nodeId, { ...currentData, config });
      }
      if (selectedNode?.id === nodeId) {
        setSelectedNode((prev) => {
          if (!prev) {
            return null;
          }
          const prevData = prev.data as Record<string, unknown>;
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
    <div className={cn("relative h-full w-full", className)}>
      {isBuilding && <BuildingIndicator pendingCount={pendingCount} />}

      <AgentCanvas
        className="h-full w-full"
        connectorLogos={connectorLogos}
        connectors={connectors}
        externalEdges={externalEdges}
        externalNodes={externalNodes}
        initialEdges={initialEdges}
        initialNodes={initialNodes}
        onEdgesChange={handleEdgesChange}
        onFetchResources={fetchResources}
        onNodeSelect={handleNodeSelect}
        onNodesChange={handleNodesChange}
        readOnly={isBuilding}
        showBackground
        showControls
      />

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
                (selectedNode.data as { config?: Record<string, unknown> })
                  .config ?? {}
              }
              nodeId={selectedNode.id}
              nodeLabel={
                (selectedNode.data as { label?: string }).label ??
                selectedNode.type ??
                "Node"
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
