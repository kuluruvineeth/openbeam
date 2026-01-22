"use client";

import type { CanvasNodeType } from "@openplane/types/canvas";
import {
  AgentCanvas,
  ConfigPanel,
  createEndNodeData,
  createStartNodeData,
} from "@openplane/ui";
import { Button } from "@openplane/ui/components/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@openplane/ui/components/sheet";
import { Skeleton } from "@openplane/ui/components/skeleton";
import { TooltipProvider } from "@openplane/ui/components/tooltip";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import type { Edge, Node } from "@xyflow/react";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { Suspense, useCallback, useState } from "react";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";

interface AgentEditorViewProps {
  agentId: string;
}

const DEFAULT_NODES: Node[] = [
  {
    id: "start-1",
    type: "start",
    position: { x: 250, y: 50 },
    data: createStartNodeData(),
  },
  {
    id: "end-1",
    type: "end",
    position: { x: 250, y: 400 },
    data: createEndNodeData(),
  },
];

function AgentEditorViewSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-border/50 border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8" />
          <div className="space-y-1">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-64" />
          </div>
        </div>
        <Skeleton className="h-9 w-20" />
      </header>
      <div className="flex-1 p-4">
        <Skeleton className="h-full w-full" />
      </div>
    </div>
  );
}

function AgentEditorViewContent({ agentId }: AgentEditorViewProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data: agent } = useSuspenseQuery(
    trpc.agentCanvas.get.queryOptions({ canvasId: agentId })
  );

  const initialNodes = (agent.nodes as Node[]) || DEFAULT_NODES;
  const initialEdges = (agent.edges as Edge[]) || [];

  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  const updateMutation = useMutation({
    ...trpc.agentCanvas.update.mutationOptions(),
    onSuccess: () => {
      toast.success("Agent saved successfully");
      queryClient.invalidateQueries({
        queryKey: trpc.agentCanvas.get.queryOptions({ canvasId: agentId })
          .queryKey,
      });
      queryClient.invalidateQueries({
        queryKey: trpc.agentCanvas.list.infiniteQueryOptions({}).queryKey,
      });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleNodesChange = useCallback((newNodes: Node[]) => {
    setNodes(newNodes);
  }, []);

  const handleEdgesChange = useCallback((newEdges: Edge[]) => {
    setEdges(newEdges);
  }, []);

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
      setNodes((prev) =>
        prev.map((n) => {
          if (n.id !== selectedNode.id) {
            return n;
          }
          const currentData = n.data as Record<string, unknown>;
          return { ...n, data: { ...currentData, label: newLabel } };
        })
      );
      setSelectedNode((prev) => {
        if (!prev) {
          return null;
        }
        const currentData = prev.data as Record<string, unknown>;
        return { ...prev, data: { ...currentData, label: newLabel } };
      });
    },
    [selectedNode]
  );

  const handleConfigChange = useCallback(
    (nodeId: string, config: Record<string, unknown>) => {
      setNodes((prev) =>
        prev.map((n) => {
          if (n.id !== nodeId) {
            return n;
          }
          const currentData = n.data as Record<string, unknown>;
          if (config.label !== undefined) {
            return { ...n, data: { ...currentData, ...config } };
          }
          return { ...n, data: { ...currentData, config } };
        })
      );
      if (selectedNode?.id === nodeId) {
        setSelectedNode((prev) => {
          if (!prev) {
            return null;
          }
          const currentData = prev.data as Record<string, unknown>;
          if (config.label !== undefined) {
            return { ...prev, data: { ...currentData, ...config } };
          }
          return { ...prev, data: { ...currentData, config } };
        });
      }
    },
    [selectedNode]
  );

  const handleDeleteNode = useCallback(() => {
    if (!selectedNode) {
      return;
    }
    setNodes((prev) => prev.filter((n) => n.id !== selectedNode.id));
    setEdges((prev) =>
      prev.filter(
        (e) => e.source !== selectedNode.id && e.target !== selectedNode.id
      )
    );
    setSelectedNode(null);
  }, [selectedNode]);

  const handleDuplicateNode = useCallback(() => {
    if (!selectedNode) {
      return;
    }
    const newNode: Node = {
      ...selectedNode,
      id: `${selectedNode.type}-${Date.now()}`,
      position: {
        x: selectedNode.position.x + 50,
        y: selectedNode.position.y + 50,
      },
      selected: false,
    };
    setNodes((prev) => [...prev, newNode]);
  }, [selectedNode]);

  const handleSave = () => {
    updateMutation.mutate({
      canvasId: agentId,
      nodes,
      edges,
    });
  };

  const isSaving = updateMutation.isPending;

  return (
    <TooltipProvider>
      <div className="flex h-full flex-col">
        <header className="flex items-center justify-between border-border/50 border-b px-4 py-3">
          <div className="flex items-center gap-3">
            <Button asChild size="icon" variant="ghost">
              <Link href={`/agents/${agentId}`}>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="font-medium">{agent.name}</h1>
              <p className="text-muted-foreground text-xs">
                Right-click to add nodes • Click a node to configure
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button disabled={isSaving} onClick={handleSave}>
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </header>

        <div className="relative flex-1 overflow-hidden">
          <AgentCanvas
            className="h-full w-full"
            initialEdges={edges}
            initialNodes={nodes}
            onEdgesChange={handleEdgesChange}
            onNodeSelect={handleNodeSelect}
            onNodesChange={handleNodesChange}
            showBackground
            showControls
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
                    (
                      selectedNode.data as {
                        config?: Record<string, unknown>;
                      }
                    ).config ?? {}
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
      </div>
    </TooltipProvider>
  );
}

export function AgentEditorView({ agentId }: AgentEditorViewProps) {
  return (
    <Suspense fallback={<AgentEditorViewSkeleton />}>
      <AgentEditorViewContent agentId={agentId} />
    </Suspense>
  );
}
