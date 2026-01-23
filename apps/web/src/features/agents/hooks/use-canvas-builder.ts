"use client";

import type { CanvasOperation } from "@openplane/types/canvas";
import {
  type MessageData,
  useCanvasBuilderStore,
  useCanvasStore,
} from "@openplane/ui";
import { useCallback, useEffect, useRef, useState } from "react";
import { getVanillaTRPCClient } from "@/trpc/client";

type CanvasStreamEvent =
  | { type: "thinking"; content: string }
  | { type: "tool_call"; tool: string; input: unknown; id: string }
  | { type: "tool_result"; id: string; result: unknown }
  | { type: "canvas_op"; operation: CanvasOperation }
  | { type: "text"; chunk: string }
  | { type: "error"; message: string }
  | { type: "complete"; summary: string; result: unknown };

type AgentEvent =
  | { type: "thinking"; timestamp: number; message: string }
  | { type: "status"; timestamp: number; status: string; message: string }
  | {
      type: "tool_call";
      timestamp: number;
      toolCallId: string;
      toolName: string;
      displayName: string;
      toolInput?: unknown;
      visibility: "visible" | "ephemeral" | "hidden";
    }
  | {
      type: "tool_result";
      timestamp: number;
      toolCallId: string;
      toolName: string;
      toolOutput?: unknown;
      durationMs?: number;
      success: boolean;
    }
  | { type: "text"; timestamp: number; content: string; isPartial: boolean }
  | {
      type: "error";
      timestamp: number;
      code: string;
      message: string;
      retryable: boolean;
    }
  | { type: "done"; timestamp: number; success: boolean };

export type CanvasBuilderState = {
  messages: MessageData[];
  isProcessing: boolean;
  error: string | null;
};

const INITIAL_STATE: CanvasBuilderState = {
  messages: [],
  isProcessing: false,
  error: null,
};

type Subscription = { unsubscribe: () => void };

function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function getToolDisplayName(toolName: string): string {
  const displayNames: Record<string, string> = {
    canvas_add_node: "Add Node",
    canvas_remove_node: "Remove Node",
    canvas_update_node: "Update Node",
    canvas_add_edge: "Add Edge",
    canvas_remove_edge: "Remove Edge",
  };
  return displayNames[toolName] ?? toolName;
}

