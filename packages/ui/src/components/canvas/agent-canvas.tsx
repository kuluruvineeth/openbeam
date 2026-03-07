"use client";

import type { NodeStatus } from "@openbeam/types/canvas";
import type { ConnectorType } from "@openbeam/types/services/connectors/events";
import type {
  Connection,
  Edge,
  EdgeTypes,
  Node,
  NodeMouseHandler,
  NodeTypes,
  OnConnect,
  OnConnectEnd,
  OnConnectStart,
  OnEdgesChange,
  OnNodesChange,
  ReactFlowInstance,
} from "@xyflow/react";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  ConnectionMode,
  ReactFlow,
  ReactFlowProvider,
  reconnectEdge,
  SelectionMode,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { ComponentType, DragEvent } from "react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useConnectionValidation } from "../../hooks/use-connection-validation";
import { useCanvasBuilderStore } from "../../stores/canvas-builder-store";
import { cn } from "../../utils";
import { CanvasBackground } from "./canvas-background";
import { CanvasProvider } from "./canvas-context";
import { CanvasContextMenu } from "./canvas-context-menu";
import { CanvasControls } from "./canvas-controls";
import { CanvasEmptyState } from "./canvas-empty-state";
import { CanvasMinimap } from "./canvas-minimap";
import { ConnectionLine } from "./connection-line";
import { edgeTypes as defaultEdgeTypes } from "./edges";
import type { ConnectorInfo, LogoProps, ResourceInfo } from "./event-builder";
import { createAllNodeTypes, createNodeData } from "./nodes";

const DEFAULT_EDGE_OPTIONS = {
  type: "data",
  data: { animated: false },
};

