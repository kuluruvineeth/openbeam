"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  OverviewCitation,
  OverviewState,
  OverviewStep,
  OverviewStreamChunk,
} from "@/lib/overview-types";
import { getToolDisplayName } from "@/lib/overview-types";
import { getVanillaTRPCClient } from "@/trpc/client";

const INITIAL_STATE: OverviewState = {
  content: "",
  citations: [],
  isLoading: false,
  isStreaming: false,
  error: null,
  groundingScore: null,
  steps: [],
};

type StepManager = {
  addOrUpdate: (
    toolCallId: string,
    toolName: string,
    status: OverviewStep["status"],
    sourceCount?: number
  ) => OverviewStep[];
};

function createStepManager(): StepManager {
  const activeSteps = new Map<string, OverviewStep>();
  const startTimes = new Map<string, number>();

  return {
    addOrUpdate(toolCallId, toolName, status, sourceCount) {
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

function createChunkHandler(
  setState: React.Dispatch<React.SetStateAction<OverviewState>>,
  stepManager: StepManager,
  contentRef: { value: string },
  citationsRef: { value: OverviewCitation[] }
): ChunkHandler {
  function handleToolCall(chunk: OverviewStreamChunk) {
    if (!chunk.toolCall) {
      return;
    }
    const { toolCallId, toolName } = chunk.toolCall;
    const newSteps = stepManager.addOrUpdate(toolCallId, toolName, "active");
    setState((prev) => ({ ...prev, steps: newSteps }));
  }

  function handleToolResult(chunk: OverviewStreamChunk) {
    if (!chunk.toolResult) {
      return;
    }
    const { toolCallId, toolName, toolOutput } = chunk.toolResult;
    const sourceCount = extractSourceCount(toolOutput);
    const newSteps = stepManager.addOrUpdate(
      toolCallId,
      toolName,
      "completed",
      sourceCount
    );
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
    citationsRef.value = [...citationsRef.value, chunk.citation];
    setState((prev) => ({ ...prev, citations: citationsRef.value }));
  }

  function handleText(chunk: OverviewStreamChunk) {
    if (!chunk.content) {
      return;
    }
    contentRef.value += chunk.content;
    setState((prev) => ({
      ...prev,
      content: contentRef.value,
      isLoading: false,
    }));
  }

  function handleDone(chunk: OverviewStreamChunk) {
    setState((prev) => ({
      ...prev,
      isLoading: false,
      isStreaming: false,
      groundingScore: chunk.groundingScore ?? null,
    }));
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
          setState((prev) => ({ ...prev, isLoading: true, isStreaming: true }));
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
        steps: [],
      });
      setCurrentQuery(query);

      const contentRef = { value: "" };
      const citationsRef: { value: OverviewCitation[] } = { value: [] };
      const stepManager = createStepManager();
      const chunkHandler = createChunkHandler(
        setState,
        stepManager,
        contentRef,
        citationsRef
      );

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
