"use client";

import type {
  Connection,
  Edge,
  EdgeTypes,
  Node,
  NodeTypes,
  OnConnect,
  OnEdgesChange,
  OnNodesChange,
  OnSelectionChangeFunc,
} from "@xyflow/react";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  ConnectionMode,
  ReactFlow,
  ReactFlowProvider,
  SelectionMode,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { DragEvent } from "react";
import { memo, useCallback, useMemo, useRef } from "react";
import { cn } from "../../utils";
import { CanvasBackground } from "./canvas-background";
import { CanvasControls } from "./canvas-controls";
import { CanvasMinimap } from "./canvas-minimap";
import { edgeTypes as defaultEdgeTypes } from "./edges";
import { createAllNodeTypes } from "./nodes";

const DEFAULT_EDGE_OPTIONS = {
  type: "data",
  animated: false,
};

export interface AgentCanvasProps {
  initialNodes?: Node[];
  initialEdges?: Edge[];
  nodeTypes?: NodeTypes;
  edgeTypes?: EdgeTypes;
  onNodesChange?: (nodes: Node[]) => void;
  onEdgesChange?: (edges: Edge[]) => void;
  onNodeSelect?: (node: Node | null) => void;
  onConnect?: (connection: Connection) => void;
  showControls?: boolean;
  showMinimap?: boolean;
  showBackground?: boolean;
  readOnly?: boolean;
  className?: string;
}

function AgentCanvasInner({
  initialNodes = [],
  initialEdges = [],
  nodeTypes,
  edgeTypes,
  onNodesChange: onNodesChangeCallback,
  onEdgesChange: onEdgesChangeCallback,
  onNodeSelect,
  onConnect: onConnectCallback,
  showControls = true,
  showMinimap = true,
  showBackground = true,
  readOnly = false,
  className,
}: AgentCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useNodesState(initialNodes);
  const [edges, setEdges] = useEdgesState(initialEdges);

  const mergedNodeTypes = useMemo(
    () => nodeTypes ?? createAllNodeTypes(),
    [nodeTypes]
  );

  const mergedEdgeTypes = useMemo(
    () => edgeTypes ?? defaultEdgeTypes,
    [edgeTypes]
  );

  const handleNodesChange: OnNodesChange = useCallback(
    (changes) => {
      setNodes((currentNodes) => {
        const nextNodes = applyNodeChanges(changes, currentNodes);
        onNodesChangeCallback?.(nextNodes);
        return nextNodes;
      });
    },
    [setNodes, onNodesChangeCallback]
  );

  const handleEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      setEdges((currentEdges) => {
        const nextEdges = applyEdgeChanges(changes, currentEdges);
        onEdgesChangeCallback?.(nextEdges);
        return nextEdges;
      });
    },
    [setEdges, onEdgesChangeCallback]
  );

  const handleConnect: OnConnect = useCallback(
    (connection: Connection) => {
      const sourceNode = nodes.find((n) => n.id === connection.source);

      let edgeType = "data";
      if (sourceNode?.type === "condition") {
        edgeType = "conditional";
      } else if (
        sourceNode?.type === "start" ||
        sourceNode?.type === "loop" ||
        sourceNode?.type === "parallel_split"
      ) {
        edgeType = "control";
      }

      const newEdge: Edge = {
        ...connection,
        id: `edge-${connection.source}-${connection.target}-${Date.now()}`,
        type: edgeType,
      } as Edge;

      setEdges((eds) => addEdge(newEdge, eds));
      onConnectCallback?.(connection);
    },
    [setEdges, nodes, onConnectCallback]
  );

  const handleSelectionChange: OnSelectionChangeFunc = useCallback(
    ({ nodes: selectedNodes }) => {
      const selectedNode = selectedNodes.length === 1 ? selectedNodes[0] : null;
      onNodeSelect?.(selectedNode ?? null);
    },
    [onNodeSelect]
  );

  const handleDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData("application/reactflow");
      if (!(type && reactFlowWrapper.current)) {
        return;
      }

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = {
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      };

      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: { label: `New ${type}` },
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [setNodes]
  );

  const proOptions = useMemo(() => ({ hideAttribution: true }), []);

  return (
    <div className={cn("h-full w-full", className)} ref={reactFlowWrapper}>
      <ReactFlow
        connectionMode={ConnectionMode.Loose}
        defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
        edges={edges}
        edgeTypes={mergedEdgeTypes}
        elementsSelectable={!readOnly}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        maxZoom={2}
        minZoom={0.1}
        nodes={nodes}
        nodesConnectable={!readOnly}
        nodesDraggable={!readOnly}
        nodeTypes={mergedNodeTypes}
        onConnect={handleConnect}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onEdgesChange={handleEdgesChange}
        onNodesChange={handleNodesChange}
        onSelectionChange={handleSelectionChange}
        panOnDrag={[1, 2]}
        panOnScroll
        proOptions={proOptions}
        selectionMode={SelectionMode.Partial}
        selectionOnDrag
        selectNodesOnDrag={false}
        zoomOnPinch
        zoomOnScroll
      >
        {showBackground && <CanvasBackground />}
        {showControls && <CanvasControls />}
        {showMinimap && <CanvasMinimap />}
      </ReactFlow>
    </div>
  );
}

export const AgentCanvas = memo(function AgentCanvasComponent(
  props: AgentCanvasProps
) {
  return (
    <ReactFlowProvider>
      <AgentCanvasInner {...props} />
    </ReactFlowProvider>
  );
});
AgentCanvas.displayName = "AgentCanvas";
