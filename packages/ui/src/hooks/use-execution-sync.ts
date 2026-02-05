"use client";

import type { StepExecution } from "@openplane/types/canvas";
import type { ExecutionEvent } from "@openplane/types/canvas/execution-events";
import { useCallback, useEffect, useRef } from "react";
import { useExecutionStore } from "../stores/execution-store";
import {
  type ConnectionStatus,
  useExecutionStream,
} from "./use-execution-stream";

interface UseExecutionSyncOptions {
  executionId: string;
  enabled?: boolean;
  baseUrl?: string;
  includeOutput?: boolean;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

interface UseExecutionSyncReturn {
  connectionStatus: ConnectionStatus;
  error: Error | null;
  connect: () => void;
  disconnect: () => void;
}

export function useExecutionSync({
  executionId,
  enabled = true,
  baseUrl,
  includeOutput = false,
  onComplete,
  onError,
}: UseExecutionSyncOptions): UseExecutionSyncReturn {
  const startExecution = useExecutionStore((s) => s.startExecution);
  const updateExecution = useExecutionStore((s) => s.updateExecution);
  const completeExecution = useExecutionStore((s) => s.completeExecution);
  const addStep = useExecutionStore((s) => s.addStep);
  const updateStep = useExecutionStore((s) => s.updateStep);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const handleEvent = useCallback(
    (event: ExecutionEvent) => {
      switch (event.type) {
        case "execution.started":
          startExecution({
            id: event.executionId,
            agentCanvasId: event.agentCanvasId,
            status: "RUNNING",
            startedAt: event.timestamp,
            steps: [],
            currentNodeId: undefined,
          });
          break;

        case "execution.progress":
          updateExecution({
            currentNodeId: event.currentNodeId,
          });
          break;

        case "execution.completed":
          completeExecution(event.status, event.output);
          onCompleteRef.current?.();
          break;

        case "execution.failed":
          completeExecution("FAILED", undefined, event.error);
          onCompleteRef.current?.();
          break;

        case "execution.cancelled":
          completeExecution("CANCELLED", undefined, event.reason);
          onCompleteRef.current?.();
          break;

        case "step.started": {
          const step: StepExecution = {
            nodeId: event.nodeId,
            nodeType: event.nodeType,
            status: "RUNNING",
            startedAt: event.timestamp,
          };
          addStep(step);
          break;
        }

        case "step.completed":
          updateStep(event.nodeId, {
            status: "COMPLETED",
            completedAt: event.timestamp,
            latencyMs: event.durationMs,
            output: event.output,
            tokenUsage: event.tokenUsage,
          });
          break;

        case "step.failed":
          updateStep(event.nodeId, {
            status: "FAILED",
            completedAt: event.timestamp,
            error: event.error,
          });
          break;

        case "step.skipped":
          updateStep(event.nodeId, {
            status: "CANCELLED",
            completedAt: event.timestamp,
          });
          break;

        case "step.retrying":
          updateStep(event.nodeId, {
            status: "RUNNING",
          });
          break;

        default:
          break;
      }
    },
    [startExecution, updateExecution, completeExecution, addStep, updateStep]
  );

  const { connectionStatus, error, connect, disconnect } = useExecutionStream({
    executionId,
    enabled,
    baseUrl,
    includeOutput,
    onEvent: handleEvent,
    onError,
  });

  useEffect(
    () => () => {
      disconnect();
    },
    [disconnect]
  );

  return {
    connectionStatus,
    error,
    connect,
    disconnect,
  };
}

export type { UseExecutionSyncOptions, UseExecutionSyncReturn };
