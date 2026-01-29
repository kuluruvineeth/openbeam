"use client";

import type { ConnectorType } from "@openplane/types/services/connectors/events";
import type {
  Connection,
  Edge,
  EdgeTypes,
  Node,
  NodeMouseHandler,
  NodeTypes,
  OnConnect,
  OnEdgesChange,
  OnNodesChange,
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
import type { ComponentType, DragEvent } from "react";
import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import { cn } from "../../utils";
import { CanvasBackground } from "./canvas-background";
import { CanvasProvider } from "./canvas-context";
import { CanvasContextMenu } from "./canvas-context-menu";
import { CanvasControls } from "./canvas-controls";
import { ConnectionLine } from "./connection-line";
import { edgeTypes as defaultEdgeTypes } from "./edges";
import type { ConnectorInfo, LogoProps, ResourceInfo } from "./event-builder";
import { createAllNodeTypes, createNodeData } from "./nodes";

const DEFAULT_EDGE_OPTIONS = {
  type: "animated",
};

const ID_COUNTER_LIMIT = 1_000_000;
let lastIdTimestamp = 0;
let idCounter = 0;

function createUniqueId(prefix: string) {
  const timestamp = Date.now();
  if (timestamp !== lastIdTimestamp) {
    lastIdTimestamp = timestamp;
    idCounter = 0;
  } else {
    idCounter = (idCounter + 1) % ID_COUNTER_LIMIT;
  }
  return `${prefix}-${timestamp}-${idCounter}`;
}

function deepEqualArrays(a: unknown[], b: unknown[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    if (!deepEqual(a[i], b[i])) {
      return false;
    }
  }
  return true;
}

function deepEqualObjects(
  a: Record<string, unknown>,
  b: Record<string, unknown>
): boolean {
  const aKeys = Object.keys(a);
  if (aKeys.length !== Object.keys(b).length) {
    return false;
  }
  for (const key of aKeys) {
    if (!deepEqual(a[key], b[key])) {
      return false;
    }
  }
  return true;
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true;
  }
  if (
    typeof a !== "object" ||
    typeof b !== "object" ||
    a === null ||
    b === null
  ) {
    return false;
  }

  const aIsArray = Array.isArray(a);
  const bIsArray = Array.isArray(b);
  if (aIsArray !== bIsArray) {
    return false;
  }
  if (aIsArray) {
    return deepEqualArrays(a as unknown[], b as unknown[]);
  }
  return deepEqualObjects(
    a as Record<string, unknown>,
    b as Record<string, unknown>
  );
}

function compareValueAtKey(key: string, aVal: unknown, bVal: unknown): boolean {
  if (key !== "config") {
    return aVal === bVal;
  }
  return deepEqual(aVal, bVal);
}

function shallowCompareNodeData(
  a: Record<string, unknown>,
  b: Record<string, unknown>
): boolean {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) {
    return false;
  }

  for (const key of aKeys) {
    if (!compareValueAtKey(key, a[key], b[key])) {
      return false;
    }
  }
  return true;
}

function hasNodesChanged(external: Node[], internal: Node[]): boolean {
  if (external.length !== internal.length) {
    return true;
  }

  for (let i = 0; i < external.length; i++) {
    const ext = external[i];
    const int = internal[i];

    if (!(ext && int)) {
      return true;
    }
    if (ext.id !== int.id) {
      return true;
    }
    if (ext.type !== int.type) {
      return true;
    }

    const extData = (ext.data ?? {}) as Record<string, unknown>;
    const intData = (int.data ?? {}) as Record<string, unknown>;
    if (!shallowCompareNodeData(extData, intData)) {
      return true;
    }
  }
  return false;
}

function hasEdgesChanged(external: Edge[], internal: Edge[]): boolean {
  if (external.length !== internal.length) {
    return true;
  }

  for (let i = 0; i < external.length; i++) {
    const ext = external[i];
    const int = internal[i];

    if (!(ext && int)) {
      return true;
    }
    if (ext.id !== int.id) {
      return true;
    }
    if (ext.source !== int.source) {
      return true;
    }
    if (ext.target !== int.target) {
      return true;
    }
  }
  return false;
}

