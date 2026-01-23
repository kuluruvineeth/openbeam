"use client";

import type { AgentCanvasNode, CanvasNodeType } from "@openplane/types/canvas";
import {
  AgentCanvas,
  ConfigPanel,
  createNodeData,
  useBuilderStatus,
  useCanvasEdges,
  useCanvasNodes,
  useCanvasStore,
  usePendingOperationCount,
} from "@openplane/ui";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@openplane/ui/components/sheet";
import { cn } from "@openplane/ui/utils";
import { useSuspenseQuery } from "@tanstack/react-query";
import type { Edge, Node } from "@xyflow/react";
import { forwardRef, Suspense, useCallback, useState } from "react";
import { useTRPC } from "@/trpc/client";
import { useCanvasCommandPalette } from "../../hooks/use-canvas-command-palette";
import { BuildingIndicator } from "./building-indicator";
import { CanvasCommandPalette } from "./canvas-command-palette";

interface CanvasPanelProps {
  agentId: string;
  className?: string;
}

function CanvasPanelContent({ agentId, className }: CanvasPanelProps) {
  const trpc = useTRPC();
  const status = useBuilderStatus();
  const pendingCount = usePendingOperationCount();
  const storeNodes = useCanvasNodes();
  const storeEdges = useCanvasEdges();
  const addNode = useCanvasStore((s) => s.addNode);
  const updateNode = useCanvasStore((s) => s.updateNode);
  const removeNode = useCanvasStore((s) => s.removeNode);
  const commandPalette = useCanvasCommandPalette();
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  const { data: agent } = useSuspenseQuery(
    trpc.agentCanvas.get.queryOptions({ canvasId: agentId })
  );

  const isBuilding = status === "building";

  const nodes = (
    storeNodes.length > 0 ? storeNodes : (agent.nodes ?? [])
  ) as Node[];
  const edges = (
    storeEdges.length > 0 ? storeEdges : (agent.edges ?? [])
  ) as Edge[];

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

  return (
    <div className={cn("relative h-full w-full", className)}>
      {isBuilding && <BuildingIndicator pendingCount={pendingCount} />}

      <AgentCanvas
        className="h-full w-full"
        initialEdges={edges}
        initialNodes={nodes}
        onNodeSelect={handleNodeSelect}
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
              onLabelChange={handleLabelChange}
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

export const CanvasPanel = forwardRef<HTMLDivElement, CanvasPanelProps>(
  ({ agentId, className }, ref) => (
    <div className={cn("h-full w-full", className)} ref={ref}>
      <Suspense fallback={<CanvasPanelSkeleton />}>
        <CanvasPanelContent agentId={agentId} />
      </Suspense>
    </div>
  )
);

CanvasPanel.displayName = "CanvasPanel";