const FIT_VIEW_OPTIONS = { padding: 0.2 } as const;

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
    if (
      ext.position?.x !== int.position?.x ||
      ext.position?.y !== int.position?.y
    ) {
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

const EMPTY_NODES: Node[] = [];
const EMPTY_EDGES: Edge[] = [];

export interface AgentCanvasProps {
  initialNodes?: Node[];
  initialEdges?: Edge[];
  externalNodes?: Node[];
  externalEdges?: Edge[];
  nodeStatusMap?: Record<string, NodeStatus>;
  edgeStateMap?: Record<string, "idle" | "running" | "success" | "error">;
  nodeTypes?: NodeTypes;
  edgeTypes?: EdgeTypes;
  onNodesChange?: (nodes: Node[]) => void;
  onEdgesChange?: (edges: Edge[]) => void;
  onNodeSelect?: (node: Node | null) => void;
  onNodeAdd?: (type: string, position: { x: number; y: number }) => void;
  onConnect?: (connection: Connection) => void;
  showControls?: boolean;
  showMinimap?: boolean;
  showBackground?: boolean;
  showEmptyState?: boolean;
  readOnly?: boolean;
  connectorLogos?: Partial<Record<ConnectorType, ComponentType<LogoProps>>>;
  connectors?: ConnectorInfo[];
  onFetchResources?: (
    connectorId: string,
    resourceType: string
  ) => Promise<ResourceInfo[]>;
  onEdgeDropOnPane?: (params: {
    sourceNodeId: string;
    handleType: "source" | "target" | null;
    position: { x: number; y: number };
  }) => void;
  onOpenCommandPalette?: () => void;
  onSelectTemplate?: (templateId: string) => void;
  colorMode?: "light" | "dark" | "system";
  className?: string;
}

function AgentCanvasInner({
  initialNodes = EMPTY_NODES,
  initialEdges = EMPTY_EDGES,
  externalNodes,
  externalEdges,
  nodeStatusMap,
  edgeStateMap,
  nodeTypes,
  edgeTypes,
  onNodesChange: onNodesChangeCallback,
  onEdgesChange: onEdgesChangeCallback,
  onNodeSelect,
  onNodeAdd,
  onConnect: onConnectCallback,
  showControls = true,
  showMinimap = false,
  showBackground = true,
  showEmptyState = true,
  readOnly = false,
  connectorLogos,
  connectors,
  onFetchResources,
  onEdgeDropOnPane,
  onOpenCommandPalette,
  onSelectTemplate,
  colorMode = "system",
  className,
}: AgentCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useNodesState(initialNodes);
  const [edges, setEdges] = useEdgesState(initialEdges);
  const [minimapVisible, setMinimapVisible] = useState(showMinimap);
  const isSyncingNodesRef = useRef(false);
  const isSyncingEdgesRef = useRef(false);
  const reactFlowInstanceRef = useRef<ReactFlowInstance<Node, Edge> | null>(
    null
  );
  const lastHandledLayoutVersionRef = useRef(0);
  const layoutVersion = useCanvasBuilderStore((s) => s.layoutVersion);
  const [isReactFlowReady, setIsReactFlowReady] = useState(false);

  const { isValidConnection } = useConnectionValidation();
  const prevExternalNodesRef = useRef<Node[] | undefined>(undefined);
  const prevExternalEdgesRef = useRef<Edge[] | undefined>(undefined);
  const edgeReconnectSuccessful = useRef(true);
  const connectingNodeId = useRef<string | null>(null);
  const connectingHandleType = useRef<"source" | "target" | null>(null);

  const onConnectStart: OnConnectStart = useCallback(
    (_event, { nodeId, handleType }) => {
      connectingNodeId.current = nodeId;
      connectingHandleType.current = handleType;
    },
    []
  );

  const onConnectEnd: OnConnectEnd = useCallback(
    (event) => {
      if (!connectingNodeId.current) {
        return;
      }

      const target = event.target as Element | null;
      const targetIsPane = target?.classList?.contains("react-flow__pane");

      if (targetIsPane && "clientX" in event && reactFlowInstanceRef.current) {
        const position = reactFlowInstanceRef.current.screenToFlowPosition({
          x: (event as MouseEvent | (TouchEvent & { clientX: number })).clientX,
          y: (event as MouseEvent | (TouchEvent & { clientY: number })).clientY,
        });
        onEdgeDropOnPane?.({
          sourceNodeId: connectingNodeId.current,
          handleType: connectingHandleType.current,
          position,
        });
      }
      connectingNodeId.current = null;
      connectingHandleType.current = null;
    },
    [onEdgeDropOnPane]
  );

  const handleMinimapToggle = useCallback(() => {
    setMinimapVisible((prev) => !prev);
  }, []);

  const handleReactFlowInit = useCallback(
    (instance: ReactFlowInstance<Node, Edge>) => {
      reactFlowInstanceRef.current = instance;
      setIsReactFlowReady(true);
    },
    []
  );

  const isEmpty = nodes.length === 0;

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

  const renderNodes = useMemo(() => {
    let result: Node[] = nodes;

    if (nodeStatusMap && Object.keys(nodeStatusMap).length > 0) {
      const hasChanges = nodes.some((node) => {
        const status = nodeStatusMap[node.id];
        if (!status) {
          return false;
        }
        const d =
          typeof node.data === "object" && node.data !== null ? node.data : {};
        return (
          !("status" in d) || (d as Record<string, unknown>).status !== status
        );
      });
      if (!hasChanges) {
        return nodes;
      }

      result = nodes.map((node) => {
        const status = nodeStatusMap[node.id];
        if (!status) {
          return node;
        }
        const data =
          typeof node.data === "object" && node.data !== null ? node.data : {};
        const currentStatus =
          "status" in data
            ? ((data as Record<string, unknown>).status as
                | NodeStatus
                | undefined)
            : undefined;
        if (currentStatus === status) {
          return node;
        }
        return {
          ...node,
          data: {
            ...data,
            status,
          },
        };
      });
    }

    return result;
  }, [nodeStatusMap, nodes]);

  const renderNodeCount = renderNodes.length;
  useEffect(() => {
    if (!isReactFlowReady) {
      return;
    }
    if (layoutVersion <= 0) {
      return;
    }
    if (layoutVersion === lastHandledLayoutVersionRef.current) {
      return;
    }
    if (renderNodeCount === 0) {
      return;
    }

    let frameA = 0;
    let frameB = 0;
    frameA = requestAnimationFrame(() => {
      frameB = requestAnimationFrame(() => {
        reactFlowInstanceRef.current?.fitView({
          padding: 0.24,
          duration: 320,
          maxZoom: 1.6,
        });
        lastHandledLayoutVersionRef.current = layoutVersion;
      });
    });

    return () => {
      if (frameA) {
        cancelAnimationFrame(frameA);
      }
      if (frameB) {
        cancelAnimationFrame(frameB);
      }
    };
  }, [isReactFlowReady, layoutVersion, renderNodeCount]);

  const renderEdges = useMemo(() => {
    if (!edgeStateMap || Object.keys(edgeStateMap).length === 0) {
      return edges;
    }

    return edges.map((edge) => {
      const executionState = edgeStateMap[edge.id];
      if (!executionState) {
        return edge;
      }
      const data =
        typeof edge.data === "object" && edge.data !== null ? edge.data : {};
      const nextAnimated = executionState === "running";
      const currentState = (data as { executionState?: string }).executionState;
      const currentAnimated = (data as { animated?: boolean }).animated;
      if (currentState === executionState && currentAnimated === nextAnimated) {
        return edge;
      }
      return {
        ...edge,
        data: {
          ...data,
          executionState,
          animated: nextAnimated,
        },
      };
    });
  }, [edgeStateMap, edges]);

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
        type: "data",
        data: { animated: false },
        ...connection,
      } as Edge;

      setEdges((eds) => addEdge(newEdge, eds));
      onConnectCallback?.(connection);
    },
    [setEdges, onConnectCallback]
  );

  const onReconnectStart = useCallback(() => {
    edgeReconnectSuccessful.current = false;
  }, []);

  const onReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      edgeReconnectSuccessful.current = true;
      setEdges((eds) => reconnectEdge(oldEdge, newConnection, eds));
    },
    [setEdges]
  );

  const onReconnectEnd = useCallback(
    (_: MouseEvent | TouchEvent, edge: Edge) => {
      if (!edgeReconnectSuccessful.current) {
        setEdges((eds) => eds.filter((e) => e.id !== edge.id));
      }
      edgeReconnectSuccessful.current = true;
    },
    [setEdges]
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
      if (!type) {
        return;
      }

      const position = reactFlowInstanceRef.current
        ? reactFlowInstanceRef.current.screenToFlowPosition({
            x: event.clientX,
            y: event.clientY,
          })
        : { x: event.clientX, y: event.clientY };

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
            colorMode={colorMode}
            connectionLineComponent={ConnectionLine}
            connectionMode={ConnectionMode.Strict}
            defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
            edges={renderEdges}
            edgesReconnectable={!readOnly}
            edgeTypes={mergedEdgeTypes}
            elementsSelectable={!readOnly}
            fitView
            fitViewOptions={FIT_VIEW_OPTIONS}
            isValidConnection={isValidConnection}
            maxZoom={2}
            minZoom={0.1}
            nodes={renderNodes}
            nodesConnectable={!readOnly}
            nodesDraggable={!readOnly}
            nodeTypes={mergedNodeTypes}
            onConnect={handleConnect}
            onConnectEnd={onConnectEnd}
            onConnectStart={onConnectStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onEdgesChange={handleEdgesChange}
            onInit={handleReactFlowInit}
            onNodeClick={handleNodeClick}
            onNodesChange={handleNodesChange}
            onPaneClick={handlePaneClick}
            onReconnect={onReconnect}
            onReconnectEnd={onReconnectEnd}
            onReconnectStart={onReconnectStart}
            panOnDrag={[1]}
            panOnScroll
            proOptions={proOptions}
            selectionMode={SelectionMode.Partial}
            selectionOnDrag
            selectNodesOnDrag={false}
            zoomOnPinch
            zoomOnScroll
          >
            <svg aria-label="Canvas edge markers" role="img">
              <defs>
                <marker
                  id="arrow-idle"
                  markerHeight="8"
                  markerUnits="strokeWidth"
                  markerWidth="8"
                  orient="auto"
                  refX="8"
                  refY="4"
                >
                  <path
                    className="fill-muted-foreground/50"
                    d="M0,0 L8,4 L0,8 Z"
                  />
                </marker>
                <marker
                  id="arrow-running"
                  markerHeight="8"
                  markerUnits="strokeWidth"
                  markerWidth="8"
                  orient="auto"
                  refX="8"
                  refY="4"
                >
                  <path className="fill-blue-500" d="M0,0 L8,4 L0,8 Z" />
                </marker>
                <marker
                  id="arrow-success"
                  markerHeight="8"
                  markerUnits="strokeWidth"
                  markerWidth="8"
                  orient="auto"
                  refX="8"
                  refY="4"
                >
                  <path className="fill-green-500" d="M0,0 L8,4 L0,8 Z" />
                </marker>
                <marker
                  id="arrow-error"
                  markerHeight="8"
                  markerUnits="strokeWidth"
                  markerWidth="8"
                  orient="auto"
                  refX="8"
                  refY="4"
                >
                  <path className="fill-red-500" d="M0,0 L8,4 L0,8 Z" />
                </marker>
                <marker
                  id="arrow-skipped"
                  markerHeight="8"
                  markerUnits="strokeWidth"
                  markerWidth="8"
                  orient="auto"
                  refX="8"
                  refY="4"
                >
                  <path
                    className="fill-muted-foreground/30"
                    d="M0,0 L8,4 L0,8 Z"
                  />
                </marker>
              </defs>
            </svg>
            {showBackground && <CanvasBackground />}
            {showControls && (
              <CanvasControls
                minimapVisible={minimapVisible}
                onMinimapToggle={handleMinimapToggle}
                showMinimap
              />
            )}
            {minimapVisible && <CanvasMinimap />}
          </ReactFlow>
        </CanvasContextMenu>

        {showEmptyState && isEmpty && !readOnly && (
          <CanvasEmptyState
            onAddNode={onOpenCommandPalette}
            onSelectTemplate={onSelectTemplate}
          />
        )}
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
