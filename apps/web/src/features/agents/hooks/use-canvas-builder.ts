"use client";

import dagre from "@dagrejs/dagre";
import type {
  AgentCanvasEdge,
  AgentCanvasNode,
  CanvasOperation,
} from "@openbeam/types/canvas";
import type { RuntimeEvent } from "@openbeam/types/canvas/runtime-events";
import {
  useCanvasBuilderStore,
  useCanvasStore,
  useExecutionStore,
} from "@openbeam/ui";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getVanillaTRPCClient } from "@/trpc/client";
import { projectRuntimeEventsToMessages } from "../lib/runtime-message-projection";
import { useAgenticRuntimeStore } from "../stores/agentic-runtime-store";

export type CanvasBuilderState = {
  messages: ReturnType<typeof projectRuntimeEventsToMessages>;
  isProcessing: boolean;
  error: string | null;
};

type Subscription = { unsubscribe: () => void };

const SYNTHETIC_DELTA_INTERVAL_MS = 44;
const SYNTHETIC_DELTA_CHUNK_SIZE = 10;
const SYNTHETIC_STREAM_MIN_MS = 900;
const SYNTHETIC_STREAM_MAX_MS = 2400;
const LAYOUT_DEFAULT_NODE_WIDTH = 320;
const LAYOUT_DEFAULT_NODE_HEIGHT = 156;
const LAYOUT_NODE_SEP = 120;
const LAYOUT_RANK_SEP = 180;
const LAYOUT_EDGE_SEP = 44;
const LAYOUT_MARGIN_X = 160;
const LAYOUT_MARGIN_Y = 120;
const LAYOUT_COLLISION_PADDING = 26;

