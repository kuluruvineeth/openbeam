"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EMPTY_THINKING_STATE } from "@/lib/thinking-types";
import { getVanillaTRPCClient } from "@/trpc/client";
import type {
  OverviewCitation,
  OverviewState,
  OverviewStep,
  OverviewStreamChunk,
} from "../lib/overview-types";
import { getToolDisplayName } from "../lib/overview-types";

const INITIAL_STATE: OverviewState = {
  content: "",
  citations: [],
  isLoading: false,
  isStreaming: false,
  error: null,
  groundingScore: null,
  steps: [],
  thinkingMessage: null,
  statusMessage: null,
  thinking: EMPTY_THINKING_STATE,
};

type StepUpdate = {
  toolCallId: string;
  toolName: string;
  status: OverviewStep["status"];
  sourceCount?: number;
  ephemeral?: boolean;
};

type StepManager = {
  addOrUpdate: (update: StepUpdate) => OverviewStep[];
};

function createStepManager(): StepManager {
  const activeSteps = new Map<string, OverviewStep>();
  const startTimes = new Map<string, number>();

  return {
    addOrUpdate({ toolCallId, toolName, status, sourceCount, ephemeral }) {
      const existingStep = activeSteps.get(toolCallId);
      if (existingStep) {
        existingStep.status = status;
        if (sourceCount !== undefined) {
          existingStep.sourceCount = sourceCount;
        }
        if (status === "completed") {
          const startTime = startTimes.get(toolCallId);
          if (startTime !== undefined) {
            existingStep.durationMs = performance.now() - startTime;
          }
        }
      } else {
        startTimes.set(toolCallId, performance.now());
        const newStep: OverviewStep = {
          id: toolCallId,
          toolName,
          displayName: getToolDisplayName(toolName),
          status,
          sourceCount,
          toolCallId,
          ephemeral,
        };
        activeSteps.set(toolCallId, newStep);
      }
      return Array.from(activeSteps.values());
    },
  };
}

type ChunkHandler = {
  handleChunk: (chunk: OverviewStreamChunk) => void;
};

type ChunkHandlerConfig = {
  setState: React.Dispatch<React.SetStateAction<OverviewState>>;
  stepManager: StepManager;
  refs: {
    content: { value: string };
    citations: { value: OverviewCitation[] };
    thinking: { value: string };
  };
};

function createChunkHandler(config: ChunkHandlerConfig): ChunkHandler {
  const { setState, stepManager, refs } = config;
  function handleThinking(chunk: OverviewStreamChunk) {
    const newContent = chunk.thinkingMessage ?? "";
    refs.thinking.value += newContent;

    setState((prev) => {
      const isFirstThinking = !prev.thinking.isActive;
      return {
        ...prev,
        isLoading: true,
        isStreaming: true,
        thinkingMessage: chunk.thinkingMessage ?? null,
        thinking: {
          ...prev.thinking,
          content: refs.thinking.value,
          isActive: true,
          startTime: isFirstThinking
            ? performance.now()
            : prev.thinking.startTime,
        },
      };
    });
  }

  function handleStatus(chunk: OverviewStreamChunk) {
    setState((prev) => ({
      ...prev,
      statusMessage: chunk.statusMessage ?? null,
    }));
  }

  function handleToolCall(chunk: OverviewStreamChunk) {
    if (!chunk.toolCall) {
      return;
    }
    const { toolCallId, toolName, ephemeral } = chunk.toolCall;
    const newSteps = stepManager.addOrUpdate({
      toolCallId,
      toolName,
      status: "active",
      ephemeral,
    });
    setState((prev) => ({ ...prev, steps: newSteps }));
  }

  function handleToolResult(chunk: OverviewStreamChunk) {
    if (!chunk.toolResult) {
      return;
    }
    const { toolCallId, toolName, toolOutput } = chunk.toolResult;
    const sourceCount = extractSourceCount(toolOutput);
    const newSteps = stepManager.addOrUpdate({
      toolCallId,
      toolName,
      status: "completed",
      sourceCount,
    });
    setState((prev) => ({ ...prev, steps: newSteps }));
  }

  function extractSourceCount(toolOutput: unknown): number | undefined {
    if (!toolOutput || typeof toolOutput !== "object") {
      return;
    }
    const output = toolOutput as {
      documentCount?: number;
      sources?: unknown[];
    };
    if (typeof output.documentCount === "number") {
      return output.documentCount;
    }
    if (Array.isArray(output.sources)) {
      return output.sources.length;
    }
    return;
  }

  function handleCitation(chunk: OverviewStreamChunk) {
    if (!chunk.citation) {
      return;
    }
    refs.citations.value = [...refs.citations.value, chunk.citation];
    setState((prev) => ({ ...prev, citations: refs.citations.value }));
  }

  function handleText(chunk: OverviewStreamChunk) {
    if (!chunk.content) {
      return;
    }
    refs.content.value += chunk.content;
    setState((prev) => ({
      ...prev,
      content: refs.content.value,
      isLoading: false,
    }));
  }

  function handleDone(chunk: OverviewStreamChunk) {
    setState((prev) => {
      const endTime = performance.now();
      const durationMs = prev.thinking.startTime
        ? endTime - prev.thinking.startTime
        : null;

      return {
        ...prev,
        isLoading: false,
        isStreaming: false,
        groundingScore: chunk.groundingScore ?? null,
        thinking: {
          ...prev.thinking,
          isActive: false,
          endTime,
          durationMs,
        },
      };
    });
  }

  function handleError(chunk: OverviewStreamChunk) {
    setState((prev) => ({
      ...prev,
      error: chunk.error ?? "An error occurred",
      isLoading: false,
      isStreaming: false,
    }));
  }

  return {
    handleChunk(chunk: OverviewStreamChunk) {
      switch (chunk.type) {
        case "thinking":
          handleThinking(chunk);
          break;
        case "status":
          handleStatus(chunk);
          break;
        case "tool_call":
          handleToolCall(chunk);
          break;
        case "tool_result":
          handleToolResult(chunk);
          break;
        case "citation":
          handleCitation(chunk);
          break;
        case "text":
          handleText(chunk);
          break;
        case "done":
          handleDone(chunk);
          break;
        case "error":
          handleError(chunk);
          break;
        default:
          break;
      }
    },
  };
}