export interface AgentCanvasProps {
  initialNodes?: Node[];
  initialEdges?: Edge[];
  externalNodes?: Node[];
  externalEdges?: Edge[];
  nodeTypes?: NodeTypes;
  edgeTypes?: EdgeTypes;
  onNodesChange?: (nodes: Node[]) => void;
  onEdgesChange?: (edges: Edge[]) => void;
  onNodeSelect?: (node: Node | null) => void;
  onNodeAdd?: (type: string, position: { x: number; y: number }) => void;
  onConnect?: (connection: Connection) => void;
  showControls?: boolean;
  showBackground?: boolean;
  readOnly?: boolean;
  connectorLogos?: Partial<Record<ConnectorType, ComponentType<LogoProps>>>;
  connectors?: ConnectorInfo[];
  onFetchResources?: (
    connectorId: string,
    resourceType: string
  ) => Promise<ResourceInfo[]>;
  className?: string;
}

function AgentCanvasInner({
  initialNodes = [],
  initialEdges = [],
  externalNodes,
  externalEdges,
  nodeTypes,
  edgeTypes,
  onNodesChange: onNodesChangeCallback,
  onEdgesChange: onEdgesChangeCallback,
  onNodeSelect,
  onNodeAdd,
  onConnect: onConnectCallback,
  showControls = true,
  showBackground = true,
  readOnly = false,
  connectorLogos,
  connectors,
  onFetchResources,
  className,
}: AgentCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useNodesState(initialNodes);
  const [edges, setEdges] = useEdgesState(initialEdges);
  const isSyncingNodesRef = useRef(false);
  const isSyncingEdgesRef = useRef(false);

  const prevExternalNodesRef = useRef<Node[] | undefined>(undefined);
  const prevExternalEdgesRef = useRef<Edge[] | undefined>(undefined);

  useEffect(() => {
    if (!externalNodes) {
      return;
    }
    if (prevExternalNodesRef.current === externalNodes) {
      return;
    }
    prevExternalNodesRef.current = externalNodes;

    if (hasNodesChanged(externalNodes, nodes)) {
      isSyncingNodesRef.current = true;
      setNodes(externalNodes);
    }
  }, [externalNodes, nodes, setNodes]);

  useEffect(() => {
    if (!externalEdges) {
      return;
    }
    if (prevExternalEdgesRef.current === externalEdges) {
      return;
    }
    prevExternalEdgesRef.current = externalEdges;

    if (hasEdgesChanged(externalEdges, edges)) {
      isSyncingEdgesRef.current = true;
      setEdges(externalEdges);
    }
  }, [externalEdges, edges, setEdges]);

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
      setNodes((currentNodes) => applyNodeChanges(changes, currentNodes));
    },
    [setNodes]
  );

  const handleEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      setEdges((currentEdges) => applyEdgeChanges(changes, currentEdges));
    },
    [setEdges]
  );

  useEffect(() => {
    if (isSyncingNodesRef.current) {
      isSyncingNodesRef.current = false;
      return;
    }
    onNodesChangeCallback?.(nodes);
  }, [nodes, onNodesChangeCallback]);

  useEffect(() => {
    if (isSyncingEdgesRef.current) {
      isSyncingEdgesRef.current = false;
      return;
    }
    onEdgesChangeCallback?.(edges);
  }, [edges, onEdgesChangeCallback]);

  const handleConnect: OnConnect = useCallback(
    (connection: Connection) => {
      const newEdge: Edge = {
        id: createUniqueId(`edge-${connection.source}-${connection.target}`),
        type: "animated",
        ...connection,
      } as Edge;

      setEdges((eds) => addEdge(newEdge, eds));
      onConnectCallback?.(connection);
    },
    [setEdges, onConnectCallback]
  );

  const handleNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      onNodeSelect?.(node);
    },
    [onNodeSelect]
  );

  const handlePaneClick = useCallback(() => {
    onNodeSelect?.(null);
  }, [onNodeSelect]);

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
        id: createUniqueId(type),
        type,
        position,
        data: createNodeData(type),
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [setNodes]
  );

  const proOptions = useMemo(() => ({ hideAttribution: true }), []);

  return (
    <CanvasProvider
      connectorLogos={connectorLogos}
      connectors={connectors}
      onFetchResources={onFetchResources}
    >
      <div className={cn("h-full w-full", className)} ref={reactFlowWrapper}>
        <CanvasContextMenu onNodeAdd={onNodeAdd}>
          <ReactFlow
            connectionLineComponent={ConnectionLine}
            connectionMode={ConnectionMode.Strict}
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
            onNodeClick={handleNodeClick}
            onNodesChange={handleNodesChange}
            onPaneClick={handlePaneClick}
            panOnDrag={[1]}
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
          </ReactFlow>
        </CanvasContextMenu>
      </div>
    </CanvasProvider>
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
