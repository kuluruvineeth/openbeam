"use client";

import type { TimelineData } from "@openbeam/types/canvas/timeline";
import { useCallback, useEffect } from "react";
import type { ConnectionStatus } from "./use-execution-stream";
import { useExecutionStream } from "./use-execution-stream";
import { useExecutionTimelineState } from "./use-execution-timeline-state";

interface UseLiveExecutionOptions {
  executionId: string;
  enabled?: boolean;
  baseUrl?: string;
  includeOutput?: boolean;
  onComplete?: (timeline: TimelineData) => void;
  onError?: (error: Error) => void;
}

interface UseLiveExecutionReturn {
  timeline: TimelineData;
  connectionStatus: ConnectionStatus;
  error: Error | null;
  isComplete: boolean;
  isRunning: boolean;
  connect: () => void;
  disconnect: () => void;
  reset: () => void;
}

export function useLiveExecution({
  executionId,
  enabled = true,
  baseUrl,
  includeOutput = false,
  onComplete,
  onError,
}: UseLiveExecutionOptions): UseLiveExecutionReturn {
  const { timelineData, processEvent, reset } = useExecutionTimelineState({
    executionId,
  });

  const handleComplete = useCallback(() => {
    if (
      timelineData.status === "COMPLETED" ||
      timelineData.status === "FAILED" ||
      timelineData.status === "CANCELLED"
    ) {
      onComplete?.(timelineData);
    }
  }, [timelineData, onComplete]);

  useEffect(() => {
    handleComplete();
  }, [handleComplete]);

  const { connectionStatus, error, connect, disconnect, clearEvents } =
    useExecutionStream({
      executionId,
      enabled,
      baseUrl,
      includeOutput,
      onEvent: processEvent,
      onError,
    });

  const handleReset = useCallback(() => {
    reset();
    clearEvents();
  }, [reset, clearEvents]);

  const isComplete =
    timelineData.status === "COMPLETED" ||
    timelineData.status === "FAILED" ||
    timelineData.status === "CANCELLED";

  const isRunning = timelineData.status === "RUNNING";

  return {
    timeline: timelineData,
    connectionStatus,
    error,
    isComplete,
    isRunning,
    connect,
    disconnect,
    reset: handleReset,
  };
}

export type { UseLiveExecutionOptions, UseLiveExecutionReturn };