export function useCanvasBuilder(canvasId?: string) {
  const [state, setState] = useState<CanvasBuilderState>(INITIAL_STATE);
  const abortControllerRef = useRef<AbortController | null>(null);
  const subscriptionRef = useRef<Subscription | null>(null);
  const currentAssistantMessageRef = useRef<string | null>(null);
  const textAccumulatorRef = useRef<string>("");

  const canvasBuilderStore = useCanvasBuilderStore();
  const canvasStore = useCanvasStore();
  const toolCallMapRef = useRef<Map<string, string>>(new Map());

  const applyCanvasOperation = useCallback(
    (operation: CanvasOperation) => {
      canvasBuilderStore.applyOperation(operation);

      switch (operation.type) {
        case "add_node":
          canvasStore.addNode({
            id: operation.id,
            type: operation.nodeType,
            position: operation.position ?? { x: 0, y: 0 },
            data: {
              label: operation.label ?? operation.nodeType,
              ...operation.config,
            },
          });
          break;
        case "remove_node":
          canvasStore.removeNode(operation.nodeId);
          break;
        case "connect":
          canvasStore.addEdge({
            id: operation.id,
            source: operation.source,
            target: operation.target,
            sourceHandle: operation.sourceHandle,
            targetHandle: operation.targetHandle,
          });
          break;
        case "disconnect":
          canvasStore.removeEdge(operation.edgeId);
          break;
        case "update_config":
          canvasStore.updateNode(operation.nodeId, operation.config);
          break;
        case "layout":
          break;
        default:
          break;
      }
    },
    [canvasBuilderStore, canvasStore]
  );

  const addEventToMessage = useCallback((newEvent: AgentEvent) => {
    setState((prev) => {
      const messageId = currentAssistantMessageRef.current;
      if (!messageId) {
        return prev;
      }

      return {
        ...prev,
        messages: prev.messages.map((msg) => {
          if (msg.id !== messageId) {
            return msg;
          }
          return {
            ...msg,
            events: [...msg.events, newEvent],
          };
        }),
      };
    });
  }, []);

  const handleStreamEvent = useCallback(
    (event: CanvasStreamEvent) => {
      const timestamp = Date.now();

      switch (event.type) {
        case "thinking":
          addEventToMessage({
            type: "thinking",
            timestamp,
            message: event.content,
          });
          break;

        case "tool_call":
          toolCallMapRef.current.set(event.id, event.tool);
          addEventToMessage({
            type: "tool_call",
            timestamp,
            toolCallId: event.id,
            toolName: event.tool,
            displayName: getToolDisplayName(event.tool),
            toolInput: event.input,
            visibility: "visible",
          });
          break;

        case "tool_result": {
          const toolName = toolCallMapRef.current.get(event.id) ?? "";
          addEventToMessage({
            type: "tool_result",
            timestamp,
            toolCallId: event.id,
            toolName,
            toolOutput: event.result,
            success: true,
          });
          break;
        }

        case "canvas_op":
          applyCanvasOperation(event.operation);
          break;

        case "text":
          textAccumulatorRef.current += event.chunk;
          addEventToMessage({
            type: "text",
            timestamp,
            content: textAccumulatorRef.current,
            isPartial: true,
          });
          break;

        case "error":
          addEventToMessage({
            type: "error",
            timestamp,
            code: "AGENT_ERROR",
            message: event.message,
            retryable: false,
          });
          setState((prev) => ({
            ...prev,
            error: event.message,
            isProcessing: false,
          }));
          canvasBuilderStore.setStatus("error");
          break;

        case "complete":
          if (textAccumulatorRef.current) {
            setState((prev) => {
              const messageId = currentAssistantMessageRef.current;
              if (!messageId) {
                return prev;
              }

              return {
                ...prev,
                messages: prev.messages.map((msg) => {
                  if (msg.id !== messageId) {
                    return msg;
                  }
                  const otherEvents = msg.events.filter(
                    (e) => e.type !== "text"
                  );
                  return {
                    ...msg,
                    events: [
                      ...otherEvents,
                      {
                        type: "text" as const,
                        timestamp: Date.now(),
                        content: textAccumulatorRef.current,
                        isPartial: false,
                      },
                    ],
                    status: "complete" as const,
                  };
                }),
              };
            });
          } else {
            setState((prev) => {
              const messageId = currentAssistantMessageRef.current;
              if (!messageId) {
                return prev;
              }

              return {
                ...prev,
                messages: prev.messages.map((msg) =>
                  msg.id === messageId
                    ? { ...msg, status: "complete" as const }
                    : msg
                ),
              };
            });
          }
          textAccumulatorRef.current = "";
          currentAssistantMessageRef.current = null;
          setState((prev) => ({
            ...prev,
            isProcessing: false,
          }));
          canvasBuilderStore.setStatus("idle");
          break;

        default:
          break;
      }
    },
    [addEventToMessage, applyCanvasOperation, canvasBuilderStore]
  );

  const sendMessage = useCallback(
    (content: string) => {
      if (!content.trim() || state.isProcessing) {
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
      textAccumulatorRef.current = "";
      toolCallMapRef.current.clear();

      const userMessageId = generateMessageId();
      const assistantMessageId = generateMessageId();
      currentAssistantMessageRef.current = assistantMessageId;

      const now = Date.now();

      const userMessage: MessageData = {
        id: userMessageId,
        role: "user",
        events: [
          {
            type: "text",
            timestamp: now,
            content,
            isPartial: false,
          },
        ],
        createdAt: now,
      };

      const assistantMessage: MessageData = {
        id: assistantMessageId,
        role: "assistant",
        events: [],
        status: "streaming",
        createdAt: now,
      };

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, userMessage, assistantMessage],
        isProcessing: true,
        error: null,
      }));

      canvasBuilderStore.setStatus("building");

      const client = getVanillaTRPCClient();
      const subscription = client.agentCanvas.buildCanvas.subscribe(
        {
          prompt: content,
          canvasId,
          sessionId: `session_${Date.now()}`,
        },
        {
          onData: (event: CanvasStreamEvent) => {
            if (abortControllerRef.current?.signal.aborted) {
              return;
            }
            handleStreamEvent(event);
          },
          onError: (error: unknown) => {
            if (abortControllerRef.current?.signal.aborted) {
              return;
            }
            const errorMessage =
              error instanceof Error ? error.message : "An error occurred";
            setState((prev) => ({
              ...prev,
              error: errorMessage,
              isProcessing: false,
              messages: prev.messages.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, status: "error" as const }
                  : msg
              ),
            }));
            canvasBuilderStore.setStatus("error");
            currentAssistantMessageRef.current = null;
          },
          onComplete: () => {
            subscriptionRef.current = null;
          },
        }
      );

      subscriptionRef.current = subscription;
    },
    [state.isProcessing, canvasId, canvasBuilderStore, handleStreamEvent]
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
    textAccumulatorRef.current = "";
    setState((prev) => ({
      ...prev,
      isProcessing: false,
      messages: prev.messages.map((msg) =>
        msg.status === "streaming"
          ? { ...msg, status: "complete" as const }
          : msg
      ),
    }));
    canvasBuilderStore.setStatus("idle");
    currentAssistantMessageRef.current = null;
  }, [canvasBuilderStore]);

  const clearMessages = useCallback(() => {
    cancel();
    setState(INITIAL_STATE);
  }, [cancel]);

  useEffect(
    () => () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    },
    []
  );

  return {
    ...state,
    sendMessage,
    cancel,
    clearMessages,
  };
}