type Subscription = { unsubscribe: () => void };

export function useOverview(options?: {
  maxSources?: number;
  enableFanout?: boolean;
  modelId?: string;
  temperature?: number;
}) {
  const [state, setState] = useState<OverviewState>(INITIAL_STATE);
  const [currentQuery, setCurrentQuery] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const subscriptionRef = useRef<Subscription | null>(null);

  const reset = useCallback(() => {
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState(INITIAL_STATE);
    setCurrentQuery(null);
  }, []);

  const generateOverview = useCallback(
    (query: string) => {
      if (!query.trim()) {
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

      setState({
        ...INITIAL_STATE,
        isLoading: true,
        isStreaming: true,
      });
      setCurrentQuery(query);

      const stepManager = createStepManager();
      const chunkHandler = createChunkHandler({
        setState,
        stepManager,
        refs: {
          content: { value: "" },
          citations: { value: [] },
          thinking: { value: "" },
        },
      });

      try {
        const client = getVanillaTRPCClient();
        const subscription = client.overview.stream.subscribe(
          {
            query,
            maxSources: options?.maxSources,
            enableFanout: options?.enableFanout,
            modelId: options?.modelId,
            temperature: options?.temperature,
          },
          {
            onData: (chunk: OverviewStreamChunk) => {
              if (abortControllerRef.current?.signal.aborted) {
                return;
              }
              chunkHandler.handleChunk(chunk);
            },
            onError: (error: unknown) => {
              if (abortControllerRef.current?.signal.aborted) {
                return;
              }
              setState((prev) => ({
                ...prev,
                error:
                  error instanceof Error
                    ? error.message
                    : "Failed to generate overview",
                isLoading: false,
                isStreaming: false,
              }));
            },
            onComplete: () => {
              subscriptionRef.current = null;
              setState((prev) => ({
                ...prev,
                isLoading: false,
                isStreaming: false,
              }));
            },
          }
        );

        subscriptionRef.current = subscription;
      } catch (error) {
        if (abortControllerRef.current?.signal.aborted) {
          return;
        }
        setState((prev) => ({
          ...prev,
          error:
            error instanceof Error
              ? error.message
              : "Failed to generate overview",
          isLoading: false,
          isStreaming: false,
        }));
      }
    },
    [options]
  );

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
    currentQuery,
    generateOverview,
    reset,
  };
}
