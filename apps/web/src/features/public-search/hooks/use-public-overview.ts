"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  OverviewCitation,
  OverviewState,
  OverviewStep,
  OverviewStreamChunk,
} from "@/features/overview";
import { getToolDisplayName } from "@/features/overview";
import { EMPTY_THINKING_STATE } from "@/lib/thinking-types";
import { PUBLIC_API_BASE } from "../lib/constants";

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

function createStepManager() {
  const activeSteps = new Map<string, OverviewStep>();
  const startTimes = new Map<string, number>();

  return {
    addOrUpdate({
      toolCallId,
      toolName,
      status,
      sourceCount,
      ephemeral,
    }: StepUpdate) {
      const existing = activeSteps.get(toolCallId);
      if (existing) {
        existing.status = status;
        if (sourceCount !== undefined) {
          existing.sourceCount = sourceCount;
        }
        if (status === "completed") {
          const start = startTimes.get(toolCallId);
          if (start !== undefined) {
            existing.durationMs = performance.now() - start;
          }
        }
      } else {
        startTimes.set(toolCallId, performance.now());
        activeSteps.set(toolCallId, {
          id: toolCallId,
          toolName,
          displayName: getToolDisplayName(toolName),
          status,
          sourceCount,
          toolCallId,
          ephemeral,
        });
      }
      return Array.from(activeSteps.values());
    },
  };
}

function extractSourceCount(output: unknown): number | undefined {
  if (!output || typeof output !== "object") {
    return;
  }
  const o = output as { documentCount?: number; sources?: unknown[] };
  if (typeof o.documentCount === "number") {
    return o.documentCount;
  }
  if (Array.isArray(o.sources)) {
    return o.sources.length;
  }
  return;
}

export function usePublicOverview() {
  const [state, setState] = useState<OverviewState>(INITIAL_STATE);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setState(INITIAL_STATE);
  }, []);

  const generateOverview = useCallback((query: string) => {
    if (!query.trim() || query.trim().length < 3) {
      return;
    }

    if (abortRef.current) {
      abortRef.current.abort();
    }

    const controller = new AbortController();
    abortRef.current = controller;

    setState({ ...INITIAL_STATE, isLoading: true, isStreaming: true });

    const stepManager = createStepManager();
    const contentRef = { value: "" };
    const citationsRef = { value: [] as OverviewCitation[] };
    const thinkingRef = { value: "" };

    const url = `${PUBLIC_API_BASE}/overview?q=${encodeURIComponent(query)}`;

    fetch(url, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          if (response.status === 429) {
            setState((prev) => ({
              ...prev,
              error:
                "Rate limited. Please wait before generating another overview.",
              isLoading: false,
              isStreaming: false,
            }));
            return;
          }
          setState((prev) => ({
            ...prev,
            error: `Overview failed: ${response.status}`,
            isLoading: false,
            isStreaming: false,
          }));
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) {
          return;
        }

        const decoder = new TextDecoder();
        let buffer = "";

        try {
          while (true) {
            if (controller.signal.aborted) {
              break;
            }
            const { done, value } = await reader.read();
            if (done) {
              break;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              if (!line.startsWith("data:")) {
                continue;
              }
              const jsonStr = line.slice(5).trim();
              if (!jsonStr) {
                continue;
              }

              let chunk: OverviewStreamChunk;
              try {
                chunk = JSON.parse(jsonStr) as OverviewStreamChunk;
              } catch {
                continue;
              }

              processChunk(chunk, {
                setState,
                stepManager,
                refs: {
                  content: contentRef,
                  citations: citationsRef,
                  thinking: thinkingRef,
                },
              });
            }
          }
        } finally {
          reader.cancel();
        }

        setState((prev) => ({ ...prev, isLoading: false, isStreaming: false }));
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : "Overview failed",
          isLoading: false,
          isStreaming: false,
        }));
      });
  }, []);

  useEffect(
    () => () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    },
    []
  );

  return {
    ...state,
    generateOverview,
    reset,
  };
}

type ChunkContext = {
  setState: React.Dispatch<React.SetStateAction<OverviewState>>;
  stepManager: ReturnType<typeof createStepManager>;
  refs: {
    content: { value: string };
    citations: { value: OverviewCitation[] };
    thinking: { value: string };
  };
};

function processChunk(chunk: OverviewStreamChunk, ctx: ChunkContext) {
  const { setState, stepManager, refs } = ctx;
  const {
    content: contentRef,
    citations: citationsRef,
    thinking: thinkingRef,
  } = refs;
  switch (chunk.type) {
    case "thinking": {
      thinkingRef.value += chunk.thinkingMessage ?? "";
      setState((prev) => ({
        ...prev,
        isLoading: true,
        isStreaming: true,
        thinkingMessage: chunk.thinkingMessage ?? null,
        thinking: {
          ...prev.thinking,
          content: thinkingRef.value,
          isActive: true,
          startTime: prev.thinking.isActive
            ? prev.thinking.startTime
            : performance.now(),
        },
      }));
      break;
    }
    case "status": {
      setState((prev) => ({
        ...prev,
        statusMessage: chunk.statusMessage ?? null,
      }));
      break;
    }
    case "tool_call": {
      if (!chunk.toolCall) {
        break;
      }
      const steps = stepManager.addOrUpdate({
        toolCallId: chunk.toolCall.toolCallId,
        toolName: chunk.toolCall.toolName,
        status: "active",
        ephemeral: chunk.toolCall.ephemeral,
      });
      setState((prev) => ({ ...prev, steps }));
      break;
    }
    case "tool_result": {
      if (!chunk.toolResult) {
        break;
      }
      const steps = stepManager.addOrUpdate({
        toolCallId: chunk.toolResult.toolCallId,
        toolName: chunk.toolResult.toolName,
        status: "completed",
        sourceCount: extractSourceCount(chunk.toolResult.toolOutput),
      });
      setState((prev) => ({ ...prev, steps }));
      break;
    }
    case "citation": {
      if (!chunk.citation) {
        break;
      }
      citationsRef.value = [...citationsRef.value, chunk.citation];
      setState((prev) => ({ ...prev, citations: citationsRef.value }));
      break;
    }
    case "text": {
      if (!chunk.content) {
        break;
      }
      contentRef.value += chunk.content;
      setState((prev) => ({
        ...prev,
        content: contentRef.value,
        isLoading: false,
      }));
      break;
    }
    case "done": {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        isStreaming: false,
        groundingScore: chunk.groundingScore ?? null,
        thinking: {
          ...prev.thinking,
          isActive: false,
          endTime: performance.now(),
          durationMs: prev.thinking.startTime
            ? performance.now() - prev.thinking.startTime
            : null,
        },
      }));
      break;
    }
    case "error": {
      setState((prev) => ({
        ...prev,
        error: chunk.error ?? "An error occurred",
        isLoading: false,
        isStreaming: false,
      }));
      break;
    }
    default:
      break;
  }
}