function getNumericLayoutDimension(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function getLayoutNodeSize(node: AgentCanvasNode | undefined) {
  const defaultHeight =
    node?.type === "start" || node?.type === "end"
      ? 100
      : LAYOUT_DEFAULT_NODE_HEIGHT;
  const width = getNumericLayoutDimension(node?.width);
  const height = getNumericLayoutDimension(node?.height);

  return {
    width: Math.max(220, Math.round(width ?? LAYOUT_DEFAULT_NODE_WIDTH)),
    height: Math.max(88, Math.round(height ?? defaultHeight)),
  };
}

function areNodesOverlapping(
  a: AgentCanvasNode,
  b: AgentCanvasNode,
  padding: number
): boolean {
  const aSize = getLayoutNodeSize(a);
  const bSize = getLayoutNodeSize(b);

  return !(
    a.position.x + aSize.width + padding <= b.position.x ||
    b.position.x + bSize.width + padding <= a.position.x ||
    a.position.y + aSize.height + padding <= b.position.y ||
    b.position.y + bSize.height + padding <= a.position.y
  );
}

function resolveLayoutCollisions(
  nodes: AgentCanvasNode[],
  direction: "TB" | "LR"
): AgentCanvasNode[] {
  const sortedNodes = [...nodes].sort((a, b) => {
    if (direction === "TB") {
      if (a.position.y !== b.position.y) {
        return a.position.y - b.position.y;
      }
      return a.position.x - b.position.x;
    }
    if (a.position.x !== b.position.x) {
      return a.position.x - b.position.x;
    }
    return a.position.y - b.position.y;
  });

  const placedNodes: AgentCanvasNode[] = [];
  for (const node of sortedNodes) {
    let candidate: AgentCanvasNode = node;
    let guard = 0;

    while (guard < 64) {
      const conflict = placedNodes.find((placed) =>
        areNodesOverlapping(candidate, placed, LAYOUT_COLLISION_PADDING)
      );
      if (!conflict) {
        break;
      }

      const conflictSize = getLayoutNodeSize(conflict);
      candidate = {
        ...candidate,
        position:
          direction === "TB"
            ? {
                x: Math.round(candidate.position.x),
                y: Math.round(
                  conflict.position.y +
                    conflictSize.height +
                    LAYOUT_COLLISION_PADDING
                ),
              }
            : {
                x: Math.round(
                  conflict.position.x +
                    conflictSize.width +
                    LAYOUT_COLLISION_PADDING
                ),
                y: Math.round(candidate.position.y),
              },
      };
      guard += 1;
    }

    placedNodes.push(candidate);
  }

  const byId = new Map(placedNodes.map((node) => [node.id, node]));
  return nodes.map((node) => byId.get(node.id) ?? node);
}

function computeAutoLayout(
  nodes: AgentCanvasNode[],
  edges: AgentCanvasEdge[],
  direction: "TB" | "LR" = "TB"
): AgentCanvasNode[] {
  if (nodes.length <= 1) {
    return nodes;
  }
  if (nodes.some((node) => Boolean(node.parentId))) {
    return nodes;
  }

  const graph = new dagre.graphlib.Graph({
    multigraph: false,
    compound: false,
  });
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({
    rankdir: direction,
    nodesep: LAYOUT_NODE_SEP,
    ranksep: LAYOUT_RANK_SEP,
    edgesep: LAYOUT_EDGE_SEP,
    marginx: LAYOUT_MARGIN_X,
    marginy: LAYOUT_MARGIN_Y,
    ranker: "tight-tree",
  });

  const nodeIds = new Set(nodes.map((node) => node.id));
  for (const node of nodes) {
    const size = getLayoutNodeSize(node);
    graph.setNode(node.id, size);
  }

  let edgeCount = 0;
  for (const edge of edges) {
    if (
      !(nodeIds.has(edge.source) && nodeIds.has(edge.target)) ||
      edge.source === edge.target
    ) {
      continue;
    }
    graph.setEdge(edge.source, edge.target);
    edgeCount += 1;
  }

  if (edgeCount === 0) {
    for (let index = 1; index < nodes.length; index += 1) {
      const prev = nodes[index - 1];
      const curr = nodes[index];
      if (prev && curr) {
        graph.setEdge(prev.id, curr.id);
      }
    }
  }

  try {
    dagre.layout(graph);
  } catch {
    return nodes;
  }

  const positionedNodes = nodes.map((node) => {
    const layoutNode = graph.node(node.id);
    if (
      !(
        layoutNode &&
        Number.isFinite(layoutNode.x) &&
        Number.isFinite(layoutNode.y)
      )
    ) {
      return node;
    }

    const size = getLayoutNodeSize(node);
    return {
      ...node,
      position: {
        x: Math.round(layoutNode.x - size.width / 2),
        y: Math.round(layoutNode.y - size.height / 2),
      },
    };
  });

  return resolveLayoutCollisions(positionedNodes, direction);
}

function hasPositionCollisions(nodes: AgentCanvasNode[]): boolean {
  for (let i = 0; i < nodes.length; i += 1) {
    const current = nodes[i];
    if (!current) {
      continue;
    }
    for (let j = i + 1; j < nodes.length; j += 1) {
      const other = nodes[j];
      if (!other) {
        continue;
      }
      if (areNodesOverlapping(current, other, LAYOUT_COLLISION_PADDING / 2)) {
        return true;
      }
    }
  }
  return false;
}

function splitAssistantText(content: string): string[] {
  if (content.length === 0) {
    return [];
  }

  const chunks: string[] = [];
  let current = "";
  const tokens = content.match(/\S+\s*|\s+/g) ?? [content];

  for (const token of tokens) {
    if (token.length > SYNTHETIC_DELTA_CHUNK_SIZE) {
      if (current) {
        chunks.push(current);
        current = "";
      }
      for (let i = 0; i < token.length; i += SYNTHETIC_DELTA_CHUNK_SIZE) {
        chunks.push(token.slice(i, i + SYNTHETIC_DELTA_CHUNK_SIZE));
      }
      continue;
    }

    if ((current + token).length > SYNTHETIC_DELTA_CHUNK_SIZE && current) {
      chunks.push(current);
      current = token;
    } else {
      current += token;
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}

export function useCanvasBuilder(canvasId?: string) {
  const [error, setError] = useState<string | null>(null);
  const subscriptionRef = useRef<Subscription | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const toolCallMapRef = useRef<Map<string, string>>(new Map());
  const turnsWithDeltaRef = useRef<Set<string>>(new Set());
  const pendingDeltaUntilRef = useRef<Map<string, number>>(new Map());
  const pendingTimerIdsRef = useRef<Set<ReturnType<typeof setTimeout>>>(
    new Set()
  );
  const pendingSyntheticFinalTurnRef = useRef<string | null>(null);
  const turnIdRef = useRef("");

  const runtimeEvents = useAgenticRuntimeStore((s) => s.events);
  const activeTurnId = useAgenticRuntimeStore((s) => s.activeTurnId);
  const sessionId = useAgenticRuntimeStore((s) => s.sessionId);

  const messages = useMemo(
    () => projectRuntimeEventsToMessages(runtimeEvents),
    [runtimeEvents]
  );
  const isProcessing = !!activeTurnId;

  const canvasBuilderStore = useCanvasBuilderStore();
  const addNode = useCanvasStore((s) => s.addNode);
  const setNodes = useCanvasStore((s) => s.setNodes);
  const removeNode = useCanvasStore((s) => s.removeNode);
  const addEdge = useCanvasStore((s) => s.addEdge);
  const removeEdge = useCanvasStore((s) => s.removeEdge);
  const updateNode = useCanvasStore((s) => s.updateNode);

  const clearPendingTimers = useCallback(() => {
    for (const timerId of pendingTimerIdsRef.current) {
      clearTimeout(timerId);
    }
    pendingTimerIdsRef.current.clear();
    pendingSyntheticFinalTurnRef.current = null;
  }, []);

  const scheduleTimer = useCallback((callback: () => void, delayMs: number) => {
    const timerId = setTimeout(() => {
      pendingTimerIdsRef.current.delete(timerId);
      callback();
    }, delayMs);
    pendingTimerIdsRef.current.add(timerId);
    return timerId;
  }, []);

  const resetLocalStreamingState = useCallback(() => {
    clearPendingTimers();
    toolCallMapRef.current.clear();
    turnsWithDeltaRef.current.clear();
    pendingDeltaUntilRef.current.clear();
  }, [clearPendingTimers]);

  const applyCanvasOperation = useCallback(
    (operation: CanvasOperation) => {
      canvasBuilderStore.applyOperation(operation);

      switch (operation.type) {
        case "add_node":
          addNode({
            id: operation.id,
            type: operation.nodeType,
            position: operation.position ?? { x: 0, y: 0 },
            data: {
              label: operation.label ?? operation.nodeType,
              config: operation.config ?? {},
            },
          });
          break;
        case "remove_node":
          removeNode(operation.nodeId);
          break;
        case "connect":
          addEdge({
            id: operation.id,
            source: operation.source,
            target: operation.target,
            sourceHandle: operation.sourceHandle,
            targetHandle: operation.targetHandle,
          });
          break;
        case "disconnect":
          removeEdge(operation.edgeId);
          break;
        case "update_config":
          updateNode(operation.nodeId, { config: operation.config });
          break;
        case "layout":
          setNodes(
            computeAutoLayout(
              useCanvasStore.getState().nodes as AgentCanvasNode[],
              useCanvasStore.getState().edges as AgentCanvasEdge[],
              operation.direction ?? "TB"
            )
          );
          break;
        default:
          break;
      }
    },
    [
      canvasBuilderStore,
      addNode,
      setNodes,
      removeNode,
      addEdge,
      removeEdge,
      updateNode,
    ]
  );

  const handleRuntimeEventSideEffects = useCallback(
    (event: RuntimeEvent) => {
      const { payload } = event;

      switch (payload.type) {
        case "tool.call_start": {
          toolCallMapRef.current.set(payload.toolCallId, payload.toolName);
          break;
        }

        case "tool.call_result": {
          toolCallMapRef.current.delete(payload.toolCallId);
          break;
        }

        case "canvas.op_applied":
          applyCanvasOperation(payload.operation);
          break;

        case "chat.assistant_final":
          {
            const canvasState = useCanvasStore.getState();
            if (
              canvasState.nodes.length > 1 &&
              hasPositionCollisions(canvasState.nodes as AgentCanvasNode[])
            ) {
              canvasState.setNodes(
                computeAutoLayout(
                  canvasState.nodes as AgentCanvasNode[],
                  canvasState.edges as AgentCanvasEdge[],
                  "TB"
                )
              );
            }
          }
          toolCallMapRef.current.clear();
          pendingDeltaUntilRef.current.clear();
          if (event.turnId) {
            turnsWithDeltaRef.current.delete(event.turnId);
          }
          pendingSyntheticFinalTurnRef.current = null;
          canvasBuilderStore.setStatus("idle");
          useAgenticRuntimeStore.getState().clearActiveTurn();
          turnIdRef.current = "";
          break;

        default:
          break;
      }
    },
    [applyCanvasOperation, canvasBuilderStore]
  );

  const sendMessage = useCallback(
    (
      content: string,
      options?: {
        model?: string;
        attachments?: Array<{
          type: "image" | "document";
          url: string;
          name: string;
        }>;
      }
    ) => {
      if (!content.trim() || isProcessing || !sessionId) {
        return;
      }

      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      resetLocalStreamingState();
      setError(null);

      const turnId = crypto.randomUUID();
      turnIdRef.current = turnId;

      const runtimeStore = useAgenticRuntimeStore.getState();
      runtimeStore.setStreamingTurnId(turnId);

      canvasBuilderStore.setStatus("building");

      const client = getVanillaTRPCClient();
      const subscription = client.agentCanvas.buildCanvas.subscribe(
        {
          prompt: content,
          canvasId,
          sessionId,
          model: options?.model,
          turnId,
          attachments: options?.attachments,
        },
        {
          onData: (event: RuntimeEvent) => {
            if (abortControllerRef.current?.signal.aborted) {
              return;
            }

            const runtimeState = useAgenticRuntimeStore.getState();
            if (
              !runtimeState.sessionId ||
              event.sessionId !== runtimeState.sessionId
            ) {
              return;
            }
            if (
              runtimeState.streamingTurnId &&
              event.turnId &&
              event.turnId !== runtimeState.streamingTurnId
            ) {
              return;
            }

            if (event.payload.type === "chat.assistant_delta" && event.turnId) {
              turnsWithDeltaRef.current.add(event.turnId);

              const deltaChunks = splitAssistantText(event.payload.chunk);
              if (deltaChunks.length === 0) {
                return;
              }

              const now = Date.now();
              const scheduledStartAt = Math.max(
                now,
                pendingDeltaUntilRef.current.get(event.turnId) ?? 0
              );
              const initialDelayMs = Math.max(0, scheduledStartAt - now);

              deltaChunks.forEach((chunk, index) => {
                scheduleTimer(
                  () => {
                    const state = useAgenticRuntimeStore.getState();
                    if (
                      !state.sessionId ||
                      state.sessionId !== event.sessionId
                    ) {
                      return;
                    }
                    if (
                      state.streamingTurnId &&
                      event.turnId &&
                      state.streamingTurnId !== event.turnId
                    ) {
                      return;
                    }

                    state.applyEvent(
                      {
                        ...event,
                        eventId: `${event.eventId}:split:${scheduledStartAt}:${index}`,
                        visibility: "ephemeral",
                        payload: {
                          type: "chat.assistant_delta",
                          chunk,
                        },
                      },
                      { local: true }
                    );
                  },
                  initialDelayMs + index * SYNTHETIC_DELTA_INTERVAL_MS
                );
              });

              pendingDeltaUntilRef.current.set(
                event.turnId,
                scheduledStartAt +
                  deltaChunks.length * SYNTHETIC_DELTA_INTERVAL_MS
              );
              return;
            }

            if (event.payload.type === "chat.assistant_final" && event.turnId) {
              const finalTurnId = event.turnId;
              const pendingUntil =
                pendingDeltaUntilRef.current.get(finalTurnId) ?? 0;
              const pendingDelayMs = Math.max(0, pendingUntil - Date.now());

              if (!turnsWithDeltaRef.current.has(finalTurnId)) {
                const chunks = splitAssistantText(event.payload.content);
                if (chunks.length > 0) {
                  pendingSyntheticFinalTurnRef.current = finalTurnId;

                  const baseEvent = event;
                  const computedStreamMs =
                    chunks.length * SYNTHETIC_DELTA_INTERVAL_MS;
                  const targetStreamMs = Math.min(
                    SYNTHETIC_STREAM_MAX_MS,
                    Math.max(SYNTHETIC_STREAM_MIN_MS, computedStreamMs)
                  );
                  const intervalMs = Math.max(
                    SYNTHETIC_DELTA_INTERVAL_MS,
                    Math.floor(targetStreamMs / chunks.length)
                  );
                  const now = Date.now();
                  const scheduledStartAt = Math.max(
                    now,
                    pendingDeltaUntilRef.current.get(finalTurnId) ?? 0
                  );
                  const initialDelayMs = Math.max(0, scheduledStartAt - now);
                  const finalDelayMs =
                    initialDelayMs + chunks.length * intervalMs;
                  pendingDeltaUntilRef.current.set(
                    finalTurnId,
                    scheduledStartAt + chunks.length * intervalMs
                  );

                  chunks.forEach((chunk, index) => {
                    scheduleTimer(
                      () => {
                        const state = useAgenticRuntimeStore.getState();
                        if (
                          !state.sessionId ||
                          state.sessionId !== baseEvent.sessionId
                        ) {
                          return;
                        }
                        if (
                          state.streamingTurnId &&
                          baseEvent.turnId &&
                          state.streamingTurnId !== baseEvent.turnId
                        ) {
                          return;
                        }

                        if (baseEvent.turnId) {
                          turnsWithDeltaRef.current.add(baseEvent.turnId);
                        }

                        state.applyEvent(
                          {
                            ...baseEvent,
                            eventId: `${baseEvent.eventId}:delta:${scheduledStartAt}:${index}`,
                            visibility: "ephemeral",
                            payload: {
                              type: "chat.assistant_delta",
                              chunk,
                            },
                          },
                          { local: true }
                        );
                      },
                      initialDelayMs + index * intervalMs
                    );
                  });

                  scheduleTimer(() => {
                    const state = useAgenticRuntimeStore.getState();
                    if (
                      !state.sessionId ||
                      state.sessionId !== baseEvent.sessionId
                    ) {
                      return;
                    }
                    if (
                      state.streamingTurnId &&
                      baseEvent.turnId &&
                      state.streamingTurnId !== baseEvent.turnId
                    ) {
                      return;
                    }

                    pendingDeltaUntilRef.current.delete(finalTurnId);
                    state.applyEvent(baseEvent, { local: true });
                    handleRuntimeEventSideEffects(baseEvent);
                  }, finalDelayMs + 16);

                  return;
                }
              }

              if (pendingDelayMs > 0) {
                pendingSyntheticFinalTurnRef.current = finalTurnId;
                const baseEvent = event;
                scheduleTimer(() => {
                  const state = useAgenticRuntimeStore.getState();
                  if (
                    !state.sessionId ||
                    state.sessionId !== baseEvent.sessionId
                  ) {
                    return;
                  }
                  if (
                    state.streamingTurnId &&
                    baseEvent.turnId &&
                    state.streamingTurnId !== baseEvent.turnId
                  ) {
                    return;
                  }

                  pendingDeltaUntilRef.current.delete(finalTurnId);
                  state.applyEvent(baseEvent, { local: true });
                  handleRuntimeEventSideEffects(baseEvent);
                }, pendingDelayMs + 16);
                return;
              }
            }

            runtimeState.applyEvent(event, { local: true });
            handleRuntimeEventSideEffects(event);
          },
          onError: (err: unknown) => {
            if (abortControllerRef.current?.signal.aborted) {
              return;
            }
            const errorMessage =
              err instanceof Error ? err.message : "An error occurred";
            setError(errorMessage);
            canvasBuilderStore.setStatus("error");
            useExecutionStore.getState().clearExecution();
            useAgenticRuntimeStore.getState().clearActiveTurn();
            resetLocalStreamingState();
            turnIdRef.current = "";
          },
          onComplete: () => {
            if (pendingSyntheticFinalTurnRef.current === turnId) {
              subscriptionRef.current = null;
              return;
            }
            const runtimeState = useAgenticRuntimeStore.getState();
            if (runtimeState.streamingTurnId === turnId) {
              canvasBuilderStore.setStatus("idle");
              runtimeState.clearActiveTurn();
              resetLocalStreamingState();
              turnIdRef.current = "";
            }
            subscriptionRef.current = null;
          },
        }
      );

      subscriptionRef.current = subscription;
    },
    [
      isProcessing,
      canvasId,
      sessionId,
      canvasBuilderStore,
      handleRuntimeEventSideEffects,
      resetLocalStreamingState,
      scheduleTimer,
    ]
  );

  const cancel = useCallback(() => {
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    useExecutionStore.getState().clearExecution();
    useAgenticRuntimeStore.getState().clearActiveTurn();
    resetLocalStreamingState();
    turnIdRef.current = "";
    canvasBuilderStore.setStatus("idle");
  }, [canvasBuilderStore, resetLocalStreamingState]);

  const clearMessages = useCallback(() => {
    cancel();
    useAgenticRuntimeStore.getState().resetSessionState();
    turnIdRef.current = "";
  }, [cancel]);

  const prevSessionIdRef = useRef(sessionId);
  useEffect(() => {
    if (prevSessionIdRef.current === sessionId) {
      return;
    }
    prevSessionIdRef.current = sessionId;

    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    useExecutionStore.getState().clearExecution();
    canvasBuilderStore.setStatus("idle");
    setError(null);
    turnIdRef.current = "";
    resetLocalStreamingState();
  }, [sessionId, canvasBuilderStore, resetLocalStreamingState]);

  useEffect(
    () => () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      clearPendingTimers();
    },
    [clearPendingTimers]
  );

  return {
    messages,
    isProcessing,
    error,
    sessionId,
    sendMessage,
    cancel,
    clearMessages,
  };
}
